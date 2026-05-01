#!/usr/bin/env bash
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${_SCRIPT_DIR}/../lib/common.sh"

SLUG=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)
      SLUG="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      log_error "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ -z "${SLUG}" ]]; then
  log_error "Required: --slug"
  exit 1
fi

TENANTS_DIR="${PLATFORM_TENANTS_DIR:-/opt/opsly/runtime/tenants}"
TENANT_DIR="${TENANTS_DIR}/${SLUG}"

log_info "Cleanup resources for tenant: ${SLUG}"

if [[ "${DRY_RUN}" -eq 1 ]]; then
  log_info "DRY RUN: Would clean up tenant ${SLUG}"
  exit 0
fi

if [[ -f "${TENANT_DIR}/docker-compose.yml" ]]; then
  docker compose -f "${TENANT_DIR}/docker-compose.yml" down || log_warn "Failed to stop containers"
fi

if [[ -d "${TENANT_DIR}" ]]; then
  rm -rf "${TENANT_DIR}"
  log_info "Removed tenant directory: ${TENANT_DIR}"
fi

log_info "Cleanup complete for tenant: ${SLUG}"
