#!/usr/bin/env bash
# Añade de forma idempotente una línea de clave pública OpenSSH a ~/.ssh/authorized_keys.
# Ejecutar EN el nodo worker como el usuario que recibirá SSH desde el VPS.
#
# Uso:
#   ./scripts/worker-ssh-authorize-pubkey.sh ruta/al/vps.pub
#   cat vps.pub | ./scripts/worker-ssh-authorize-pubkey.sh -
#   echo 'ssh-ed25519 AAAA...' | ./scripts/worker-ssh-authorize-pubkey.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

DRY_RUN="${DRY_RUN:-false}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h | --help)
      grep '^#' "$0" | head -16
      exit 0
      ;;
    *)
      break
      ;;
  esac
done

# Llamada remota: OPSLY_SSH_PUB_LINE='ssh-ed25519 …' bash -s < worker-ssh-authorize-pubkey.sh
PUB_LINE=""
if [[ -n "${OPSLY_SSH_PUB_LINE:-}" ]]; then
  PUB_LINE=$(printf '%s' "${OPSLY_SSH_PUB_LINE}" | tr -d '\r')
elif [[ $# -ge 1 ]]; then
  if [[ "$1" == "-" ]]; then
    PUB_LINE=$(tr -d '\r' | head -1)
  else
    [[ -f "$1" ]] || die "Archivo no encontrado: $1" 1
    PUB_LINE=$(tr -d '\r' <"$1" | head -1)
  fi
elif [[ ! -t 0 ]]; then
  PUB_LINE=$(tr -d '\r' | head -1)
else
  die "Uso: $0 <archivo.pub> | $0 - | echo 'ssh-ed25519 ...' | $0" 1
fi

[[ -n "${PUB_LINE// /}" ]] || die "Clave pública vacía" 1

if [[ ! "${PUB_LINE}" =~ ^(ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521|ssh-rsa)\  ]]; then
  die "La línea no parece una clave pública OpenSSH válida" 1
fi

AUTH="${HOME}/.ssh/authorized_keys"
install -d -m 700 "${HOME}/.ssh"
if [[ ! -f "${AUTH}" ]]; then
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: crearía ${AUTH}"
  else
    : >"${AUTH}"
    chmod 600 "${AUTH}"
  fi
else
  chmod 600 "${AUTH}" 2>/dev/null || true
fi

if [[ -f "${AUTH}" ]] && grep -Fxq "${PUB_LINE}" "${AUTH}" 2>/dev/null; then
  log_ok "La clave ya está en ${AUTH} (sin cambios)"
  exit 0
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "DRY-RUN: añadiría una línea a ${AUTH}"
  exit 0
fi

printf '%s\n' "${PUB_LINE}" >>"${AUTH}"
chmod 600 "${AUTH}"
log_ok "Clave pública añadida a ${AUTH}"
