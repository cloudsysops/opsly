#!/usr/bin/env bash
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/../lib/common.sh"

SLUG=""
EMAIL=""
PLAN=""
STRIPE_ID=""
DRY_RUN=0
TENANT_TYPE="default"

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
    --tenant-type)
      TENANT_TYPE="${2:-default}"
      shift 2
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
  log_info "TENANT_TYPE: ${TENANT_TYPE}"
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

if [[ "${TENANT_TYPE}" == "technician" ]]; then
  TECH_META_FILE="${_SCRIPT_DIR}/../../config/technician-tenant/cloudsysops.metadata.json"
  if [[ ! -f "${TECH_META_FILE}" ]]; then
    log_error "Missing metadata template: ${TECH_META_FILE}"
    exit 1
  fi
  TENANT_ID="$(echo "${RESPONSE}" | jq -r '.id // empty')"
  if [[ -z "${TENANT_ID}" || "${TENANT_ID}" == "null" ]]; then
    log_error "technician post-steps: could not read .id from POST /api/tenants response"
    exit 1
  fi
  PATCH_BODY="$(jq -n --argjson meta "$(jq -c . "${TECH_META_FILE}")" '{metadata: $meta}')"
  log_info "PATCH /api/tenants/${TENANT_ID} (technician metadata)"
  PATCH_RES="$(
    curl -sS -X PATCH \
      "${NEXT_PUBLIC_APP_URL}/api/tenants/${TENANT_ID}" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${PLATFORM_ADMIN_TOKEN}" \
      -d "${PATCH_BODY}"
  )"
  log_info "PATCH response: ${PATCH_RES}"
  SEED_BODY="$(jq -n --arg s "${SLUG}" '{slug: $s}')"
  log_info "POST /api/admin/local-services/technician-seed"
  SEED_RES="$(
    curl -sS -X POST \
      "${NEXT_PUBLIC_APP_URL}/api/admin/local-services/technician-seed" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${PLATFORM_ADMIN_TOKEN}" \
      -d "${SEED_BODY}"
  )"
  log_info "Seed response: ${SEED_RES}"
fi
