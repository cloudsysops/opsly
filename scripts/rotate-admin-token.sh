#!/usr/bin/env bash
# Rota el token admin de plataforma en Doppler.
# Uso: ./scripts/rotate-admin-token.sh [--dry-run] [--env prd]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

CONFIG_PATH="${REPO_ROOT}/config/opsly.config.json"
DEFAULT_ENV=""
DRY_RUN="false"

usage() {
  cat <<'EOF'
Uso:
  ./scripts/rotate-admin-token.sh [--dry-run] [--env prd]

Propósito:
  - Rotar PLATFORM_ADMIN_TOKEN en Doppler.
  - Mantener NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN sincronizado con el mismo valor.

Notas:
  - Requiere DOPPLER_TOKEN exportado en el entorno.
  - No imprime el token ni fragmentos del secreto.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --env)
      [[ -n "${2:-}" ]] || die "Falta valor para --env" 1
      DEFAULT_ENV="${2}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Opción desconocida: $1" 1
      ;;
  esac
done

require_cmd jq doppler openssl
require_env DOPPLER_TOKEN
[[ -f "${CONFIG_PATH}" ]] || die "No existe ${CONFIG_PATH}" 1

DOPPLER_PROJECT="$(jq -r '.project.doppler_project // empty' "${CONFIG_PATH}")"
DOPPLER_CONFIG="$(jq -r '.project.doppler_config // empty' "${CONFIG_PATH}")"

[[ -n "${DOPPLER_PROJECT}" && "${DOPPLER_PROJECT}" != "null" ]] || die "config: project.doppler_project" 1
[[ -n "${DOPPLER_CONFIG}" && "${DOPPLER_CONFIG}" != "null" ]] || die "config: project.doppler_config" 1

if [[ -n "${DEFAULT_ENV}" ]]; then
  DOPPLER_CONFIG="${DEFAULT_ENV}"
fi

NEW_TOKEN="$(openssl rand -base64 32 | tr -d '\n')"

write_secret() {
  local secret_name="${1:?secret_name required}"
  local secret_value="${2:?secret_value required}"
  printf '%s' "${secret_value}" | doppler secrets set "${secret_name}" \
    --project "${DOPPLER_PROJECT}" \
    --config "${DOPPLER_CONFIG}" \
    --no-interactive >/dev/null
}

log_info "Rotando token admin en ${DOPPLER_PROJECT}/${DOPPLER_CONFIG}"

if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "[dry-run] Se generó un nuevo token (longitud ${#NEW_TOKEN})."
  log_info "[dry-run] doppler secrets set PLATFORM_ADMIN_TOKEN --project ${DOPPLER_PROJECT} --config ${DOPPLER_CONFIG}"
  log_info "[dry-run] doppler secrets set NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN --project ${DOPPLER_PROJECT} --config ${DOPPLER_CONFIG}"
  exit 0
fi

write_secret "PLATFORM_ADMIN_TOKEN" "${NEW_TOKEN}"
write_secret "NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN" "${NEW_TOKEN}"

log_info "Token admin rotado en Doppler."
log_warn "Siguiente paso: refresca servicios que consumen el token (al menos API; si aplica, admin en el siguiente deploy)."
log_warn "Referencia: ./scripts/vps-refresh-api-env.sh"
