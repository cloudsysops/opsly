#!/usr/bin/env bash
# Watcher local (Mac, via launchd): detecta cuando pc-gamer vuelve a Tailscale
# y dispara pc-gamer-reconnect.sh solo si el worker no está ya sano.
# Todo el estado queda en ~/Library/Logs/opsly — sin depender de una sesión de Claude activa.
set -uo pipefail

REPO_ROOT="/Users/dragon/cboteros/proyectos/intcloudsysops"
LOG_DIR="$HOME/Library/Logs/opsly"
LOG_FILE="$LOG_DIR/pc-gamer-watch.log"
STATE_FILE="$LOG_DIR/pc-gamer-watch.state"
LOCK_DIR="$LOG_DIR/pc-gamer-watch.lock"
MAX_CONSECUTIVE_FAILS=5
STALE_LOCK_SEC=1800

mkdir -p "$LOG_DIR"

log() {
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >>"$LOG_FILE"
}

notify() {
  # Notificación nativa macOS — cero costo de tokens, no depende de Claude despierto.
  osascript -e "display notification \"$2\" with title \"$1\"" >/dev/null 2>&1 || true
}

# Lock por directorio (mkdir es atómico); limpia si quedó huérfano de una corrida colgada.
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  lock_age=$(( $(date +%s) - $(stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0) ))
  if [[ "$lock_age" -gt "$STALE_LOCK_SEC" ]]; then
    log "WARN: lock huérfano (${lock_age}s) — lo limpio y sigo"
    rm -rf "$LOCK_DIR"
    mkdir "$LOCK_DIR" 2>/dev/null || { log "ERROR: no pude tomar el lock tras limpiar"; exit 0; }
  else
    exit 0 # otra corrida en curso, silencioso
  fi
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null' EXIT

cd "$REPO_ROOT" || { log "ERROR: no encuentro el repo en $REPO_ROOT"; exit 1; }

fails=0
[[ -f "$STATE_FILE" ]] && fails="$(cat "$STATE_FILE" 2>/dev/null || echo 0)"

if [[ "$fails" -ge "$MAX_CONSECUTIVE_FAILS" ]]; then
  log "SKIP: $fails fallos consecutivos — dejo de reintentar hasta limpiar $STATE_FILE a mano"
  exit 0
fi

tailscale_line="$(tailscale status 2>/dev/null | grep -i ' pc-gamer ')"
if [[ -z "$tailscale_line" || "$tailscale_line" == *offline* ]]; then
  exit 0 # offline, sin ruido en el log
fi

online_json="$(./scripts/ops/check-pc-gamer-online.sh --json 2>/dev/null)"
if [[ "$online_json" == *'"online":true'* ]]; then
  echo 0 >"$STATE_FILE"
  exit 0 # ya sano, nada que hacer
fi

log "pc-gamer alcanzable por Tailscale pero worker no sano — disparando reconnect"
log "tailscale: $tailscale_line"

if ./scripts/ops/pc-gamer-reconnect.sh --wait 60 --use-host-ollama --with-opencode >>"$LOG_FILE" 2>&1; then
  final_json="$(./scripts/ops/check-pc-gamer-online.sh --json 2>/dev/null)"
  log "reconnect terminó. estado final: $final_json"
  if [[ "$final_json" == *'"online":true'* ]]; then
    echo 0 >"$STATE_FILE"
    log "SUCCESS: pc-gamer worker online"
    notify "pc-gamer" "Worker online — plano Docker levantado y sano."
  else
    fails=$((fails + 1))
    echo "$fails" >"$STATE_FILE"
    log "WARN: reconnect corrió pero worker sigue no-sano (fallos consecutivos=$fails)"
    if [[ "$fails" -ge "$MAX_CONSECUTIVE_FAILS" ]]; then
      notify "pc-gamer" "$fails fallos seguidos — reconnect no logra dejarlo sano. Ver pc-gamer-watch.log."
    fi
  fi
else
  fails=$((fails + 1))
  echo "$fails" >"$STATE_FILE"
  log "ERROR: pc-gamer-reconnect.sh falló (fallos consecutivos=$fails)"
  if [[ "$fails" -ge "$MAX_CONSECUTIVE_FAILS" ]]; then
    notify "pc-gamer" "$fails fallos seguidos — reconnect falla. Ver pc-gamer-watch.log."
  fi
fi
