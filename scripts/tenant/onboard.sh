#!/usr/bin/env bash
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"

SLUG=""
EMAIL=""
PLAN=""
STRIPE_ID=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)
      SLUG="${2:-}"
      shift 2
      ;;
    --email)
      EMAIL="${2:-}"
      shift 2
      ;;
    --plan)
      PLAN="${2:-}"
      shift 2
      ;;
    --stripe-customer-id)
      STRIPE_ID="${2:-}"
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

if [[ -z "${SLUG}" || -z "${EMAIL}" || -z "${PLAN}" ]]; then
  log_error "Required: --slug, --email, --plan"
  exit 1
fi

check_env PLATFORM_ADMIN_TOKEN NEXT_PUBLIC_APP_URL
require_command jq curl

if [[ -z "${STRIPE_ID}" ]]; then
  PAYLOAD="$(
    jq -n \
      --arg slug "${SLUG}" \
      --arg email "${EMAIL}" \
      --arg plan "${PLAN}" \
      '{
        slug: $slug,
        owner_email: $email,
        plan: $plan
      }'
  )"
else
  PAYLOAD="$(
    jq -n \
      --arg slug "${SLUG}" \
      --arg email "${EMAIL}" \
      --arg plan "${PLAN}" \
      --arg stripe_id "${STRIPE_ID}" \
      '{
        slug: $slug,
        owner_email: $email,
        plan: $plan,
        stripe_customer_id: $stripe_id
      }'
  )"
fi

if [[ "${DRY_RUN}" -eq 1 ]]; then
  log_info "DRY RUN: POST /api/tenants"
  log_info "Payload: ${PAYLOAD}"
  exit 0
fi

RESPONSE="$(
  curl -sS -X POST \
    "${NEXT_PUBLIC_APP_URL}/api/tenants" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${PLATFORM_ADMIN_TOKEN}" \
    -d "${PAYLOAD}"
)"

log_info "Response: ${RESPONSE}"
