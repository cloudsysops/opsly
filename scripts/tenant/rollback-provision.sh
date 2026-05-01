#!/usr/bin/env bash
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${_SCRIPT_DIR}/../lib/common.sh"

TENANT_ID=""
TENANT_SLUG=""
STEP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant-id)
      TENANT_ID="${2:-}"
      shift 2
      ;;
    --slug)
      TENANT_SLUG="${2:-}"
      shift 2
      ;;
    --from-step)
      STEP="${2:-0}"
      shift 2
      ;;
    *)
      log_error "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ -z "${TENANT_ID}" ]] || [[ -z "${TENANT_SLUG}" ]]; then
  log_error "Required: --tenant-id and --slug"
  exit 1
fi

log_info "Starting rollback for tenant '${TENANT_SLUG}' from step ${STEP}"

if [[ ${STEP} -ge 5 ]]; then
  TENANTS_DIR="${PLATFORM_TENANTS_DIR:-/opt/opsly/runtime/tenants}"
  TENANT_DIR="${TENANTS_DIR}/${TENANT_SLUG}"
  COMPOSE_FILE="${TENANT_DIR}/docker-compose.yml"

  if [[ -f "${COMPOSE_FILE}" ]]; then
    docker compose -f "${COMPOSE_FILE}" down &>/dev/null || log_warn "Failed to stop services"
  fi
fi

log_info "Rollback complete for tenant '${TENANT_SLUG}'"
