#!/usr/bin/env bash
# Docker Compose helpers for tenant stacks under TENANTS_PATH.

_LIB_DOCKER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${_LIB_DOCKER}/common.sh"

compose_file_for_slug() {
  local slug="${1:?slug required}"
  if [[ -z "${TENANTS_PATH:-}" ]]; then
    log_error "TENANTS_PATH is not set"
    return 1
  fi
  echo "${TENANTS_PATH}/docker-compose.${slug}.yml"
}

stack_exists() {
  local slug="${1:?slug required}"
  local f
  f="$(compose_file_for_slug "${slug}")"
  [[ -f "${f}" ]]
}

stack_running() {
  local slug="${1:?slug required}"
  local f
  f="$(compose_file_for_slug "${slug}")"
  [[ -f "${f}" ]] || return 1
  require_cmd docker jq
  local json
  if ! json="$(docker compose -f "${f}" ps --format json 2>/dev/null)"; then
    return 1
  fi
  [[ -n "${json}" ]] || return 1
  # NDJSON (one object per line) -> array; require at least one service
  local ok
  ok="$(echo "${json}" | jq -s '
    (length > 0) and all(.[];
      (.State == "running") and
      (.Health == null or .Health == "" or .Health == "healthy")
    )
  ')"
  [[ "${ok}" == "true" ]]
}

compose_up() {
  local slug="${1:?slug required}"
  local f
  f="$(compose_file_for_slug "${slug}")"
  log_info "compose up: ${f}"
  run docker compose -f "${f}" up -d --remove-orphans
}

compose_stop() {
  local slug="${1:?slug required}"
  local f
  f="$(compose_file_for_slug "${slug}")"
  log_info "compose stop: ${f}"
  run docker compose -f "${f}" stop
}

compose_down() {
  local slug="${1:?slug required}"
  local f
  f="$(compose_file_for_slug "${slug}")"
  log_info "compose down: ${f}"
  run docker compose -f "${f}" down --remove-orphans
}

compose_ps() {
  local slug="${1:?slug required}"
  local f
  f="$(compose_file_for_slug "${slug}")"
  if [[ ! -f "${f}" ]]; then
    log_warn "No compose file for slug=${slug}"
    return 1
  fi
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: docker compose -f ${f} ps"
    return 0
  fi
  docker compose -f "${f}" ps
}

wait_healthy() {
  local slug="${1:?slug required}"
  local max_seconds="${2:-60}"
  local f
  f="$(compose_file_for_slug "${slug}")"
  [[ -f "${f}" ]] || die "Compose file missing for slug=${slug}" 1
  require_cmd docker jq

  local deadline=$((SECONDS + max_seconds))
  log_info "wait_healthy: slug=${slug} max_seconds=${max_seconds}"

  while [[ "${SECONDS}" -lt "${deadline}" ]]; do
    if stack_running "${slug}"; then
      log_info "All services healthy/running for slug=${slug}"
      return 0
    fi
    sleep 2
  done

  log_error "Timeout waiting for healthy stack: slug=${slug}"
  return 1
}
