#!/usr/bin/env bash
# Smoke: Peskids lead capture returns Twenty IDs when CRM is configured.
set -euo pipefail

BASE_URL="${PESKIDS_BASE_URL:-https://peskids.op-sly.com}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/peskids/twenty-crm-smoke.sh [--dry-run] [--base-url URL]

POSTs a test lead (with consent) and checks response shape.
Does not assert twenty_person_id unless TWENTY_SMOKE_EXPECT_IDS=true.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --base-url) BASE_URL="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

email="twenty-smoke-$(date +%s)@example.com"
payload=$(cat <<JSON
{
  "name": "Twenty Smoke Test",
  "email": "${email}",
  "phone": "3000000000",
  "class_modality": "llanogrande",
  "neighborhood": "Llanogrande",
  "grade_interested": "K-5",
  "consent_treatment": true,
  "consent_marketing": false
}
JSON
)

if [[ "${DRY_RUN}" == true ]]; then
  echo "DRY RUN: POST ${BASE_URL}/api/leads"
  echo "${payload}"
  exit 0
fi

response="$(curl -sfk -X POST "${BASE_URL}/api/leads" \
  -H "Content-Type: application/json" \
  -H "x-request-id: twenty-smoke-$(date +%s)" \
  -d "${payload}")"

echo "${response}" | python3 -m json.tool 2>/dev/null || echo "${response}"

if ! echo "${response}" | grep -q '"ok":true'; then
  echo "FAIL: lead endpoint did not return ok:true" >&2
  exit 1
fi

if [[ "${TWENTY_SMOKE_EXPECT_IDS:-false}" == "true" ]]; then
  if ! echo "${response}" | grep -q 'twenty_person_id'; then
    echo "FAIL: expected twenty_person_id in response (set TWENTY_API_* in prod)" >&2
    exit 1
  fi
fi

echo "PASS: lead capture smoke OK"
