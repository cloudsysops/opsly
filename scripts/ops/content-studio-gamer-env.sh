#!/usr/bin/env bash
# Shared env for Content Studio on PC-gamer.
# Source from enqueue / autopilot / factory. Does not print secrets.
#
# Worker + MoneyPrinter live on the gamer. Jobs must call localhost:8080
# (the consumer is ContentVideoWorker on that box). Mac does not render.
#
# shellcheck disable=SC2034
CONTENT_STUDIO_RENDER_HOST="${CONTENT_STUDIO_RENDER_HOST:-gamer}"
# Force worker-local bridge unless a human opts into a remote URL.
if [[ "${CONTENT_STUDIO_ALLOW_REMOTE_MPT:-}" != "true" ]]; then
  export MONEY_PRINTER_TURBO_URL="http://127.0.0.1:8080"
else
  export MONEY_PRINTER_TURBO_URL="${MONEY_PRINTER_TURBO_URL:-http://127.0.0.1:8080}"
fi
export CONTENT_TENANT_SLUG="${CONTENT_TENANT_SLUG:-icso-${CONTENT_STUDIO_CHANNEL:-bitsitos}}"
# Schedule classes that may enqueue content-video (never gaming).
CONTENT_STUDIO_SCHEDULE_MODES="${CONTENT_STUDIO_SCHEDULE_MODES:-heavy,light,day}"

# Heartbeat Redis solo no basta (puede quedar stale). Content Studio exige SSH o health.
_CONTENT_STUDIO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
content_studio_gamer_ready() {
  local json
  json="$("$_CONTENT_STUDIO_ROOT/scripts/ops/check-pc-gamer-online.sh" --json 2>/dev/null || true)"
  printf '%s\n' "$json"
  [[ "$json" == *'"health":true'* || "$json" == *'"ssh":true'* ]]
}
