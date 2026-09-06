#!/usr/bin/env bash
# Autodispatch — PC-gamer worker plane.
# Launchd/cron en Mac: si el nodo está realmente alcanzable (SSH o health),
# encola backlog (content-video + opencode) según el calendario de Mauro.
#
# Zero secrets: Doppler (`doppler run …`). Nunca en el gamer.
#
# Salidas:
#   exit 0 = nada que hacer / done
#   exit 1 = error de infra
#   exit 2 = no disponible (offline o modo gaming) — semaforizado
#
# Usage:
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/ops/overnight-autodispatch.sh
#   ./scripts/ops/overnight-autodispatch.sh --dry-run
#   ./scripts/ops/overnight-autodispatch.sh --list
#   ./scripts/ops/overnight-autodispatch.sh --mode heavy --force-online
#   ./scripts/ops/overnight-autodispatch.sh --reset-state
#
set -euo pipefail

DRY_RUN=false
LIST=false
RESET=false
FORCE_MODE=""
FORCE_ONLINE=false
FORCE=false
TASK_FILTER=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --list) LIST=true ;;
    --reset-state) RESET=true ;;
    --force) FORCE=true ;;
    --force-online) FORCE_ONLINE=true ;;
    --mode=*) FORCE_MODE="${arg#*=}" ;;
    --task=*) TASK_FILTER="${arg#*=}" ;;
    -h|--help)
      sed -n '2,24p' "$0"
      exit 0
      ;;
  esac
done
args=("$@")
for i in "${!args[@]}"; do
  case "${args[$i]}" in
    --mode) FORCE_MODE="${args[$((i + 1))]:-}" ;;
    --task) TASK_FILTER="${args[$((i + 1))]:-}" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/ops/content-studio-gamer-env.sh"

RUN_STATE_DIR="${OPSLY_OVERNIGHT_STATE:-runtime/opencode-overnight}"
STATE_FILE="${RUN_STATE_DIR}/state.json"
export RUN_STATE_DIR STATE_FILE
BACKLOG="${OPSLY_OVERNIGHT_BACKLOG:-config/overnight-backlog.json}"
LOG_FILE="${HOME}/Library/Logs/opsly/pc-gamer-autodispatch.log"

mkdir -p "${RUN_STATE_DIR}" "$(dirname "${LOG_FILE}")"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >>"${LOG_FILE}"; }

notify() {
  timeout 15 ./scripts/notify-discord.sh --title "$1" --message "$2" --type "${3:-info}" >/dev/null 2>&1 || true
}

json_get() {
  JSON_IN="${1:-{}}" FIELD="$2" node --input-type=module -e '
    try {
      const d = JSON.parse(process.env.JSON_IN || "{}");
      process.stdout.write(String(d[process.env.FIELD] ?? ""));
    } catch { process.stdout.write(""); }
  '
}

rewrite_docker_redis_host() {
  [[ -n "${REDIS_URL:-}" ]] || return 0
  export REDIS_URL
  REDIS_URL="$(node --input-type=module -e '
    const raw = process.env.REDIS_URL || "";
    try {
      const u = new URL(raw);
      if (u.hostname === "redis") {
        u.hostname = process.env.OPSLY_REDIS_TAILSCALE_HOST || "100.120.151.91";
      }
      process.stdout.write(u.toString());
    } catch { process.stdout.write(raw); }
  ')"
}

task_status() {
  ID="$1" node --input-type=module -e '
    import { readFileSync, existsSync } from "node:fs";
    const f = process.env.STATE_FILE;
    if (!existsSync(f)) process.exit(0);
    try {
      const s = JSON.parse(readFileSync(f, "utf8"));
      process.stdout.write((s.tasks?.[process.env.ID]?.status) ?? "");
    } catch { process.exit(0); }
  '
}

mark() {
  local id="$1" status="$2" extra="${3:-}"
  ID="$id" STATUS="$status" EXTRA="$extra" node --input-type=module -e '
    import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
    import { dirname } from "node:path";
    const f = process.env.STATE_FILE;
    let s = {};
    if (existsSync(f)) { try { s = JSON.parse(readFileSync(f, "utf8")); } catch {} }
    s.tasks = s.tasks || {};
    const t = s.tasks[process.env.ID] || {};
    t.status = process.env.STATUS;
    t.updated_at = new Date().toISOString();
    if (process.env.EXTRA) Object.assign(t, JSON.parse(process.env.EXTRA));
    s.tasks[process.env.ID] = t;
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, JSON.stringify(s, null, 2));
  ' 2>/dev/null
}

if [[ "$RESET" == "true" ]]; then
  rm -f "$STATE_FILE"
  echo "[autodispatch] state reset: removed $STATE_FILE"
  exit 0
fi

if [[ "$LIST" == "true" ]]; then
  BACKLOG="$BACKLOG" node --input-type=module -e '
    import { readFileSync } from "node:fs";
    const bk = JSON.parse(readFileSync(process.env.BACKLOG, "utf8"));
    for (const t of bk.tasks) {
      console.log(`${t.id}\tkind=${t.kind || "opencode"}\tmin_mode=${t.min_mode}\t${t.description}`);
    }
  '
  exit 0
fi

echo "[autodispatch] mode_force=${FORCE_MODE:-auto} online_force=${FORCE_ONLINE} task=${TASK_FILTER:-all}"
log "run mode=${FORCE_MODE:-auto} online_force=${FORCE_ONLINE} task=${TASK_FILTER:-all}"

SCHED_JSON="$(./scripts/ops/pc-gamer-schedule.sh --json 2>/dev/null || echo '{}')"
MODE="$(json_get "$SCHED_JSON" mode)"; MODE="${MODE:-gaming}"
[[ -n "$FORCE_MODE" ]] && MODE="$FORCE_MODE"
ALLOW_LIST="$(json_get "$SCHED_JSON" allow_enqueue)"

ONLINE_JSON="$(./scripts/ops/check-pc-gamer-online.sh --json 2>/dev/null || echo '{}')"
SSH="$(json_get "$ONLINE_JSON" ssh)"; SSH="${SSH:-false}"
HEALTH="$(json_get "$ONLINE_JSON" health)"; HEALTH="${HEALTH:-false}"
READY=false
[[ "$SSH" == "true" || "$HEALTH" == "true" ]] && READY=true
[[ "$FORCE_ONLINE" == "true" ]] && READY=true

if [[ "$READY" != "true" ]]; then
  echo "[autodispatch] gamer no alcanzable (ssh=${SSH} health=${HEALTH}) — no encola. exit=2"
  log "not-ready ssh=${SSH} health=${HEALTH} MODE=${MODE} → exit=2"
  exit 2
fi

ALLOWS_CONTENT=false
ALLOWS_OPENCODE=false
[[ "$ALLOW_LIST" == *content_video* || "$MODE" == "heavy" || "$MODE" == "light" ]] && ALLOWS_CONTENT=true
[[ "$ALLOW_LIST" == *opencode* || "$MODE" == "heavy" ]] && ALLOWS_OPENCODE=true
[[ "$MODE" == "gaming" && "$FORCE" != "true" ]] && ALLOWS_CONTENT=false && ALLOWS_OPENCODE=false

if [[ "$FORCE" != "true" && "$ALLOWS_CONTENT" != "true" && "$ALLOWS_OPENCODE" != "true" ]]; then
  echo "[autodispatch] modo '${MODE}' no permite content_video ni opencode — skip. exit=2"
  log "mode=${MODE} blocked"
  exit 2
fi

echo "[autodispatch] ready ssh=${SSH} health=${HEALTH} mode=${MODE} content=${ALLOWS_CONTENT} opencode=${ALLOWS_OPENCODE}"
log "ready MODE=${MODE} proceed"
rewrite_docker_redis_host

CANDIDATES="$(
  BACKLOG="$BACKLOG" MODE="$MODE" TASK_FILTER="$TASK_FILTER" \
  ALLOWS_CONTENT="$ALLOWS_CONTENT" ALLOWS_OPENCODE="$ALLOWS_OPENCODE" \
  node --input-type=module -e '
    import { readFileSync } from "node:fs";
    const bk = JSON.parse(readFileSync(process.env.BACKLOG, "utf8"));
    const mode = process.env.MODE;
    const filter = process.env.TASK_FILTER || "";
    const order = { light: 0, day: 0, heavy: 1 };
    const modeRank = order[mode] ?? -1;
    const allowContent = process.env.ALLOWS_CONTENT === "true";
    const allowOpencode = process.env.ALLOWS_OPENCODE === "true";
    const tasks = bk.tasks
      .filter((t) => (!filter || t.id === filter))
      .filter((t) => (order[t.min_mode] ?? 99) <= modeRank)
      .filter((t) => {
        const kind = t.kind || "opencode";
        if (kind === "content_video") return allowContent;
        return allowOpencode;
      })
      .map((t) => [t.id, t.kind || "opencode", t.agent || "-", t.prompt_file || "-", t.min_mode, t.channel || "-"].join("|"));
    process.stdout.write(tasks.join("\n") + (tasks.length ? "\n" : ""));
  '
)"

[[ -z "$CANDIDATES" ]] && { echo "[autodispatch] sin tareas elegibles para modo '${MODE}'. done."; exit 0; }

while IFS='|' read -r id kind agent prompt_file min_mode channel; do
  [[ -z "${id:-}" ]] && continue
  ST="$(task_status "$id")"
  case "$ST" in
    done|skipped|queued|active|dry-run)
      echo "[autodispatch] SKIP ${id}: estado='${ST}'"
      log "skip ${id} status=${ST}"
      continue
      ;;
    failed)
      if [[ "$FORCE" != "true" ]]; then
        echo "[autodispatch] SKIP ${id}: failed previo (usa --reset-state o --force)"
        log "skip ${id} status=failed"
        continue
      fi
      ;;
  esac

  echo "[autodispatch] ENCOLANDO ${id} kind=${kind} mode=${MODE}"
  log "enqueue ${id} kind=${kind} mode=${MODE}"
  REQ_ID="${id}-$(date -u +%Y%m%dT%H%M%SZ)"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[autodispatch][dry-run] ${id} kind=${kind} channel=${channel} agent=${agent}"
    continue
  fi

  if [[ "$kind" == "content_video" ]]; then
    if [[ -z "${REDIS_URL:-}" ]]; then
      echo "[autodispatch] SKIP ${id}: REDIS_URL unset (doppler run)" >&2
      continue
    fi
    local_channel="$channel"
    [[ "$local_channel" == "-" || -z "$local_channel" ]] && local_channel="bitsitos"
    mark "$id" "queued" "{\"request_id\":\"${REQ_ID}\",\"channel\":\"${local_channel}\"}"
    if ENQ_OUT="$(./scripts/content-studio-enqueue.sh --channel "$local_channel" 2>&1)"; then
      echo "$ENQ_OUT"
      mark "$id" "active" "{\"request_id\":\"${REQ_ID}\",\"channel\":\"${local_channel}\"}"
      notify "pc-gamer autodispatch" "Content Studio ${local_channel} encolado (${MODE})" "success"
      log "enqueue ${id} OK"
    else
      echo "[autodispatch] ERROR ${id}: $ENQ_OUT" >&2
      mark "$id" "failed" "{\"request_id\":\"${REQ_ID}\",\"error\":\"content enqueue failed\"}"
    fi
    continue
  fi

  if [[ -z "${PLATFORM_ADMIN_TOKEN:-}" ]]; then
    echo "[autodispatch] SKIP ${id}: PLATFORM_ADMIN_TOKEN unset" >&2
    continue
  fi
  if ! [[ -f "$prompt_file" ]]; then
    echo "[autodispatch] SKIP ${id}: falta prompt ${prompt_file}"
    continue
  fi

  mark "$id" "queued" "{\"request_id\":\"${REQ_ID}\"}"
  if ENQ_OUT="$(PLATFORM_ADMIN_TOKEN="$PLATFORM_ADMIN_TOKEN" \
      ./scripts/ops/enqueue-overnight-opencode.sh \
        --agent "$agent" --prompt-file "$prompt_file" $( [[ "$FORCE" == "true" ]] && echo --force ) 2>&1)"; then
    echo "$ENQ_OUT"
    mark "$id" "active" "{\"request_id\":\"${REQ_ID}\",\"agent\":\"${agent}\"}"
    notify "pc-gamer autodispatch" "Encolado ${id} (${MODE})" "success"
    log "enqueue ${id} OK"
  else
    echo "[autodispatch] ERROR ${id}: $ENQ_OUT" >&2
    mark "$id" "failed" "{\"request_id\":\"${REQ_ID}\",\"error\":\"opencode enqueue failed\"}"
    log "enqueue ${id} FAILED"
  fi
done <<<"$CANDIDATES"

echo "[autodispatch] done."
exit 0
