#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/tenants/suggest-vertical-blueprint.sh --vertical <name> [--json]

Prints the recommended Opsly tenant bootstrap shape for a vertical.
Read-only, idempotent, and safe to rerun.
EOF
}

vertical=""
json_output="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --vertical)
      vertical="${2:-}"
      shift 2
      ;;
    --json)
      json_output="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$vertical" ]]; then
  echo "Missing required --vertical <name>" >&2
  usage >&2
  exit 1
fi

normalize_vertical() {
  local value
  value="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  value="${value//á/a}"
  value="${value//é/e}"
  value="${value//í/i}"
  value="${value//ó/o}"
  value="${value//ú/u}"
  value="${value//ñ/n}"
  echo "$value"
}

v="$(normalize_vertical "$vertical")"

pattern_ids=("full-tenant-stack" "crm-starter-stack")
first_workflow="lead capture → follow-up → weekly digest"
first_dashboard="leads, pending follow-up, recent feedback"
first_automation="one reminder when a lead goes stale"
manual_step="create the first Twenty admin/API key once"
notes="Start with the shared tenant base; do not invent a new control plane."

case "$v" in
  barber|barberia|barbershop)
    first_workflow="booking link or form → lead → reminder"
    first_dashboard="appointments today, new leads, no-shows"
    first_automation="remind the team about unattended appointments"
    notes="Focus on repeat visits and low-friction booking."
    ;;
  restaurant|restaurante|restaurants)
    first_workflow="reservation or QR feedback → manager notification"
    first_dashboard="reservations, feedback this week, unanswered messages"
    first_automation="daily summary of feedback and pending responses"
    notes="Keep POS out of the MVP."
    ;;
  hotel|hoteles|hotelero|hotelier)
    first_workflow="inquiry → lead → booking follow-up"
    first_dashboard="new inquiries, reservations in flight, recent reviews"
    first_automation="follow-up when a reservation inquiry stalls"
    notes="Avoid a full booking engine on day 1."
    ;;
  sales|ventas|agency|agencia|consulting|consultoria)
    first_workflow="inbound lead → CRM → follow-up"
    first_dashboard="pipeline, overdue tasks, cold leads"
    first_automation="stale-lead reminder and weekly report"
    notes="Use Twenty + Supabase as the commercial base."
    ;;
  marketplace|marketplaces)
    first_workflow="seller onboarding → review → activation"
    first_dashboard="new sellers, pending listings, open tickets"
    first_automation="remind if onboarding is incomplete"
    notes="Validate the seller flow before expanding categories."
    ;;
esac

if [[ "$json_output" == "true" ]]; then
  cat <<EOF
{
  "vertical": "$vertical",
  "normalized": "$v",
  "pattern_ids": ["${pattern_ids[0]}", "${pattern_ids[1]}"],
  "first_workflow": "$first_workflow",
  "first_dashboard": "$first_dashboard",
  "first_automation": "$first_automation",
  "manual_step": "$manual_step",
  "notes": "$notes"
}
EOF
  exit 0
fi

cat <<EOF
Vertical blueprint suggestion
-----------------------------
vertical: ${vertical}
pattern_ids: ${pattern_ids[*]}
first workflow: ${first_workflow}
first dashboard: ${first_dashboard}
first automation: ${first_automation}
manual step: ${manual_step}
notes: ${notes}
EOF
