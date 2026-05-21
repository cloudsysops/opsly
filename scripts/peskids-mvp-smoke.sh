#!/usr/bin/env bash
set -euo pipefail

# Smoke Peskids MVP API (read-only + optional POST).
# Usage:
#   API_BASE=https://api.op-sly.com ./scripts/peskids-mvp-smoke.sh --dry-run
#   API_BASE=http://127.0.0.1:3000 ./scripts/peskids-mvp-smoke.sh

API_BASE="${API_BASE:-https://api.op-sly.com}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: scripts/peskids-mvp-smoke.sh [--dry-run]

Env:
  API_BASE   Base URL (default https://api.op-sly.com)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

run_curl() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

echo "== Peskids MVP smoke (API_BASE=$API_BASE) =="

run_curl curl -sfk "${API_BASE}/api/health" | head -c 120
echo

LEAD_PAYLOAD='{"name":"Smoke Test","email":"smoke-test@example.invalid","grade_interested":"K-5","referral_source":"Other"}'
FEEDBACK_PAYLOAD='{"child_name":"Smoke Child","satisfaction":2,"suggestion":"Smoke low rating","contact_me_back":true}'

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  local body_file="$4"
  if [[ "$actual" != "$expected" ]]; then
    echo "ERROR: $label expected HTTP $expected, got HTTP $actual" >&2
    head -c 500 "$body_file" 2>/dev/null >&2 || true
    echo >&2
    exit 1
  fi
}

echo "POST lead (test email .invalid)…"
if [[ "$DRY_RUN" == true ]]; then
  run_curl curl -sfk -X POST "${API_BASE}/api/public/tenants/peskids/leads" \
    -H 'Content-Type: application/json' \
    -d "$LEAD_PAYLOAD"
else
  code=$(curl -sk -o /tmp/peskids-lead.json -w '%{http_code}' -X POST \
    "${API_BASE}/api/public/tenants/peskids/leads" \
    -H 'Content-Type: application/json' \
    -d "$LEAD_PAYLOAD" || true)
  echo "HTTP $code"
  assert_status "$code" "201" "POST lead" /tmp/peskids-lead.json
  head -c 200 /tmp/peskids-lead.json 2>/dev/null || true
  echo
fi

echo "POST feedback low rating (test child)…"
if [[ "$DRY_RUN" == true ]]; then
  run_curl curl -sfk -X POST "${API_BASE}/api/public/tenants/peskids/feedback" \
    -H 'Content-Type: application/json' \
    -d "$FEEDBACK_PAYLOAD"
else
  code=$(curl -sk -o /tmp/peskids-feedback.json -w '%{http_code}' -X POST \
    "${API_BASE}/api/public/tenants/peskids/feedback" \
    -H 'Content-Type: application/json' \
    -d "$FEEDBACK_PAYLOAD" || true)
  echo "HTTP $code"
  assert_status "$code" "201" "POST feedback" /tmp/peskids-feedback.json
  if ! grep -q '"needs_attention":true' /tmp/peskids-feedback.json; then
    echo "ERROR: POST feedback expected needs_attention=true" >&2
    head -c 500 /tmp/peskids-feedback.json >&2 || true
    echo >&2
    exit 1
  fi
  head -c 200 /tmp/peskids-feedback.json 2>/dev/null || true
  echo
fi

echo "Forms (when API deployed):"
echo "  ${API_BASE}/peskids/lead-form.html"
echo "  ${API_BASE}/peskids/feedback-form.html"
echo "Done."
