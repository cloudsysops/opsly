#!/usr/bin/env bash
# Punto único de entrada para «maintain» en un host (VPS, worker Mac/Linux, o dev).
# Lo usa opsly-disk-maintain-fanout.sh vía SSH y puede invocarse a mano.
#
# Orden de resolución:
#  1) VPS: /opt/opsly/scripts/vps-cleanup-robust.sh --light
#  2) ~/bin/opsly-maintain (wrapper local del operador)
#  3) Repo: scripts/mac2011-cleanup-robust.sh junto a este script
#
# Uso:
#   ./scripts/opsly-maintain-remote.sh [--dry-run]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

DRY_RUN="${DRY_RUN:-false}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN="true" ;;
    -h | --help)
      grep '^#' "$0" | head -12
      exit 0
      ;;
    *) die "Opción desconocida: $1" 1 ;;
  esac
  shift
done

VPS_SCRIPT="/opt/opsly/scripts/vps-cleanup-robust.sh"
MAC_SCRIPT="${SCRIPT_DIR}/mac2011-cleanup-robust.sh"
USER_WRAPPER="${HOME}/bin/opsly-maintain"

if [[ -f "${VPS_SCRIPT}" ]]; then
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: sudo ${VPS_SCRIPT} --light"
    exit 0
  fi
  if [[ "$(id -u)" -eq 0 ]]; then
    exec "${VPS_SCRIPT}" --light
  fi
  exec sudo "${VPS_SCRIPT}" --light
fi

if [[ -x "${USER_WRAPPER}" ]]; then
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: ${USER_WRAPPER}"
    exit 0
  fi
  exec "${USER_WRAPPER}"
fi

if [[ -f "${MAC_SCRIPT}" ]]; then
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: ${MAC_SCRIPT}"
    exit 0
  fi
  exec bash "${MAC_SCRIPT}"
fi

log_error "No se encontró ningún handler de mantenimiento (VPS / ~/bin/opsly-maintain / mac2011-cleanup-robust)."
exit 2
