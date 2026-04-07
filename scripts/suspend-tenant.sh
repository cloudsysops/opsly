#!/usr/bin/env bash
# Suspend a tenant: stop compose stack (preserve volumes) and mark suspended in Supabase.
#
# Required env:
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TENANTS_PATH
# Optional env:
#   DISCORD_WEBHOOK_URL
#
# Exit codes: 0 ok, 1 general error, 2 missing dependency, 3 missing env

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"
# shellcheck source=scripts/lib/docker-helpers.sh
source "${_SCRIPT_DIR}/lib/docker-helpers.sh"

export DRY_RUN="${DRY_RUN:-false}"
export ASSUME_YES="${ASSUME_YES:-false}"

SLUG=""
REASON=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)
      SLUG="${2:-}"
      shift 2
      ;;
    --reason)
      REASON="${2:-}"
      shift 2
      ;;
    --dry-run)
      export DRY_RUN=true
      shift
      ;;
    --yes)
      export ASSUME_YES=true
      shift
      ;;
    *)
      die "Unknown argument: $1" 1
      ;;
  esac
done

if [[ -z "${SLUG}" ]]; then
  die "Required: --slug" 1
fi

if [[ ! "${SLUG}" =~ ^[a-z0-9-]{3,30}$ ]]; then
  die "Invalid slug format" 1
fi

require_env SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY TENANTS_PATH
require_cmd curl jq docker
export TENANTS_PATH

notify_discord() {
  local text="$1"
  [[ -z "${DISCORD_WEBHOOK_URL:-}" ]] && return 0
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: Discord notify skipped"
    return 0
  fi
  curl -sS -X POST "${DISCORD_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg c "${text}" '{content: $c}')" >/dev/null || true
}

if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "DRY-RUN: GET ${SUPABASE_URL}/rest/v1/tenants?slug=eq.${SLUG}"
  log_info "DRY-RUN: confirm suspend (skipped in dry-run)"
  log_info "DRY-RUN: docker compose --project-name tenant_${SLUG} -f \${TENANTS_PATH}/docker-compose.${SLUG}.yml stop"
  log_info "DRY-RUN: PATCH tenant status=suspended"
  log_info "DRY-RUN: Discord notify (if DISCORD_WEBHOOK_URL set)"
  exit 0
fi

ROW_JSON="$(
  curl -sS -G "${SUPABASE_URL}/rest/v1/tenants" \
    --data-urlencode "slug=eq.${SLUG}" \
    --data-urlencode "select=id,slug,status" \
    --data-urlencode "deleted_at=is.null" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Accept-Profile: platform"
)"

if ! echo "${ROW_JSON}" | jq -e 'length > 0' >/dev/null 2>&1; then
  die "Tenant not found: ${SLUG}" 1
fi

STATUS="$(echo "${ROW_JSON}" | jq -r '.[0].status')"
if [[ "${STATUS}" != "active" ]]; then
  if [[ "${STATUS}" == "suspended" ]]; then
    log_info "Tenant ${SLUG} already suspended; idempotent exit."
    exit 0
  fi
  die "Tenant ${SLUG} is not active (status=${STATUS})" 1
fi

TENANT_ID="$(echo "${ROW_JSON}" | jq -r '.[0].id')"

if ! confirm "¿Suspender tenant ${SLUG}?"; then
  die "Aborted by user" 1
fi

compose_stop "${SLUG}"

PATCH_BODY='{"status":"suspended"}'
PATCH_RESP="$(
  curl -sS -X PATCH "${SUPABASE_URL}/rest/v1/tenants?id=eq.${TENANT_ID}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Accept-Profile: platform" \
    -H "Content-Profile: platform" \
    -d "${PATCH_BODY}"
)"

if [[ -n "${PATCH_RESP}" ]] && echo "${PATCH_RESP}" | jq -e . >/dev/null 2>&1; then
  if echo "${PATCH_RESP}" | jq -e '.code' >/dev/null 2>&1; then
    die "Supabase PATCH failed: ${PATCH_RESP}" 1
  fi
fi

MSG="Suspended tenant **${SLUG}**"
if [[ -n "${REASON}" ]]; then
  MSG+=" — ${REASON}"
fi
notify_discord "${MSG}"

log_info "Tenant ${SLUG} suspended (compose stop, DB status=suspended)."
