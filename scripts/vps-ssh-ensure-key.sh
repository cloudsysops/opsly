#!/usr/bin/env bash
# Crea en el host actual (típicamente el VPS) la clave ed25519 usada solo para SSH saliente a workers.
# Idempotente: si la clave ya existe, no la regenera.
#
# Uso (en el VPS):
#   ./scripts/vps-ssh-ensure-key.sh
#   ./scripts/vps-ssh-ensure-key.sh --dry-run
#
# Variables opcionales:
#   OPSLY_SSH_NODES_KEY     default: ~/.ssh/id_ed25519_opsly_nodes
#   OPSLY_SSH_NODES_COMMENT default: opsly-vps-to-worker-nodes
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

KEY="${OPSLY_SSH_NODES_KEY:-${HOME}/.ssh/id_ed25519_opsly_nodes}"
COMMENT="${OPSLY_SSH_NODES_COMMENT:-opsly-vps-to-worker-nodes}"

DRY_RUN="${DRY_RUN:-false}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="true"
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

require_cmd ssh-keygen

if [[ -f "${KEY}" ]]; then
  log_ok "Clave ya existe: ${KEY}"
else
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: crearía ${KEY} (ed25519, sin passphrase)"
    exit 0
  fi
  install -d -m 700 "$(dirname "${KEY}")"
  ssh-keygen -t ed25519 -f "${KEY}" -N "" -C "${COMMENT}"
  chmod 600 "${KEY}"
  log_ok "Clave creada: ${KEY}"
fi

if [[ ! -f "${KEY}.pub" ]]; then
  die "Falta ${KEY}.pub" 1
fi

echo ""
log_info "Clave pública (añadir en workers con worker-ssh-authorize-pubkey.sh o bootstrap):"
cat "${KEY}.pub"
