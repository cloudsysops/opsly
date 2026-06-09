#!/usr/bin/env bash
# Print agency GHL manual UI checklist with deep links (read-only).
set -euo pipefail

LOC="${GOHIGHLEVEL_LOCATION_ID:-qD7Z9jt3owk0LMtKElow}"
INTEGRATION_ID="${GOHIGHLEVEL_PRIVATE_INTEGRATION_ID:-6a1e2b7830bb8f3a824f783a}"
BASE="https://app.gohighlevel.com/v2/location/${LOC}"

cat <<EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Intcloudsysops — GHL Manual UI (5 items)
 Location: ${LOC}
 Doc: docs/tenants/intcloudsysops/GHL-AGENCY-MANUAL-UI-CHECKLIST.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dashboard:     ${BASE}/dashboard
Integration:   ${BASE}/settings/private-integrations/${INTEGRATION_ID}

1) PIPELINE "Opsly Agency Sales"
   URL: ${BASE}/opportunities/pipelines
   Stages: New Lead → Contacted → Discovery → Proposal → Negotiation → Won → Lost

2) FORM "Opsly Agency Lead Capture"
   URL: ${BASE}/funnels-websites/funnels
   Fields: name*, email*, phone*, company, service_interest

3) EMAIL "Opsly — Welcome Lead"
   URL: ${BASE}/marketing/emails/templates
   Subject: Thanks for reaching out to Intcloudsysops
   Body: <p>We received your inquiry and will follow up shortly.</p>

4) EMAIL "Opsly — Discovery Call Confirmation"
   Subject: Your discovery call is scheduled
   Body: <p>Looking forward to learning about {{contact.company_name}}.</p>
   (fallback merge: {{contact.company}} or {{contact.client_company}})

5) SMS "Opsly — Discovery Reminder"
   URL: Conversations → Templates
   Text: Reminder: your Opsly discovery call is tomorrow.

After UI:
  ./scripts/ghl-provision-intcloudsysops.sh --execute
  ./scripts/validate-ghl-config.sh --tenant intcloudsysops

EOF
