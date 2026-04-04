#!/usr/bin/env bash
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"

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

check_env PLATFORM_ADMIN_TOKEN NEXT_PUBLIC_APP_URL
require_command jq curl

if [[ "${DRY_RUN}" -eq 1 ]]; then
  log_info "DRY RUN: GET ${NEXT_PUBLIC_APP_URL}/api/tenants?limit=500"
  log_info "DRY RUN: POST ${NEXT_PUBLIC_APP_URL}/api/tenants/{id}/suspend"
  exit 0
fi

LIST_JSON="$(
  curl -sS -G "${NEXT_PUBLIC_APP_URL}/api/tenants" \
    --data-urlencode "limit=500" \
    --data-urlencode "page=1" \
    -H "Authorization: Bearer ${PLATFORM_ADMIN_TOKEN}"
)"

TENANT_ID="$(
  echo "${LIST_JSON}" | jq -r --arg s "${SLUG}" '.data[]? | select(.slug == $s) | .id' | head -n 1
)"

if [[ -z "${TENANT_ID}" || "${TENANT_ID}" == "null" ]]; then
  log_error "Tenant not found for slug: ${SLUG}"
  exit 1
fi

RESPONSE="$(
  curl -sS -X POST \
    "${NEXT_PUBLIC_APP_URL}/api/tenants/${TENANT_ID}/suspend" \
    -H "Authorization: Bearer ${PLATFORM_ADMIN_TOKEN}"
)"

log_info "Suspend result for slug=${SLUG} id=${TENANT_ID}: ${RESPONSE}"
