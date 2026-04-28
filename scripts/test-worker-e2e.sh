#!/usr/bin/env bash
# Coordina encolado de job de prueba (misma Redis que el orchestrator en VPS).
# No abre tmux: ejecuta solo el encolado + espera resultado en el mismo proceso.
# Para Redis/logs en paralelo, abre otras terminales con monitor-redis-jobs.sh y monitor-worker-logs.sh.
#
# Uso:
#   doppler run --project ops-intcloudsysops --config prd -- ./scripts/test-worker-e2e.sh smiletripcare
#   ./scripts/test-worker-e2e.sh smiletripcare --notify
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

TENANT=""
EXTRA=()
if [[ $# -ge 1 ]] && [[ "$1" =~ ^(prd|stg|dev)$ ]]; then
  export DOPPLER_CONFIG="$1"
  TENANT="${2:?Uso: $0 [prd|stg|dev] <tenant_slug> [--notify]}"
  shift 2 || true
  EXTRA=("$@")
else
  TENANT="${1:?Uso: $0 <tenant_slug> [--notify] o $0 <config> <tenant_slug> [--notify]}"
  shift || true
  EXTRA=("$@")
fi

require_cmd npx
cd "${REPO_ROOT}"

echo ""
echo "🎯 E2E Test Job Processor (BullMQ openclaw)"
echo "==========================================="
echo "  Tenant: ${TENANT}"
echo "  Extra: ${EXTRA[*]:-ninguno}"
echo ""

set +e
if command -v doppler >/dev/null 2>&1 && doppler secrets get REDIS_URL --project "${DOPPLER_PROJECT:-ops-intcloudsysops}" --config "${DOPPLER_CONFIG:-prd}" --plain >/dev/null 2>&1; then
  if [[ -n "${REDIS_URL:-}" ]]; then
    local_redis_password="${LOCAL_REDIS_PASSWORD:-}"
    doppler run --project "${DOPPLER_PROJECT:-ops-intcloudsysops}" --config "${DOPPLER_CONFIG:-prd}" -- \
      env REDIS_URL="${REDIS_URL}" REDIS_PASSWORD="${REDIS_PASSWORD:-${local_redis_password}}" \
      npx tsx --tsconfig scripts/tsconfig.enqueue.json scripts/enqueue-test-job.ts "${TENANT}" "${EXTRA[@]}"
  else
    doppler run --project "${DOPPLER_PROJECT:-ops-intcloudsysops}" --config "${DOPPLER_CONFIG:-prd}" -- \
      npx tsx --tsconfig scripts/tsconfig.enqueue.json scripts/enqueue-test-job.ts "${TENANT}" "${EXTRA[@]}"
  fi
else
  log_warn "Doppler no disponible o sin REDIS_URL; usando variables del entorno / .env"
  npx tsx --tsconfig scripts/tsconfig.enqueue.json scripts/enqueue-test-job.ts "${TENANT}" "${EXTRA[@]}"
fi
code=$?
set -e

echo ""
if [[ "${code}" -eq 0 ]]; then
  log_ok "E2E encolado + espera: OK"
else
  log_error "E2E terminó con código ${code}"
fi
exit "${code}"
