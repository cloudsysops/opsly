#!/usr/bin/env bash
# Orquesta la confianza SSH VPS → worker desde una máquina que ya puede hacer SSH al VPS y al worker
# (típicamente opsly-admin / tu Mac con el repo clonado).
#
# 1) En el VPS: asegura ~/.ssh/id_ed25519_opsly_nodes
# 2) En el worker: añade esa clave pública a authorized_keys del usuario destino
#
# Requisitos: ssh sin contraseña (o agent) hacia --vps y hacia --worker.
#
# Uso:
#   ./scripts/vps-ssh-bootstrap-from-admin.sh \
#     --vps vps-dragon@100.120.151.91 \
#     --worker opslyquantum@100.80.41.29
#   ./scripts/vps-ssh-bootstrap-from-admin.sh --dry-run --vps ... --worker ...
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

VPS=""
WORKER=""
DRY_RUN="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --vps)
      VPS="${2:?}"
      shift 2
      ;;
    --worker)
      WORKER="${2:?}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h | --help)
      grep '^#' "$0" | head -22
      exit 0
      ;;
    *)
      die "Argumento desconocido: $1" 1
      ;;
  esac
done

[[ -n "${VPS}" ]] || die "Falta --vps usuario@host (Tailscale del VPS)" 1
[[ -n "${WORKER}" ]] || die "Falta --worker usuario@host (Tailscale del worker)" 1

require_cmd ssh

ENSURE="${REPO_ROOT}/scripts/vps-ssh-ensure-key.sh"
AUTHZ="${REPO_ROOT}/scripts/worker-ssh-authorize-pubkey.sh"
[[ -f "${ENSURE}" ]] || die "No encontrado: ${ENSURE}" 1
[[ -f "${AUTHZ}" ]] || die "No encontrado: ${AUTHZ}" 1

if [[ "${DRY_RUN}" == "true" ]]; then
  export DRY_RUN="true"
  log_info "DRY-RUN: ssh ${VPS} bash -s < vps-ssh-ensure-key.sh"
  log_info "DRY-RUN: ssh ${VPS} cat ~/.ssh/id_ed25519_opsly_nodes.pub"
  log_info "DRY-RUN: ssh ${WORKER} OPSLY_SSH_PUB_LINE=… bash -s < worker-ssh-authorize-pubkey.sh"
  exit 0
fi

log_info "Paso 1/2: clave en ${VPS} (ensure-key)"
ssh -o BatchMode=yes -o ConnectTimeout=15 "${VPS}" "bash -s" <"${ENSURE}"

log_info "Paso 2/2: autorizar en ${WORKER}"
PUB="$(ssh -o BatchMode=yes -o ConnectTimeout=15 "${VPS}" "cat \"\${HOME}/.ssh/id_ed25519_opsly_nodes.pub\"")"
[[ -n "${PUB}" ]] || die "No se pudo leer la clave pública en el VPS" 1

QS="$(printf '%q' "${PUB}")"
ssh -o BatchMode=yes -o ConnectTimeout=15 "${WORKER}" "OPSLY_SSH_PUB_LINE=${QS} bash -s" <"${AUTHZ}"

log_ok "Bootstrap completado. Prueba desde el VPS: ./scripts/vps-ssh-verify.sh ${WORKER}"
