#!/usr/bin/env bash
set -euo pipefail

_LIB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_LIB_ROOT}/common.sh"

compose_up() {
  local slug="${1:?slug required}"
  local compose_file="${2:?compose_file required}"
  log_info "compose up: slug=${slug} file=${compose_file}"
  docker compose -f "${compose_file}" up -d
}

compose_down() {
  local slug="${1:?slug required}"
  local compose_file="${2:?compose_file required}"
  log_info "compose down: slug=${slug} file=${compose_file}"
  docker compose -f "${compose_file}" down
}

compose_status() {
  local slug="${1:?slug required}"
  local compose_file="/opt/opsly/runtime/tenants//${slug}/docker-compose.yml"
  log_info "compose ps: slug=${slug}"
  docker compose -f "${compose_file}" ps
}

wait_healthy() {
  local slug="${1:?slug required}"
  local port="${2:?port required}"
  local max_attempts="${3:-12}"
  local attempt=1
  local url="http://127.0.0.1:${port}/healthz"

  log_info "wait_healthy: slug=${slug} port=${port} max_attempts=${max_attempts}"

  while [[ "${attempt}" -le "${max_attempts}" ]]; do
    if curl -sf --connect-timeout 2 --max-time 5 "${url}" >/dev/null 2>&1; then
      log_info "Health check OK: ${url} (attempt ${attempt})"
      return 0
    fi
    log_warn "Health check pending: ${url} (attempt ${attempt}/${max_attempts})"
    if [[ "${attempt}" -lt "${max_attempts}" ]]; then
      sleep 5
    fi
    attempt=$((attempt + 1))
  done

  log_error "Health check failed after ${max_attempts} attempts: ${url}"
  return 1
}
