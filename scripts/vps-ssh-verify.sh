#!/usr/bin/env bash
# Prueba SSH desde el host actual (típicamente el VPS) hacia un worker usando la clave opsly.
#
# Uso (en el VPS, tras autorizar la clave en el worker):
#   ./scripts/vps-ssh-verify.sh opslyquantum@100.80.41.29
#
# Variables:
#   OPSLY_SSH_NODES_KEY default ~/.ssh/id_ed25519_opsly_nodes
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

KEY="${OPSLY_SSH_NODES_KEY:-${HOME}/.ssh/id_ed25519_opsly_nodes}"
TARGET=""
DRY_RUN="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h | --help)
      grep '^#' "$0" | head -14
      exit 0
      ;;
    *)
      TARGET="$1"
      shift
      break
      ;;
  esac
done

[[ -n "${TARGET}" ]] || die "Uso: $0 [--dry-run] usuario@host-tailscale" 1

if [[ ! -f "${KEY}" ]]; then
  die "No existe la clave ${KEY}. Ejecuta primero scripts/vps-ssh-ensure-key.sh en este host." 1
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "DRY-RUN: ssh -i ${KEY} -o BatchMode=yes ${TARGET} 'hostname'"
  exit 0
fi

require_cmd ssh
log_info "Probando: ${TARGET} con ${KEY} …"
ssh -i "${KEY}" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=15 \
  "${TARGET}" "echo OK && hostname && uptime"
