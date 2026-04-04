#!/usr/bin/env bash
set -euo pipefail

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log_info() {
  echo "[$(timestamp)] INFO  $*"
}

log_warn() {
  echo "[$(timestamp)] WARN  $*" >&2
}

log_error() {
  echo "[$(timestamp)] ERROR $*" >&2
}

check_env() {
  local name
  for name in "$@"; do
    if [[ -z "${!name:-}" ]]; then
      log_error "Required environment variable is unset or empty: ${name}"
      exit 1
    fi
  done
}

is_dry_run() {
  local arg
  for arg in "$@"; do
    if [[ "${arg}" == "--dry-run" ]]; then
      return 0
    fi
  done
  return 1
}

require_command() {
  local cmd
  for cmd in "$@"; do
    if ! command -v "${cmd}" >/dev/null 2>&1; then
      log_error "Required command not found in PATH: ${cmd}"
      exit 1
    fi
  done
}
