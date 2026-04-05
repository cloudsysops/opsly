#!/usr/bin/env bash
# Helpers for tools/usb-kit scripts (sourced only; portable dentro del repo o clon en USB).

set -euo pipefail

export DRY_RUN="${DRY_RUN:-false}"

log_info() {
  echo "[usb-kit] $*"
}

log_warn() {
  echo "[usb-kit] WARN: $*" >&2
}

die() {
  echo "[usb-kit] ERROR: ${1:?}" >&2
  exit "${2:-1}"
}

require_cmd() {
  local c
  for c in "$@"; do
    if ! command -v "${c}" >/dev/null 2>&1; then
      die "Comando no encontrado en PATH: ${c}" 2
    fi
  done
}

# Resuelve raíz del repo buscando config/opsly.config.json hacia arriba desde USB_KIT_DIR.
usb_resolve_repo_root() {
  local d="${USB_KIT_DIR:?USB_KIT_DIR no definido}"
  local i=0
  while [[ "${d}" != "/" && "${i}" -lt 12 ]]; do
    if [[ -f "${d}/config/opsly.config.json" ]]; then
      REPO_ROOT="${d}"
      export REPO_ROOT
      CONFIG_JSON="${REPO_ROOT}/config/opsly.config.json"
      export CONFIG_JSON
      return 0
    fi
    d="$(dirname "${d}")"
    i=$((i + 1))
  done
  return 1
}

read_cfg() {
  require_cmd jq
  jq -r "${1:?}" "${CONFIG_JSON}"
}

run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: $*"
    return 0
  fi
  "$@"
}
