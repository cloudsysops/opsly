#!/usr/bin/env bash
# Growth Week 1 Agencias Outreach Automation
#
# Loads tier-1 agencias contacts, generates personalized emails, sends via Resend.
# Tracks: timestamp, recipient, template_version, delivery_status
#
# Usage:
#   doppler run --project ops-intcloudsysops --config prd -- ./scripts/growth-outreach.sh [--dry-run]
#
# Requires:
#   - RESEND_API_KEY (from Doppler)
#   - data/growth/tier1-targets.json (contact list)
#   - PLATFORM_ADMIN_TOKEN (optional, for auth verification)

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"

# Configuration
DATA_DIR="${_SCRIPT_DIR}/../data/growth"
TARGETS_FILE="${DATA_DIR}/tier1-targets.json"
LOGS_DIR="${_SCRIPT_DIR}/../runtime/logs/growth"
LOG_FILE="${LOGS_DIR}/week-1-outreach.log"
SYSTEM_STATE="${_SCRIPT_DIR}/../runtime/context/system_state.json"

# API endpoint (localhost for local dev, needs to be accessible)
API_BASE_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000}"

# Resend configuration
RESEND_API_KEY="${RESEND_API_KEY:-}"
RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL:-growth@ops.smiletripcare.com}"
TEST_MODE="${TEST_MODE:-false}"
TEST_EMAIL="cboteros1@gmail.com"

# Flags
DRY_RUN="${1:-}"
BATCH_SIZE=5
TEMPLATE_VERSION="1.0"
DEMO_LINK="https://ops.smiletripcare.com/demo"

# --- Validations ---

if [[ -z "${RESEND_API_KEY}" ]]; then
  log_error "RESEND_API_KEY not set. Load via: doppler run --project ops-intcloudsysops --config prd"
  exit 1
fi

if [[ ! -f "${TARGETS_FILE}" ]]; then
  log_error "Targets file not found: ${TARGETS_FILE}"
  exit 1
fi

if [[ ! -d "${LOGS_DIR}" ]]; then
  mkdir -p "${LOGS_DIR}"
fi

# --- Initialize Log ---

log_info "========================================="
log_info "Growth Week 1 Agencias Outreach"
log_info "========================================="
log_info "Targets file: ${TARGETS_FILE}"
log_info "Log file: ${LOG_FILE}"
log_info "Dry run: ${DRY_RUN:-false}"
log_info "=========================================\n"

{
  echo "========================================="
  echo "Growth Week 1 Outreach Campaign"
  echo "========================================="
  echo "Started: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Dry run: ${DRY_RUN:-false}"
  echo "=========================================\n"
} > "${LOG_FILE}"

# --- Read Targets ---

if ! TARGETS=$(jq '.' "${TARGETS_FILE}" 2>/dev/null); then
  log_error "Failed to parse targets JSON: ${TARGETS_FILE}"
  exit 1
fi

TARGET_COUNT=$(echo "${TARGETS}" | jq 'length')
log_info "Loaded ${TARGET_COUNT} target contacts from ${TARGETS_FILE}"

# --- Process Each Contact ---

SENT_COUNT=0
FAILED_COUNT=0
SKIPPED_COUNT=0

for idx in $(seq 0 $((TARGET_COUNT - 1))); do
  TARGET=$(echo "${TARGETS}" | jq ".[$idx]")

  NAME=$(echo "${TARGET}" | jq -r '.name // "Unknown"')
  EMAIL=$(echo "${TARGET}" | jq -r '.email // ""')
  COMPANY=$(echo "${TARGET}" | jq -r '.company // ""')
  SPECIALIZATION=$(echo "${TARGET}" | jq -r '.specialization // "workflows"')

  if [[ -z "${EMAIL}" ]]; then
    log_warn "Contact ${idx}: missing email for '${NAME}', skipping"
    ((SKIPPED_COUNT++))
    continue
  fi

  log_info "[${idx}/${TARGET_COUNT}] Processing: ${NAME} <${EMAIL}> (${SPECIALIZATION})"

  # --- Generate Personalized Email ---

  SUBJECT="Hey ${NAME}, Opsly automates your ${SPECIALIZATION} workflows"

  BODY="Hi ${NAME},

I've been following what ${COMPANY} does, and I think Opsly could save your team significant time on ${SPECIALIZATION} workflows.

We work with agencies like yours to automate repetitive tasks—everything from lead qualification to client onboarding. The result? Your team focuses on high-impact work, not manual processes.

Here's what we've seen:
- 40+ hours/month saved per team member
- 70% faster client onboarding
- Fewer manual errors

Would you be open to a 15-min demo? I'd love to show you how Opsly could fit into your workflow.

Demo link: ${DEMO_LINK}
(Or reply to this email—happy to work around your schedule)

Best,
Opsly Growth Team"

  # --- Send via Resend (or dry-run) ---

  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  DELIVERY_STATUS="pending"

  if [[ -z "${DRY_RUN}" ]]; then
    # Actually send the email (use jq to safely escape JSON)
    # In TEST_MODE, send to test email instead of actual recipient
    SEND_TO="${EMAIL}"
    if [[ "${TEST_MODE}" == "true" ]]; then
      SEND_TO="${TEST_EMAIL}"
      log_info "[TEST_MODE] Will send to ${TEST_EMAIL} instead of ${EMAIL}"
    fi

    PAYLOAD=$(jq -n \
      --arg from "${RESEND_FROM_EMAIL}" \
      --arg to "${SEND_TO}" \
      --arg subject "${SUBJECT}" \
      --arg text "${BODY}" \
      --arg reply_to "growth@opsly.io" \
      '{from: $from, to: $to, subject: $subject, text: $text, reply_to: $reply_to}')

    RESEND_RESPONSE=$(curl -s -X POST "https://api.resend.com/emails" \
      -H "Authorization: Bearer ${RESEND_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "${PAYLOAD}")

    # Parse response
    EMAIL_ID=$(echo "${RESEND_RESPONSE}" | jq -r '.id // .error // "unknown"' 2>/dev/null || echo "unknown")

    if echo "${RESEND_RESPONSE}" | jq -e '.id' >/dev/null 2>&1; then
      DELIVERY_STATUS="sent"
      log_ok "Email sent: ${EMAIL_ID}"
      ((SENT_COUNT++))
    else
      DELIVERY_STATUS="failed"
      ERROR_MSG=$(echo "${RESEND_RESPONSE}" | jq -r '.message // "Unknown error"' 2>/dev/null || echo "Unknown error")
      log_error "Failed to send to ${EMAIL}: ${ERROR_MSG}"
      ((FAILED_COUNT++))
    fi
  else
    # Dry-run: just log what would be sent
    log_info "[DRY-RUN] Would send email: ${SUBJECT}"
    DELIVERY_STATUS="dry-run"
    EMAIL_ID="dry-run-${idx}"
    ((SENT_COUNT++))
  fi

  # --- Log Result ---

  {
    echo "[${TIMESTAMP}] TARGET_${idx}"
    echo "  Name: ${NAME}"
    echo "  Email: ${EMAIL}"
    echo "  Company: ${COMPANY}"
    echo "  Specialization: ${SPECIALIZATION}"
    echo "  Subject: ${SUBJECT}"
    echo "  Template Version: ${TEMPLATE_VERSION}"
    echo "  Status: ${DELIVERY_STATUS}"
    echo "  Email ID: ${EMAIL_ID}"
    echo ""
  } >> "${LOG_FILE}"

  # Throttle requests to avoid rate limiting
  if [[ -z "${DRY_RUN}" ]] && [[ $((( idx + 1) % BATCH_SIZE)) -eq 0 ]]; then
    log_info "Batch of ${BATCH_SIZE} sent, waiting 2 seconds before next batch..."
    sleep 2
  fi
done

# --- Summary ---

log_info "\n========================================="
log_ok "Campaign Summary:"
log_ok "  Total contacts: ${TARGET_COUNT}"
log_ok "  Sent/Processed: ${SENT_COUNT}"
log_error "  Failed: ${FAILED_COUNT}"
log_warn "  Skipped: ${SKIPPED_COUNT}"
log_info "========================================="

{
  echo ""
  echo "========================================="
  echo "Campaign Summary"
  echo "========================================="
  echo "Completed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Total contacts: ${TARGET_COUNT}"
  echo "Sent/Processed: ${SENT_COUNT}"
  echo "Failed: ${FAILED_COUNT}"
  echo "Skipped: ${SKIPPED_COUNT}"
  echo "Dry run: ${DRY_RUN:-false}"
  echo "=========================================\n"
} >> "${LOG_FILE}"

# --- Update system_state.json ---

if [[ -f "${SYSTEM_STATE}" ]]; then
  # Update growth_experiments with actual results
  UPDATED_STATE=$(jq \
    --arg status "$([ -z "${DRY_RUN}" ] && echo 'completed' || echo 'dry-run')" \
    --arg count "${SENT_COUNT}" \
    '.growth_experiments.week_1.status = $status |
     .growth_experiments.week_1.outreach_count = ($count | tonumber) |
     .growth_experiments.week_1.last_run = now | floor |
     .last_updated = now | floor | todate' \
    "${SYSTEM_STATE}")

  echo "${UPDATED_STATE}" > "${SYSTEM_STATE}"
  log_ok "Updated system_state.json"
else
  log_warn "system_state.json not found at ${SYSTEM_STATE}"
fi

log_info "\nFull log: ${LOG_FILE}"

exit 0
