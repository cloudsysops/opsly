#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PESKIDS_API_URL="${PESKIDS_API_URL:-https://peskids.op-sly.com}"
GHL_HEALTH_ENDPOINT="${PESKIDS_API_URL}/api/health/ghl"

# Optional: pass --dry-run to skip Discord notification
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

response=$(curl -sf --max-time 30 "${GHL_HEALTH_ENDPOINT}" 2>/dev/null || true)

if [[ -z "${response}" ]]; then
  echo "[monitor-ghl-health] ERROR: GHL health endpoint unreachable at ${GHL_HEALTH_ENDPOINT}"
  if [[ "${DRY_RUN}" == false ]]; then
    "${ROOT_DIR}/notify-discord.sh" \
      "GHL Health Monitor" \
      "GHL health endpoint unreachable at ${GHL_HEALTH_ENDPOINT}" \
      "error"
  fi
  exit 1
fi

overall=$(echo "${response}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('overall','unknown'))" 2>/dev/null || echo "parse-error")

if [[ "${overall}" == "healthy" ]]; then
  echo "[monitor-ghl-health] GHL is healthy"
  exit 0
fi

# Degraded or down — extract details for alert
latency=$(echo "${response}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('latencyMs','?'))" 2>/dev/null || echo "?")
rate_limit=$(echo "${response}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('rateLimitRemaining','?'))" 2>/dev/null || echo "?")
auth_valid=$(echo "${response}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('authValid',False))" 2>/dev/null || echo "?")
contact_works=$(echo "${response}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('contactCreationWorks',False))" 2>/dev/null || echo "?")

alert_body="GHL Health: ${overall} | Latency: ${latency}ms | Rate limit: ${rate_limit} | Auth: ${auth_valid} | Contact creation: ${contact_works}"

echo "[monitor-ghl-health] ${alert_body}"

if [[ "${DRY_RUN}" == false ]]; then
  "${ROOT_DIR}/notify-discord.sh" \
    "GHL Health Monitor — ${overall}" \
    "${alert_body}" \
    "error"
fi

exit 0
