#!/usr/bin/env bash
# Overnight autodispatch — PC-gamer worker plane.
# Cada pocos minutos (launchd/cron en Mac o VPS): evalúa schedule + online y
# encola SOLO tareas del backlog que el modo actual permita y que el nodo pueda
# procesar. El worker BullMQ `local-agents` del nodo consume la cola cuando está vivo.
#
# Zero secrets: PLATFORM_ADMIN_TOKEN se provee vía Doppler (`doppler run …`) — nunca
# está en el repo ni se embebe aquí.
#
# Salidas:
#   exit 0 = nada que hacer / done
#   exit 1 = error de infra (no encola)
#   exit 2 = no disponible (nodo offline o modo no permite) — semaforizado, no ruido
#
# Usage:
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/ops/overnight-autodispatch.sh
#   ./scripts/ops/overnight-autodispatch.sh --dry-run
#   ./scripts/ops/overnight-autodispatch.sh --list
#   ./scripts/ops/overnight-autodispatch.sh --mode heavy --force-online  # testing
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

RUN_STATE_DIR="${OPSLY_OVERNIGHT_STATE:-runtime/opencode-overnight}"
STATE_FILE="${RUN_STATE_DIR}/state.json"
export RUN_STATE_DIR STATE_FILE
BACKLOG="${OPSLY_OVERNIGHT_BACKLOG:-config/overnight-backlog.json}"
LOG_FILE="${HOME}/Library/Logs/opsly/pc-gamer-autodispatch.log"

mkdir -p "${RUN_STATE_DIR}" "$(dirname "${LOG_FILE}")"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >>"${LOG_FILE}"; }

notify() {
  # nunca falla el job por notificación; timeout duro 15s (el curl interno no
  # tiene límite y podría colgar el ciclo de 5 min).
  timeout 15 ./scripts/notify-discord.sh --title "$1" --message "$2" --type "${3:-info}" >/dev/null 2>&1 || true
}

json_get() {
  # json_get <json> <field> — string|number atom de salida
  JSON_IN="$1" FIELD="$2" node --input-type=module -e '
    const d = JSON.parse(process.env.JSON_IN);
    process.stdout.write(String(d[process.env.FIELD] ?? ""));
  '
}
json_arr_has() {
  # json_arr_has <json> <field> <needle>
  JSON_IN="$1" FIELD="$2" NEEDLE="$3" node --input-type=module -e '
    const d = JSON.parse(process.env.JSON_IN);
    process.stdout.write(Array.isArray(d[process.env.FIELD]) && d[process.env.FIELD].includes(process.env.NEEDLE) ? "true" : "false");
  '
}
task_status() {
  # task_status <id> — imprime estado canónico o vacío si nunca se marcó
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

if [[ -z "${PLATFORM_ADMIN_TOKEN:-}" ]]; then
  echo "[autodispatch] ERROR: PLATFORM_ADMIN_TOKEN no set — corre vía 'doppler run …'." >&2
  exit 1
fi

if [[ "$LIST" == "true" ]]; then
  BACKLOG="$BACKLOG" node --input-type=module -e '
    import { readFileSync } from "node:fs";
    const bk = JSON.parse(readFileSync(process.env.BACKLOG, "utf8"));
    for (const t of bk.tasks) console.log(`${t.id}\tagent=${t.agent}\tmin_mode=${t.min_mode}\t${t.description}`);
  '
  exit 0
fi

echo "[autodispatch] mode_force=${FORCE_MODE:-auto} online_force=${FORCE_ONLINE} task=${TASK_FILTER:-all}"
log "run mode=${FORCE_MODE:-auto} online_force=${FORCE_ONLINE} task=${TASK_FILTER:-all}"

# --- schedule (modo real) ---
# pc-gamer-schedule.sh --json SIEMPRE imprime JSON válido en una línea (luego exit 0);
# no añadir fallback aquí para no duplicar líneas y romper json_get.
SCHED_JSON="$(./scripts/ops/pc-gamer-schedule.sh --json 2>/dev/null)"
MODE="$(json_get "$SCHED_JSON" mode)"; MODE="${MODE:-gaming}"
[[ -n "$FORCE_MODE" ]] && MODE="$FORCE_MODE"
ALLOW_LIST="$(json_get "$SCHED_JSON" allow_enqueue)"

ALLOWS_OPENCODE="$(json_arr_has "$SCHED_JSON" allow_enqueue opencode)"
[[ "$MODE" == "heavy" ]] && ALLOWS_OPENCODE="true"
[[ "$MODE" == "gaming" || "$MODE" == "light" ]] && ALLOWS_OPENCODE="false"

# --- online check ---
# En --json imprime SIEMPRE una línea JSON; si sale offline termina con exit 1.
# El fallback se elimina a propósito: añadirlo al capturar la salida duplicaría
# la línea JSON y rompería el parseo en json_get.
ONLINE_JSON="$(./scripts/ops/check-pc-gamer-online.sh --json 2>/dev/null || true)"
ONLINE="$(json_get "$ONLINE_JSON" online)"
[[ "$FORCE_ONLINE" == "true" ]] && ONLINE="true"

if [[ "$ONLINE" != "true" ]]; then
  echo "[autodispatch] nodo offline — no encola (cola persistente en VPS esperará al worker). exit=2"
  log "offline MODE=${MODE} → exit=2"
  exit 2
fi

if [[ "$FORCE" != "true" && "$ALLOWS_OPENCODE" != "true" ]]; then
  echo "[autodispatch] modo '${MODE}' NO permite opencode — skip (exit=2). allow=$ALLOW_LIST"
  log "mode=${MODE} does not allow opencode → blocked"
  notify "pc-gamer autodispatch" "modo ${MODE} no permite opencode — sin encolado" "warning"
  exit 2
fi

echo "[autodispatch] nodo online + modo '${MODE}' permite opencode — revisando backlog…"
log "online MODE=${MODE} proceed"

# --- candidatos del backlog ---
CANDIDATES="$(
  BACKLOG="$BACKLOG" MODE="$MODE" TASK_FILTER="$TASK_FILTER" node --input-type=module -e '
    import { readFileSync } from "node:fs";
    const bk = JSON.parse(readFileSync(process.env.BACKLOG, "utf8"));
    const mode = process.env.MODE;
    const filter = process.env.TASK_FILTER || "";
    const order = { light: 0, heavy: 1 };
    const tasks = bk.tasks
      .filter((t) => (!filter || t.id === filter))
      .filter((t) => order[t.min_mode] !== undefined && order[t.min_mode] <= order[mode])
      .map((t) => [t.id, t.agent, t.prompt_file, t.min_mode].join("\t"));
    process.stdout.write(tasks.join("\n") + (tasks.length ? "\n" : ""));
  '
)"

[[ -z "$CANDIDATES" ]] && { echo "[autodispatch] sin tareas elegibles para modo '${MODE}'. done."; exit 0; }

while IFS=$'\t' read -r id agent prompt_file min_mode; do
  ST="$(task_status "$id")"
  case "$ST" in
    done|skipped|queued|active|dry-run)
      echo "[autodispatch] SKIP ${id}: estado='${ST}' (cola ya tiene trabajo o terminó)."
      log "skip ${id} status=${ST}"
      continue
      ;;
  esac

  if ! [[ -f "$prompt_file" ]]; then
    echo "[autodispatch] SKIP ${id}: falta prompt_file ${prompt_file}"
    log "skip ${id} missing prompt file"
    continue
  fi

  echo "[autodispatch] ENCOLANDO ${id} (agent=${agent}, min_mode=${min_mode}, modo=${MODE})"
  log "enqueue ${id} agent=${agent} mode=${MODE}"

  REQ_ID="${id}-$(date -u +%Y%m%dT%H%M%SZ)"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[autodispatch][dry-run] POST /api/local/prompt-submit id=${id} request_id=${REQ_ID}"
    mark "$id" "dry-run" "{\"request_id\":\"${REQ_ID}\",\"reason\":\"dry-run\"}"
    continue
  fi

  mark "$id" "queued" "{\"request_id\":\"${REQ_ID}\"}"
  if ENQ_OUT="$(PLATFORM_ADMIN_TOKEN="$PLATFORM_ADMIN_TOKEN" \
      ./scripts/ops/enqueue-overnight-opencode.sh \
        --agent "$agent" --prompt-file "$prompt_file" $( [[ "$FORCE" == "true" ]] && echo --force ) 2>&1)"; then
    echo "$ENQ_OUT"
    mark "$id" "active" "{\"request_id\":\"${REQ_ID}\",\"agent\":\"${agent}\"}"
    notify "pc-gamer autodispatch" "Encolado ${id} (${MODE}) — request ${REQ_ID}" "success"
    log "enqueue ${id} OK request=${REQ_ID}"
  else
    echo "[autodispatch] ERROR encolando ${id}: $ENQ_OUT" >&2
    mark "$id" "failed" "{\"request_id\":\"${REQ_ID}\",\"error\":\"enqueue cmd failed\"}"
    log "enqueue ${id} FAILED request=${REQ_ID}"
  fi
done <<<"$CANDIDATES"

echo "[autodispatch] done."
exit 0