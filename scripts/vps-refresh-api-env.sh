#!/usr/bin/env bash
# Regenera /opt/opsly/.env desde Doppler (vps-bootstrap) y recrea el servicio **app** en el VPS.
# Encadena los pasos 2 del bloque «Próximo paso inmediato» en AGENTS.md tras cambiar secretos en prd.
#
# Uso:
#   ./scripts/vps-refresh-api-env.sh [--dry-run] [--skip-resend-check]
#
# --dry-run: solo muestra acciones (no SSH).
# --skip-resend-check: no exige RESEND_API_KEY larga en Doppler (útil si solo cambiaste otras vars).
#
# Prerrequisito: doppler CLI autenticado; ssh BatchMode al VPS (misma máquina que validate-config).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

CONFIG="${REPO_ROOT}/config/opsly.config.json"
require_cmd jq doppler ssh

[[ -f "${CONFIG}" ]] || die "No existe ${CONFIG}" 1

DRY_RUN="false"
SKIP_RESEND_CHECK="false"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --skip-resend-check)
      SKIP_RESEND_CHECK="true"
      shift
      ;;
    -h | --help)
      grep '^#' "$0" | head -18
      exit 0
      ;;
    *)
      die "Argumento desconocido: $1 (usa --help)" 1
      ;;
  esac
done

DOPPLER_PROJECT="$(jq -r '.project.doppler_project // empty' "${CONFIG}")"
DOPPLER_CFG="$(jq -r '.project.doppler_config // empty' "${CONFIG}")"
VPS_IP="$(jq -r '.infrastructure.vps_ip // empty' "${CONFIG}")"
VPS_USER="$(jq -r '.infrastructure.vps_user // empty' "${CONFIG}")"
OPS_ROOT="$(jq -r '.infrastructure.vps_path // empty' "${CONFIG}")"

nonempty() {
  [[ -n "$1" ]] && [[ "$1" != "null" ]]
}

nonempty "${DOPPLER_PROJECT}" || die "config: falta project.doppler_project" 1
nonempty "${DOPPLER_CFG}" || die "config: falta project.doppler_config" 1
nonempty "${VPS_IP}" || die "config: falta infrastructure.vps_ip" 1
nonempty "${VPS_USER}" || die "config: falta infrastructure.vps_user" 1
nonempty "${OPS_ROOT}" || die "config: falta infrastructure.vps_path" 1

doppler me >/dev/null 2>&1 || die "Doppler CLI no autenticado (doppler login)" 1

RESEND_MIN_LEN=20
if [[ "${SKIP_RESEND_CHECK}" != "true" ]]; then
  RESEND_KEY="$(
    doppler secrets get RESEND_API_KEY \
      --project "${DOPPLER_PROJECT}" \
      --config "${DOPPLER_CFG}" \
      --plain 2>/dev/null || true
  )"
  if [[ -z "${RESEND_KEY}" ]]; then
    die "RESEND_API_KEY vacía en Doppler ${DOPPLER_PROJECT}/${DOPPLER_CFG}" 1
  fi
  if (( ${#RESEND_KEY} < RESEND_MIN_LEN )); then
    die "RESEND_API_KEY en Doppler parece placeholder (longitud ${#RESEND_KEY} < ${RESEND_MIN_LEN}). Crea clave en resend.com y doppler secrets set. Opción: --skip-resend-check." 1
  fi
fi

SSH_TARGET="${VPS_USER}@${VPS_IP}"

run_remote() {
  ssh -o BatchMode=yes -o ConnectTimeout=15 "${SSH_TARGET}" bash -s <<EOF
set -euo pipefail
cd '${OPS_ROOT}'
./scripts/vps-bootstrap.sh
cd '${OPS_ROOT}/infra'
docker compose --env-file '${OPS_ROOT}/.env' -f docker-compose.platform.yml stop app 2>/dev/null || true
docker rm -f infra-app-1 infra-app-2 2>/dev/null || true
for c in \$(docker ps -aq --filter name=infra-app); do docker rm -f "\$c" 2>/dev/null || true; done
docker compose --env-file '${OPS_ROOT}/.env' -f docker-compose.platform.yml up -d --no-deps app
docker compose --env-file '${OPS_ROOT}/.env' -f docker-compose.platform.yml ps app
EOF
}

if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "[dry-run] ssh ${SSH_TARGET} bash -s <<EOF"
  echo "(remoto) cd '${OPS_ROOT}' && ./scripts/vps-bootstrap.sh && … compose up -d --no-deps app"
  log_info "[dry-run] fin"
  exit 0
fi

log_info "SSH ${SSH_TARGET}: bootstrap + recreate app"
run_remote

log_info "Listo. Opcional: ./scripts/test-e2e-invite-flow.sh (con ADMIN_TOKEN y OWNER_EMAIL exportados)."
