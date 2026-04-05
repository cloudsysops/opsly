#!/usr/bin/env bash
# Abre SSH al VPS usando opsly.config.json o pen.local.json / OPSLY_SSH_TARGET.
# Uso: ./pen-ssh-vps.sh [--dry-run] -- [args extra para ssh]
# Ejemplo: ./pen-ssh-vps.sh -- -t 'cd /opt/opsly && bash -l'
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export USB_KIT_DIR="${SCRIPT_DIR}"
# shellcheck source=tools/usb-kit/lib/usb-common.sh
source "${SCRIPT_DIR}/lib/usb-common.sh"

PASSTHRU=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      export DRY_RUN=true
      shift
      ;;
    --help|-h)
      echo "Uso: $0 [--dry-run] [--] [argumentos para ssh, ej. whoami o -t 'cd /opt/opsly && bash -l']"
      exit 0
      ;;
    --)
      shift
      PASSTHRU=("$@")
      break
      ;;
    *)
      PASSTHRU=("$@")
      break
      ;;
  esac
done

require_cmd ssh

TARGET=""
LOCAL_CFG="${SCRIPT_DIR}/pen.local.json"
if [[ -n "${OPSLY_SSH_TARGET:-}" ]]; then
  TARGET="${OPSLY_SSH_TARGET}"
elif [[ -f "${LOCAL_CFG}" ]]; then
  require_cmd jq
  t="$(jq -r '.ssh.target // empty' "${LOCAL_CFG}")"
  if [[ -n "${t}" && "${t}" != "null" ]]; then
    TARGET="${t}"
  fi
fi

if [[ -n "${TARGET}" ]]; then
  log_info "SSH target: ${TARGET} (pen.local.json o OPSLY_SSH_TARGET)"
else
  usb_resolve_repo_root || die "Sin repo ni pen.local.json con ssh.target" 1
  require_cmd jq
  user="$(read_cfg '.infrastructure.vps_user')"
  ip="$(read_cfg '.infrastructure.vps_ip')"
  TARGET="${user}@${ip}"
  log_info "SSH target: ${TARGET} (desde opsly.config.json)"
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "DRY-RUN: ssh ${TARGET} ${PASSTHRU[*]:-}"
  exit 0
fi

exec ssh "${TARGET}" "${PASSTHRU[@]}"
