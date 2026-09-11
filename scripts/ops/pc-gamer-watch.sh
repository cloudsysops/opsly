#!/usr/bin/env bash
# Watcher local (Mac launchd): cuando pc-gamer vuelve a Tailscale y el worker
# no está sano, dispara pc-gamer-reconnect.sh (main). Sin sesión de agente.
#
# Install:
#   cp infra/launchd/com.opsly.pcgamerwatch.plist ~/Library/LaunchAgents/
#   # edit paths if needed, then:
#   launchctl bootout gui/$(id -u)/com.opsly.pcgamerwatch 2>/dev/null || true
#   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.opsly.pcgamerwatch.plist
#
# Manual:
#   ./scripts/ops/pc-gamer-watch.sh
#   ./scripts/ops/pc-gamer-watch.sh --force
#
set -uo pipefail

REPO_ROOT="${OPSLY_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
LOG_DIR="${OPSLY_PC_GAMER_LOG_DIR:-$HOME/Library/Logs/opsly}"
LOG_FILE="$LOG_DIR/pc-gamer-watch.log"
STATE_FILE="$LOG_DIR/pc-gamer-watch.state"
LOCK_DIR="$LOG_DIR/pc-gamer-watch.lock"
MAX_CONSECUTIVE_FAILS="${OPSLY_PC_GAMER_WATCH_MAX_FAILS:-5}"
STALE_LOCK_SEC="${OPSLY_PC_GAMER_WATCH_STALE_LOCK_SEC:-1800}"
TS_HOST="${PC_GAMER_TAILSCALE_HOST:-pc-gamer}"
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
  esac
done

mkdir -p "$LOG_DIR"

log() {
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG_FILE"
}

notify_mac() {
  osascript -e "display notification \"$2\" with title \"$1\"" >/dev/null 2>&1 || true
}

notify_discord() {
  local title="$1"
  local body="$2"
  if [[ -x "$REPO_ROOT/scripts/notify-discord.sh" ]]; then
    (
      cd "$REPO_ROOT"
      if command -v doppler >/dev/null 2>&1; then
        doppler run --project ops-intcloudsysops --config prd -- \
          ./scripts/notify-discord.sh "$title" "$body" "success" 2>/dev/null || true
      else
        ./scripts/notify-discord.sh "$title" "$body" "success" 2>/dev/null || true
      fi
    ) || true
  fi
}

# Atomic lock; clear orphaned locks.
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  lock_age=$(( $(date +%s) - $(stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0) ))
  if [[ "$lock_age" -gt "$STALE_LOCK_SEC" ]]; then
    log "WARN: stale lock (${lock_age}s) — clearing"
    rm -rf "$LOCK_DIR"
    mkdir "$LOCK_DIR" 2>/dev/null || { log "ERROR: cannot take lock"; exit 0; }
  else
    exit 0
  fi
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

cd "$REPO_ROOT" || { log "ERROR: repo missing at $REPO_ROOT"; exit 1; }

if [[ ! -x ./scripts/ops/pc-gamer-reconnect.sh ]]; then
  log "ERROR: missing executable scripts/ops/pc-gamer-reconnect.sh"
  exit 127
fi

fails=0
[[ -f "$STATE_FILE" ]] && fails="$(tr -cd '0-9' <"$STATE_FILE" | head -c 8)"
fails="${fails:-0}"

if [[ "$FORCE" != "true" && "$fails" -ge "$MAX_CONSECUTIVE_FAILS" ]]; then
  log "SKIP: $fails consecutive fails — reset with: echo 0 > $STATE_FILE"
  exit 0
fi

tailscale_line=""
if command -v tailscale >/dev/null 2>&1; then
  tailscale_line="$(tailscale status 2>/dev/null | grep -iE "[[:space:]]${TS_HOST}[[:space:]]" || true)"
fi

if [[ -z "$tailscale_line" || "$tailscale_line" == *offline* ]]; then
  [[ "$FORCE" == "true" ]] || exit 0
  log "FORCE: Tailscale reports offline/missing — still attempting reconnect"
fi

online_json="$(./scripts/ops/check-pc-gamer-online.sh --json 2>/dev/null || echo '{}')"
if [[ "$FORCE" != "true" && "$online_json" == *'"online":true'* ]]; then
  echo 0 >"$STATE_FILE"
  exit 0
fi

log "pc-gamer reachable / not healthy — reconnect (branch=main)"
log "tailscale: ${tailscale_line:-none}"
log "online_pre: $online_json"

export PC_GAMER_BRANCH="${PC_GAMER_BRANCH:-main}"

if ./scripts/ops/pc-gamer-reconnect.sh --wait 120 --use-host-ollama --with-opencode --pull-model >>"$LOG_FILE" 2>&1; then
  final_json="$(./scripts/ops/check-pc-gamer-online.sh --json 2>/dev/null || echo '{}')"
  log "reconnect finished: $final_json"
  if [[ "$final_json" == *'"online":true'* ]]; then
    echo 0 >"$STATE_FILE"
    log "SUCCESS: pc-gamer worker online"
    notify_mac "Opsly pc-gamer" "Worker ONLINE — Docker/OpenCode plane up."
    notify_discord "✅ pc-gamer ONLINE" "Watcher auto-reconnect OK. Ready for GPU / content.review jobs."
  else
    fails=$((fails + 1))
    echo "$fails" >"$STATE_FILE"
    log "WARN: reconnect ran but still not online (fails=$fails)"
    if [[ "$fails" -ge "$MAX_CONSECUTIVE_FAILS" ]]; then
      notify_mac "Opsly pc-gamer" "$fails fails — see pc-gamer-watch.log"
      notify_discord "⚠️ pc-gamer reconnect degraded" "fails=$fails — check Mac logs ~/Library/Logs/opsly/pc-gamer-watch.log"
    fi
  fi
else
  fails=$((fails + 1))
  echo "$fails" >"$STATE_FILE"
  log "ERROR: pc-gamer-reconnect.sh failed (fails=$fails)"
  if [[ "$fails" -ge "$MAX_CONSECUTIVE_FAILS" ]]; then
    notify_mac "Opsly pc-gamer" "$fails reconnect failures"
    notify_discord "❌ pc-gamer reconnect FAILED" "fails=$fails — Mac watcher stopped retrying until state reset."
  fi
fi
