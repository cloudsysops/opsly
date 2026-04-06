#!/usr/bin/env bash
# Encadena los pasos 2 y 3 del «Próximo paso inmediato» en AGENTS.md (tras paso 1: RESEND_API_KEY completa en Doppler prd).
#
# Uso:
#   export ADMIN_TOKEN="$(doppler secrets get PLATFORM_ADMIN_TOKEN --plain --project ops-intcloudsysops --config prd)"
#   export OWNER_EMAIL="smiletripcare@gmail.com"
#   ./scripts/sync-and-test-invite-flow.sh [--skip-vps] [--dry-run]
#
# --skip-vps: omite vps-refresh-api-env.sh (solo E2E contra la API pública).
# --dry-run: pasa --dry-run a vps-refresh y a test-e2e-invite-flow (sin POST invitaciones).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

SKIP_VPS="false"
DRY_RUN="false"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-vps)
      SKIP_VPS="true"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h | --help)
      grep '^#' "$0" | head -16
      exit 0
      ;;
    *)
      die "Argumento desconocido: $1 (usa --help)" 1
      ;;
  esac
done

REFRESH=( "${SCRIPT_DIR}/vps-refresh-api-env.sh" )
E2E=( "${SCRIPT_DIR}/test-e2e-invite-flow.sh" )
if [[ "${DRY_RUN}" == "true" ]]; then
  # vps-refresh valida RESEND antes del dry-run; sin clave real usamos --skip-resend-check solo en este modo.
  REFRESH+=( --dry-run --skip-resend-check )
  E2E+=( --dry-run )
fi

if [[ "${SKIP_VPS}" != "true" ]]; then
  log_info "Paso VPS: vps-refresh-api-env.sh"
  "${REFRESH[@]}"
else
  log_info "Omitido vps-refresh (--skip-vps)"
fi

log_info "Paso E2E: test-e2e-invite-flow.sh"
[[ -n "${ADMIN_TOKEN:-}" ]] || die "Exporta ADMIN_TOKEN (PLATFORM_ADMIN_TOKEN desde Doppler)" 1
if [[ "${DRY_RUN}" != "true" ]]; then
  [[ -n "${OWNER_EMAIL:-}" ]] || die "Exporta OWNER_EMAIL (debe coincidir con owner_email del tenant)" 1
fi
"${E2E[@]}"
