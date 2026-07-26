#!/usr/bin/env bash
# Public smoke for Peskids go-live/demo readiness.
# Default: validates public app surfaces on the canonical customer domain.
# Optional: set POST_LEAD=1 to submit a real lead payload to /api/leads.

set -euo pipefail

BASE_URL="${BASE_URL:-https://www.peskids.com}"
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
  1. GET /, /api/health, /admin/login, /teacher/login, /familias/login
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

lead_body=""
lead_resp=""
trap 'rm -f "${lead_body:-}" "${lead_resp:-}"' EXIT

check_200() {
  local label="$1"
  local path="$2"
  local code
  code="$(curl --http1.1 -sk -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")"
  if [[ "${code}" != "200" ]]; then
    echo "❌ ${label} ${path} → HTTP ${code}" >&2
    exit 1
  fi
  echo "✓ ${label} ${path} is reachable"
}

echo "✓ Test 1: public app surfaces"
check_200 "Landing" "/"
check_200 "Health" "/api/health"
check_200 "Admin login" "/admin/login"
check_200 "Teacher login" "/teacher/login"
check_200 "Families login" "/familias/login"

if [[ "${POST_LEAD}" == "1" ]]; then
  echo "✓ Test 2: POST /api/leads (optional)"
  lead_body="$(mktemp)"
  lead_resp="$(mktemp)"
  cat >"${lead_body}" <<'JSON'
{
  "name": "Peskids Public Smoke",
  "email": "peskids-public-smoke@example.com",
  "phone": "+573000000000",
  "class_modality": "llanogrande",
  "neighborhood": "Llanogrande",
  "grade_interested": "3-4 años",
  "referral_source": "Website",
  "consent_treatment": true,
  "consent_marketing": false,
  "consent_policy_version": "pk-parental-v1+pk-privacy-v1@1.0"
}
JSON
  lead_code="$(
    curl --http1.1 -sk -o "${lead_resp}" -w "%{http_code}" \
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
