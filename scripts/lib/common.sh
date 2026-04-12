#!/usr/bin/env bash
# Shared helpers for intcloudsysops scripts (sourced by main scripts; do not execute directly).

# --- ANSI (stderr only for log_error/warn; stdout for log_info when colored) ---
if [[ -t 2 ]]; then
  _C_RESET=$'\033[0m'
  _C_DIM=$'\033[2m'
  _C_RED=$'\033[31m'
  _C_YELLOW=$'\033[33m'
  _C_GREEN=$'\033[32m'
  _C_CYAN=$'\033[36m'
else
  _C_RESET=""
  _C_DIM=""
  _C_RED=""
  _C_YELLOW=""
  _C_GREEN=""
  _C_CYAN=""
fi

timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

log_info() {
  echo "${_C_GREEN}[$(timestamp)] INFO  ${_C_RESET}$*"
}

log_warn() {
  echo "${_C_YELLOW}[$(timestamp)] WARN  ${_C_RESET}$*" >&2
}

log_error() {
  echo "${_C_RED}[$(timestamp)] ERROR ${_C_RESET}$*" >&2
}

log_ok() {
  echo "${_C_CYAN}[$(timestamp)] OK    ${_C_RESET}$*"
}

# die MESSAGE [EXIT_CODE]  (default exit 1)
die() {
  local msg="${1:?}"
  local code="${2:-1}"
  log_error "${msg}"
  exit "${code}"
}

# require_env VAR... — exit 3 if any missing/empty
require_env() {
  local name
  for name in "$@"; do
    if [[ -z "${!name:-}" ]]; then
      log_error "Required environment variable is unset or empty: ${name}"
      exit 3
    fi
  done
}

# require_cmd CMD... — exit 2 if any missing from PATH
require_cmd() {
  local cmd
  for cmd in "$@"; do
    if ! command -v "${cmd}" >/dev/null 2>&1; then
      log_error "Required command not found in PATH: ${cmd}"
      exit 2
    fi
  done
}

# Idempotent dry-run flag for subshells
export DRY_RUN="${DRY_RUN:-false}"

# Skip interactive confirm (--yes from callers)
export ASSUME_YES="${ASSUME_YES:-false}"

# confirm PROMPT — returns 0 if yes; skip if ASSUME_YES=true or DRY_RUN=true
confirm() {
  local prompt="${1:?}"
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: would prompt confirm — ${prompt}"
    return 0
  fi
  if [[ "${ASSUME_YES}" == "true" ]]; then
    log_info "Non-interactive yes (--yes): ${prompt}"
    return 0
  fi
  local ans
  read -r -p "${prompt} [y/N] " ans || return 1
  [[ "${ans}" == "y" || "${ans}" == "Y" ]]
}

# run CMD [ARGS...] — print DRY-RUN line or execute
run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: $*"
    return 0
  fi
  "$@"
}

# Backward compatibility for older scripts (e.g. cleanup-demos.sh)
check_env() {
  require_env "$@"
}

require_command() {
  require_cmd "$@"
}
