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
  head -c 200 /tmp/peskids-lead.json 2>/dev/null || true
  echo
fi

echo "Forms (when API deployed):"
echo "  ${API_BASE}/peskids/lead-form.html"
echo "  ${API_BASE}/peskids/feedback-form.html"
echo "Done."
