#!/usr/bin/env bash
# Poll until agency GHL token has tag scopes, then run intcloudsysops provision --execute.
# Use while away: token update in Doppler triggers provisioning without manual re-run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

INTERVAL_SEC="${GHL_AGENCY_POLL_INTERVAL_SEC:-120}"
MAX_ATTEMPTS="${GHL_AGENCY_POLL_MAX:-60}"
LOG="${GHL_AGENCY_POLL_LOG:-docs/artifacts/provisioning/agency-auto-provision.log}"

mkdir -p "$(dirname "$LOG")"

log() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*" | tee -a "$LOG"
}

usage() {
  cat <<EOF
Usage: $(basename "$0") [--once|--watch]

  --once    Single scope check + provision if ready (default)
  --watch   Poll every ${INTERVAL_SEC}s up to ${MAX_ATTEMPTS} attempts

Env: GHL_AGENCY_POLL_INTERVAL_SEC, GHL_AGENCY_POLL_MAX, GHL_AGENCY_POLL_LOG
EOF
}

MODE="once"
if [[ "${1:-}" == "--watch" ]]; then
  MODE="watch"
elif [[ "${1:-}" == "--once" || -z "${1:-}" ]]; then
  MODE="once"
elif [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
else
  echo "Unknown option: $1" >&2
  usage >&2
  exit 1
fi

try_provision() {
  if ./scripts/ghl-scope-smoke.sh --tenant intcloudsysops >>"$LOG" 2>&1; then
    log "scopes OK — running intcloudsysops provision --execute"
    if ./scripts/ghl-provision-intcloudsysops.sh --execute >>"$LOG" 2>&1; then
      log "SUCCESS — intcloudsysops provision complete"
      ./scripts/notify-discord.sh "✅ GHL Intcloudsysops provision complete" "agency auto-provision" "success" 2>/dev/null || true
      return 0
    fi
    log "WARN — provision exited non-zero (see report in docs/artifacts/provisioning/)"
    return 1
  fi
  return 2
}

log "agency auto-provision start mode=$MODE interval=${INTERVAL_SEC}s max=${MAX_ATTEMPTS}"

if [[ "$MODE" == "once" ]]; then
  if try_provision; then
    exit 0
  fi
  exit 2
fi

attempt=1
while [[ "$attempt" -le "$MAX_ATTEMPTS" ]]; do
  log "attempt $attempt/$MAX_ATTEMPTS"
  if try_provision; then
    exit 0
  fi
  log "waiting ${INTERVAL_SEC}s (update GOHIGHLEVEL_API_KEY in Doppler to continue)"
  sleep "$INTERVAL_SEC"
  attempt=$((attempt + 1))
done

log "TIMEOUT — agency token still without scopes after $MAX_ATTEMPTS attempts"
exit 2
