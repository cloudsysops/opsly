#!/usr/bin/env bash
# Ayuda a identificar discos: en macOS (diskutil) o Linux (lsblk).
# Referencia de equipo: instalador Ubuntu suele estar en disk3 (macOS); en Linux usar lsblk.
#
# Uso: ./pen-hint-disks.sh [--dry-run]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export USB_KIT_DIR="${SCRIPT_DIR}"
# shellcheck source=tools/usb-kit/lib/usb-common.sh
source "${SCRIPT_DIR}/lib/usb-common.sh"

for a in "$@"; do
  case "${a}" in
    --dry-run) export DRY_RUN=true ;;
    --help|-h)
      echo "Uso: $0 [--dry-run]"
      exit 0
      ;;
    *) die "Argumento desconocido: ${a}" 1 ;;
  esac
done

log_info "En macOS, el instalador booteable Ubuntu suele aparecer como disk3 (verificar con diskutil)."
log_info "En Linux tras arrancar, identifica el USB con lsblk (TYPE disk/part, MOUNTPOINT)."

os="$(uname -s)"

if [[ "${DRY_RUN}" == "true" ]]; then
  if [[ "${os}" == "Darwin" ]]; then
    run diskutil list
  else
    run lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT
  fi
  exit 0
fi

if [[ "${os}" == "Darwin" ]]; then
  require_cmd diskutil
  diskutil list
else
  require_cmd lsblk
  lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT
fi
