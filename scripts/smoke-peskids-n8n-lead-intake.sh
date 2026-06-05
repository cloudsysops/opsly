#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${N8N_WEBHOOK_BASE_URL:-https://n8n-peskids.op-sly.com/webhook}"
WEBHOOK_URL="${N8N_LEAD_INTAKE_URL:-${BASE_URL%/}/peskids-lead-intake}"
REQUEST_ID="smoke-peskids-lead-intake-$(date +%s)"
TMP_BODY="$(mktemp)"
trap 'rm -f "$TMP_BODY"' EXIT

PAYLOAD='{
  "event_id": "'"$REQUEST_ID"'",
  "event_type": "lead.created",
  "tenant_slug": "peskids",
  "source": "gohighlevel",
  "lead_id": "lead-smoke-001",
  "stage": "New Lead",
  "lead": {
    "parent_name": "Smoke Test Parent",
    "phone": "+573001112233",
    "email": "smoke@example.com",
    "child_name": "Smoke Student",
    "age": 8,
    "interest": "Trial class"
  },
  "automation": {
    "welcome_message": true,
    "reminder": true,
    "trial_class_invitation": true
  },
  "next_actions": ["welcome_message", "reminder", "trial_class_invitation"]
}'

code="$(
  curl -sk -o "$TMP_BODY" -w '%{http_code}' \
    -X POST "$WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -H "x-request-id: $REQUEST_ID" \
    -d "$PAYLOAD" || true
)"

echo "POST $WEBHOOK_URL → HTTP $code"

if [[ "$code" == "404" ]]; then
  echo "ERROR: n8n lead intake webhook is not published" >&2
  cat "$TMP_BODY" >&2 || true
  exit 1
fi

if [[ "$code" != "200" && "$code" != "202" ]]; then
  echo "ERROR: unexpected status for Peskids lead intake webhook" >&2
  cat "$TMP_BODY" >&2 || true
  exit 1
fi

cat "$TMP_BODY"
echo
echo "ok   Peskids lead intake webhook reachable"
