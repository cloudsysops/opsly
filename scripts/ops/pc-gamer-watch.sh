#!/usr/bin/env bash
# Watcher Mac (launchd cada 5 min): cuando el PC-gamer aparece en Tailscale,
# levanta el plano (--with-content) y dispara el autodispatch.
# No depende de una sesión de Cursor. No usa heartbeat stale como “listo”.
#
# Usage:
#   ./scripts/ops/pc-gamer-watch.sh
#   ./scripts/ops/pc-gamer-watch.sh --dry-run
#
set -euo pipefail

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${HOME}/Library/Logs/opsly"
LOG_FILE="${LOG_DIR}/pc-gamer-watch.log"
STATE_FILE="${LOG_DIR}/pc-gamer-watch.state"
READY_FILE="${LOG_DIR}/pc-gamer-watch.ready"
LOCK_DIR="${LOG_DIR}/pc-gamer-watch.lock"
MAX_CONSECUTIVE_FAILS=5
STALE_LOCK_SEC=1800

mkdir -p "$LOG_DIR"
cd "$ROOT"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >>"$LOG_FILE"; }

notify_os() {
  osascript -e "display notification \"$2\" with title \"$1\"" >/dev/null 2>&1 || true
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  lock_age=$(( $(date +%s) - $(stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0) ))
  if [[ "$lock_age" -gt "$STALE_LOCK_SEC" ]]; then
    log "WARN: lock huérfano (${lock_age}s) — limpio"
    rm -rf "$LOCK_DIR"
    mkdir "$LOCK_DIR" 2>/dev/null || exit 0
  else
    exit 0
  fi
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null' EXIT

fails=0
[[ -f "$STATE_FILE" ]] && fails="$(cat "$STATE_FILE" 2>/dev/null || echo 0)"
if [[ "$fails" -ge "$MAX_CONSECUTIVE_FAILS" ]]; then
  log "SKIP: $fails fallos — reset: echo 0 > $STATE_FILE"
  exit 0
fi

# shellcheck disable=SC1091
source "$ROOT/scripts/ops/content-studio-gamer-env.sh"

tailscale_line="$(tailscale status 2>/dev/null | grep -iE '[[:space:]]pc-gamer[[:space:]]' || true)"
if [[ -z "$tailscale_line" || "$tailscale_line" == *offline* ]]; then
  echo 0 >"$READY_FILE"
  [[ "$DRY_RUN" == "true" ]] && echo "[watch][dry-run] tailscale offline — wait"
  exit 0
fi

PROBE_JSON="${LOG_DIR}/pc-gamer-watch.probe.json"
ready=false
if content_studio_gamer_ready >"$PROBE_JSON" 2>/dev/null; then
  ready=true
fi
online_json="$(cat "$PROBE_JSON" 2>/dev/null || true)"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[watch][dry-run] tailscale=${tailscale_line}"
  echo "[watch][dry-run] ready=${ready} json=${online_json}"
  echo "[watch][dry-run] would reconnect --with-content if not ready"
  echo "[watch][dry-run] would doppler overnight-autodispatch on rising edge"
  exit 0
fi

was_ready=0
[[ -f "$READY_FILE" ]] && was_ready="$(cat "$READY_FILE" 2>/dev/null || echo 0)"

if [[ "$ready" == "true" ]]; then
  echo 0 >"$STATE_FILE"
  if [[ "$was_ready" != "1" ]]; then
    log "RISING EDGE: gamer listo (ssh/health). Disparando autodispatch."
    notify_os "pc-gamer" "Online — encolando Content Studio + backlog."
    if command -v doppler >/dev/null 2>&1; then
      doppler run --project ops-intcloudsysops --config prd -- \
        "$ROOT/scripts/ops/overnight-autodispatch.sh" >>"$LOG_FILE" 2>&1 || true
    else
      log "WARN: doppler no en PATH — solo reconnect hecho"
    fi
  fi
  echo 1 >"$READY_FILE"
  exit 0
fi

log "pc-gamer en Tailscale pero SSH/health down — reconnect --with-content"
log "tailscale: $tailscale_line json=${online_json}"

schedule_mode="$(./scripts/ops/pc-gamer-schedule.sh --json 2>/dev/null | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{console.log(JSON.parse(d).mode||"")}catch{console.log("")}})')"
reconnect_args=(--wait 90 --use-host-ollama --with-content)
[[ "$schedule_mode" == "heavy" ]] && reconnect_args+=(--with-opencode)

if ./scripts/ops/pc-gamer-reconnect.sh "${reconnect_args[@]}" >>"$LOG_FILE" 2>&1; then
  if content_studio_gamer_ready >"$PROBE_JSON" 2>/dev/null; then
    echo 0 >"$STATE_FILE"
    echo 1 >"$READY_FILE"
    log "SUCCESS: plano arriba. Autodispatch."
    notify_os "pc-gamer" "Worker listo — Content Studio en cola."
    if command -v doppler >/dev/null 2>&1; then
      doppler run --project ops-intcloudsysops --config prd -- \
        "$ROOT/scripts/ops/overnight-autodispatch.sh" >>"$LOG_FILE" 2>&1 || true
    fi
  else
    fails=$((fails + 1))
    echo "$fails" >"$STATE_FILE"
    echo 0 >"$READY_FILE"
    log "WARN: reconnect corrió pero SSH/health siguen down (fails=$fails)"
  fi
else
  fails=$((fails + 1))
  echo "$fails" >"$STATE_FILE"
  echo 0 >"$READY_FILE"
  log "ERROR: reconnect falló (fails=$fails)"
  if [[ "$fails" -ge "$MAX_CONSECUTIVE_FAILS" ]]; then
    notify_os "pc-gamer" "$fails fallos de reconnect. Ver pc-gamer-watch.log"
  fi
fi
