#!/usr/bin/env bash
# Helper script for Peskids GHL workflow setup.
# Prints manual UI steps (GHL workflows are configured in the UI, not via API).
# Usage:
#   ./scripts/ghl-apply-workflows.sh           # dry-run (default)
#   ./scripts/ghl-apply-workflows.sh --dry-run # explicit
#   ./scripts/ghl-apply-workflows.sh --execute # open GHL URLs in browser
set -euo pipefail

DOC="docs/tenants/peskids/GHL-WORKFLOWS.md"
LOCATION_ID="${GOHIGHLEVEL_PESKIDS_LOCATION_ID:-KJ5LawrOOe3hIerqtMRu}"
BASE="https://app.gohighlevel.com/v2/location/${LOCATION_ID}"

MODE="${1:---dry-run}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Peskids — GHL Workflow Setup"
echo " Location: ${LOCATION_ID}"
echo " Doc:      ${DOC}"
echo " Mode:     ${MODE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Prerequisites ──────────────────────────────────────────────

echo "┌─ Prerequisites ──────────────────────────────────────────┐"
echo "│ 1. Pipeline configured: New Lead → Contacted → Trial     │"
echo "│    Class → Enrolled → Active Student → Renewal           │"
echo "│    URL: ${BASE}/opportunities/pipelines          │"
echo "│                                                          │"
echo "│ 2. Calendar \"Trial Class\" created                        │"
echo "│    URL: ${BASE}/settings/calendars                │"
echo "│                                                          │"
echo "│ 3. Email templates created (Marketing → Email Templates) │"
echo "│    - \"Peskids — Welcome Parent\"                          │"
echo "│    - \"Peskids — Trial Class Confirmation\"                │"
echo "│                                                          │"
echo "│ 4. SMS template created (Conversations → Templates)      │"
echo "│    - \"Peskids — Trial Reminder\"                          │"
echo "│                                                          │"
echo "│ 5. Owner email in GHL: sierrasantiago90@gmail.com        │"
echo "└──────────────────────────────────────────────────────────┘"
echo ""

# ── Workflows ──────────────────────────────────────────────────

WF_BASE="${BASE}/automation"
echo "Automation URL: ${WF_BASE}"
echo ""

cat_workflow() {
  local num="$1"
  local name="$2"
  local trigger="$3"
  local url="${WF_BASE}"

  echo "┌─ Workflow ${num}: ${name}"
  echo "│  Trigger: ${trigger}"
  echo "│  URL:     ${url}"
  echo "│"
  echo "│  Steps:"
  shift 3
  for step in "$@"; do
    echo "│    ${step}"
  done
  echo "└──────────────────────────────────────────────────────────"
  echo ""
}

cat_workflow \
  1 "Welcome Lead" "Contact Created (source != Internal)" \
  "1. Delay 2 min" \
  "2. Send Email → \"Peskids — Welcome Parent\"" \
  "3. Add Tag → welcome_sent" \
  "4. Pipeline Stage → Contacted"

cat_workflow \
  2 "Trial Confirmation" "Appointment Scheduled (calendar contains Trial)" \
  "1. Delay 1 min" \
  "2. Send Email → \"Peskids — Trial Class Confirmation\"" \
  "3. Add Tag → trial_confirmed" \
  "4. Pipeline Stage → Trial Class"

cat_workflow \
  3 "Trial Reminder" "Time-Based (24h before appointment)" \
  "1. Send SMS → \"Peskids — Trial Reminder\"" \
  "2. Add Tag → trial_reminded"

cat_workflow \
  4 "No-show Follow-up" "Appointment Status = No Show (calendar Trial)" \
  "1. Wait 1 hour" \
  "2. Send SMS → custom no-show text" \
  "3. Create Task → high priority, owner" \
  "4. Pipeline Stage → Contacted (back)"

cat_workflow \
  5 "Lead Stale Alert" "Time-Based (daily cron, 48h inactivity)" \
  "1. Check tag welcome_sent exists" \
  "2. Send Internal Notification → sierrasantiago90@gmail.com" \
  "3. Create Task → high priority follow-up"

# ── Execute mode ───────────────────────────────────────────────

if [ "${MODE}" = "--execute" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " Opening GHL automation page in browser..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  if command -v open &>/dev/null; then
    open "${WF_BASE}"
  elif command -v xdg-open &>/dev/null; then
    xdg-open "${WF_BASE}"
  else
    echo "No browser opener found. Open manually:"
    echo "  ${WF_BASE}"
  fi

  echo ""
  echo " After creating workflows in GHL UI, verify with:"
  echo "  doppler run --project ops-intcloudsysops --config prd -- \\"
  echo "    npx tsx scripts/ghl-peskids-operator-run.ts"
  echo ""
fi

# ── Summary ────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Next steps:"
echo "  1. Create all 5 workflows in GHL UI (Automation → Workflows)"
echo "  2. Create / verify email templates"
echo "  3. Create / verify SMS templates"
echo "  4. Run operator verification:"
echo "     doppler run --project ops-intcloudsysops --config prd -- \\"
echo "       npx tsx scripts/ghl-peskids-operator-run.ts"
echo "  5. E2E test: create test contact → verify emails fire"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
