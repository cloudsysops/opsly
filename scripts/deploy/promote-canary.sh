#!/usr/bin/env bash
set -euo pipefail

STAGING_API_URL="${STAGING_API_URL:-https://api.ops.smiletripcare.com}"
PROD_API_URL="${PROD_API_URL:-https://api.ops.smiletripcare.com}"
CANARY_MIN_SUCCESS="${CANARY_MIN_SUCCESS:-3}"
CANARY_INTERVAL_SECONDS="${CANARY_INTERVAL_SECONDS:-10}"
ROLLBACK_ON_FAIL="${ROLLBACK_ON_FAIL:-false}"

usage() {
  cat <<'EOF'
Uso:
  bash scripts/deploy/promote-canary.sh [--staging-api-url URL] [--prod-api-url URL] [--rollback-on-fail]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --staging-api-url)
      STAGING_API_URL="${2:-}"
      shift 2
      ;;
    --prod-api-url)
      PROD_API_URL="${2:-}"
      shift 2
      ;;
    --rollback-on-fail)
      ROLLBACK_ON_FAIL="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Argumento desconocido: $1" >&2
      usage
      exit 1
      ;;
  esac
done

echo "==> Canary promotion gate"
echo "staging=${STAGING_API_URL}"
echo "production=${PROD_API_URL}"

echo "1) Validate staging health"
curl -sfk "${STAGING_API_URL}/api/health" >/dev/null

echo "2) Canary checks on production"
success=0
for _ in $(seq 1 "${CANARY_MIN_SUCCESS}"); do
  if curl -sfk "${PROD_API_URL}/api/health" >/dev/null; then
    success=$((success + 1))
  fi
  sleep "${CANARY_INTERVAL_SECONDS}"
done

if [[ "${success}" -lt "${CANARY_MIN_SUCCESS}" ]]; then
  echo "❌ Canary failed (${success}/${CANARY_MIN_SUCCESS})" >&2
  if [[ "${ROLLBACK_ON_FAIL}" == "true" ]]; then
    echo "Trigger rollback procedure (manual/automated) for app/admin/portal services." >&2
  fi
  exit 1
fi

echo "✅ Canary passed (${success}/${CANARY_MIN_SUCCESS})"
