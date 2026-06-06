#!/usr/bin/env bash
# Public smoke for Peskids go-live/demo readiness.
# Default: validates public reservation route only.
# Optional: set POST_LEAD=1 to submit a real lead payload to /api/leads.

set -euo pipefail

BASE_URL="${BASE_URL:-https://peskids.op-sly.com}"
POST_LEAD="${POST_LEAD:-0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="${2:-}"
      shift 2
      ;;
    --post)
      POST_LEAD="1"
      shift
      ;;
    -h | --help)
      cat <<'EOF'
Usage: scripts/peskids-public-go-live-smoke.sh [--base-url URL] [--post]

Checks:
  1. GET /reserva-clase-gratuita
  2. Optional POST /api/leads if --post is passed
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "${BASE_URL}" ]]; then
  echo "BASE_URL cannot be empty" >&2
  exit 2
fi

echo "🔍 Peskids public go-live smoke"
echo "  Base URL: ${BASE_URL}"

page_body="$(mktemp)"
trap 'rm -f "${page_body}" "${lead_body:-}" "${lead_resp:-}"' EXIT

echo "✓ Test 1: GET /reserva-clase-gratuita"
http_code="$(
  curl -sk -o "${page_body}" -w "%{http_code}" "${BASE_URL}/reserva-clase-gratuita"
)"
if [[ "${http_code}" != "200" ]]; then
  echo "❌ GET /reserva-clase-gratuita → HTTP ${http_code}" >&2
  exit 1
fi
if ! grep -qi "Clase de prueba gratis" "${page_body}"; then
  echo "❌ GET /reserva-clase-gratuita returned 200 but did not include the expected reservation copy" >&2
  exit 1
fi

echo "✓ Reservation page is public and reachable"

if [[ "${POST_LEAD}" == "1" ]]; then
  echo "✓ Test 2: POST /api/leads (optional)"
  lead_body="$(mktemp)"
  lead_resp="$(mktemp)"
  cat >"${lead_body}" <<'JSON'
{
  "name": "Smoke Test GHL",
  "email": "smoke-ghl@example.com",
  "phone": "+573000000000",
  "class_modality": "llanogrande",
  "neighborhood": "Llanogrande",
  "grade_interested": "K-5",
  "referral_source": "Website",
  "consent_treatment": true,
  "consent_marketing": false,
  "consent_policy_version": "pk-parental-v1+pk-privacy-v1@1.0"
}
JSON
  lead_code="$(
    curl -sk -o "${lead_resp}" -w "%{http_code}" \
      -X POST "${BASE_URL}/api/leads" \
      -H "Content-Type: application/json" \
      -d @"${lead_body}"
  )"
  if [[ "${lead_code}" != "201" && "${lead_code}" != "200" ]]; then
    echo "❌ POST /api/leads → HTTP ${lead_code}" >&2
    cat "${lead_resp}" >&2 || true
    exit 1
  fi
  echo "✓ POST /api/leads returned HTTP ${lead_code}"
fi

echo "✅ Public smoke completed"
