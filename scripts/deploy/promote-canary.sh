#!/usr/bin/env bash
set -euo pipefail

STAGING_API_URL="${STAGING_API_URL:-https://api-qa.op-sly.com}"
PROD_API_URL="${PROD_API_URL:-https://api.op-sly.com}"
CANARY_MIN_SUCCESS="${CANARY_MIN_SUCCESS:-3}"
CANARY_INTERVAL_SECONDS="${CANARY_INTERVAL_SECONDS:-10}"
ROLLBACK_GUIDANCE_ON_FAIL="${ROLLBACK_GUIDANCE_ON_FAIL:-false}"

usage() {
  cat <<'EOF'
Uso:
  bash scripts/deploy/promote-canary.sh [--staging-api-url URL] [--prod-api-url URL] [--rollback-guidance-on-fail]

Nota: --rollback-guidance-on-fail NO ejecuta rollback. El smoke falla cerrado y
emite una instrucción explícita de rollback requerido. El alias histórico
--rollback-on-fail se conserva temporalmente con la misma semántica de guía.
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
    --rollback-guidance-on-fail)
      ROLLBACK_GUIDANCE_ON_FAIL="true"
      shift
      ;;
    --rollback-on-fail)
      # Backward-compatible alias. Despite the legacy name, this has never
      # executed rollback; it only requests explicit rollback-required guidance.
      echo "WARN: --rollback-on-fail is deprecated; use --rollback-guidance-on-fail" >&2
      ROLLBACK_GUIDANCE_ON_FAIL="true"
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

if [[ -z "${STAGING_API_URL}" || -z "${PROD_API_URL}" ]]; then
  echo "staging and production API URLs are required" >&2
  exit 1
fi

STAGING_API_URL="${STAGING_API_URL%/}"
PROD_API_URL="${PROD_API_URL%/}"

echo "==> Canary promotion gate"
echo "staging=${STAGING_API_URL}"
echo "production=${PROD_API_URL}"

echo "1) Validate staging health"
curl -sfk --max-time 15 "${STAGING_API_URL}/api/health" >/dev/null

echo "2) Canary checks on production"
success=0
for _ in $(seq 1 "${CANARY_MIN_SUCCESS}"); do
  if curl -sfk --max-time 15 "${PROD_API_URL}/api/health" >/dev/null; then
    success=$((success + 1))
  fi
  sleep "${CANARY_INTERVAL_SECONDS}"
done

if [[ "${success}" -lt "${CANARY_MIN_SUCCESS}" ]]; then
  echo "❌ Canary failed (${success}/${CANARY_MIN_SUCCESS})" >&2
  if [[ "${ROLLBACK_GUIDANCE_ON_FAIL}" == "true" ]]; then
    echo "ROLLBACK_REQUIRED: production smoke failed; execute the governed rollback procedure for the promoted services. Automatic rollback is not implemented in this script." >&2
  fi
  exit 1
fi

echo "✅ Canary passed (${success}/${CANARY_MIN_SUCCESS})"
