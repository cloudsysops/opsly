#!/usr/bin/env bash
# Smoke: ICSO contact form lead capture (GHL path on peskids-review; Twenty after merge).
set -euo pipefail

BASE_URL="${ICSO_BASE_URL:-https://icso.op-sly.com}"
DRY_RUN=false
EXPECT_GHL="${ICSO_SMOKE_EXPECT_GHL:-false}"

usage() {
  cat <<'EOF'
Usage: ./scripts/icso/lead-capture-smoke.sh [--dry-run] [--base-url URL]

POST /api/leads with test payload. Passes on success:true + contactId.

  ICSO_SMOKE_EXPECT_GHL=true  — fail if response lacks contactId (GHL-era shape)

After feat/icso-twenty-crm merge, set TWENTY_SMOKE_EXPECT_IDS=true and use
scripts/tenants/twenty-crm-smoke.sh --tenant icso (Twenty smoke variant).
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

email="icso-smoke-$(date +%s)@example.com"
payload=$(cat <<JSON
{
  "name": "ICSO Smoke Test",
  "email": "${email}",
  "message": "Automated smoke test — safe to delete"
}
JSON
)

if [[ "$DRY_RUN" == true ]]; then
  echo "DRY RUN: POST ${BASE_URL}/api/leads"
  echo "${payload}"
  exit 0
fi

response="$(curl -sfk -X POST "${BASE_URL}/api/leads" \
  -H "Content-Type: application/json" \
  -d "${payload}")"

echo "${response}" | python3 -m json.tool 2>/dev/null || echo "${response}"

if ! echo "${response}" | grep -q '"success":true'; then
  echo "FAIL: expected success:true" >&2
  exit 1
fi

if [[ "$EXPECT_GHL" == "true" ]]; then
  if ! echo "${response}" | grep -q '"contactId"'; then
    echo "FAIL: expected contactId (GHL path)" >&2
    exit 1
  fi
fi

if [[ "${TWENTY_SMOKE_EXPECT_IDS:-false}" == "true" ]]; then
  if ! echo "${response}" | grep -q 'twentyPersonId'; then
    echo "FAIL: expected twentyPersonId (Twenty path — merge feat/icso-twenty-crm?)" >&2
    exit 1
  fi
fi

echo "PASS: ICSO lead capture smoke OK"
