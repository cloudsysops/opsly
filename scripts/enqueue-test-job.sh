#!/usr/bin/env bash
# Wrapper: valida Doppler (si existe) y encola job de prueba — ver scripts/enqueue-test-job.ts.
#
# Uso:
#   ./scripts/enqueue-test-job.sh smiletripcare
#   ./scripts/enqueue-test-job.sh prd smiletripcare
#   ./scripts/enqueue-test-job.sh smiletripcare --notify
#   ./scripts/enqueue-test-job.sh stg localrank --notify
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_cmd npx

DOPPLER_PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-prd}"
TENANT=""
EXTRA=()

if [[ $# -ge 2 ]] && [[ "$1" =~ ^(prd|stg|dev)$ ]]; then
  DOPPLER_CONFIG="$1"
  TENANT="$2"
  shift 2
  EXTRA=("$@")
elif [[ $# -ge 1 ]]; then
  TENANT="$1"
  shift
  EXTRA=("$@")
else
  die "Uso: $0 <tenant_slug> [--notify]  o  $0 <prd|stg|dev> <tenant_slug> [--notify]"
fi

[[ -n "${TENANT}" ]] || die "tenant_slug requerido"

cd "${REPO_ROOT}"

if ! command -v doppler >/dev/null 2>&1; then
  log_warn "doppler CLI no encontrado; usando .env en la raíz"
  exec npx tsx --tsconfig scripts/tsconfig.enqueue.json scripts/enqueue-test-job.ts "${TENANT}" "${EXTRA[@]}"
fi

if ! doppler secrets get REDIS_URL --project "${DOPPLER_PROJECT}" --config "${DOPPLER_CONFIG}" --plain >/dev/null 2>&1; then
  log_error "No se pudo leer REDIS_URL desde Doppler (${DOPPLER_PROJECT}/${DOPPLER_CONFIG})."
  exit 3
fi

log_info "Doppler project=${DOPPLER_PROJECT} config=${DOPPLER_CONFIG} tenant=${TENANT}"
exec doppler run --project "${DOPPLER_PROJECT}" --config "${DOPPLER_CONFIG}" -- \
  npx tsx --tsconfig scripts/tsconfig.enqueue.json scripts/enqueue-test-job.ts "${TENANT}" "${EXTRA[@]}"
