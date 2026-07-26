#!/usr/bin/env bash
set -euo pipefail

# Smoke Peskids production readiness.
# Usage:
#   WEB_BASE=https://www.peskids.com API_BASE=https://api.op-sly.com ./scripts/peskids-mvp-smoke.sh --dry-run
#   WEB_BASE=https://www.peskids.com API_BASE=https://api.op-sly.com ./scripts/peskids-mvp-smoke.sh

WEB_BASE="${WEB_BASE:-https://www.peskids.com}"
API_BASE="${API_BASE:-https://api.op-sly.com}"
PORTAL_HEALTH_SLUG="${PORTAL_HEALTH_SLUG:-peskids}"
N8N_HEALTH_URL="${N8N_HEALTH_URL:-https://n8n-peskids.op-sly.com/healthz}"
UPTIME_URL="${UPTIME_URL:-https://uptime-peskids.op-sly.com/}"
PORTAL_TENANT_HEALTH_TOKEN="${PORTAL_TENANT_HEALTH_TOKEN:-${PORTAL_TOKEN:-}}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: scripts/peskids-mvp-smoke.sh [--dry-run]

Env:
  WEB_BASE   Public tenant URL (default https://www.peskids.com)
  API_BASE   Base URL (default https://api.op-sly.com)
  PORTAL_HEALTH_SLUG  Tenant slug for portal monitoring (default peskids)
  N8N_HEALTH_URL      n8n health endpoint (default https://n8n-peskids.op-sly.com/healthz)
  UPTIME_URL          Uptime Kuma base URL (default https://uptime-peskids.op-sly.com/)
  PORTAL_TENANT_HEALTH_TOKEN  Optional Bearer token to validate /api/portal/tenant/[slug]/health
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

preview_url() {
  local label="$1"
  local url="$2"
  local tmp_file
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] curl -sfk ${url}"
    return 0
  fi
  tmp_file="$(mktemp)"
  if curl -sfk "$url" -o "$tmp_file"; then
    head -c 120 "$tmp_file" 2>/dev/null || true
    echo
  else
    local code=$?
    rm -f "$tmp_file"
    echo "ERROR: ${label} failed with curl exit ${code}" >&2
    return "$code"
  fi
  rm -f "$tmp_file"
}

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

echo "== Peskids MVP smoke (API_BASE=$API_BASE) =="

echo "Public tenant root:"
preview_url "public tenant root" "${WEB_BASE}/"

echo "Public admin login:"
preview_url "public admin login" "${WEB_BASE}/admin/login"

echo "Public API health:"
preview_url "public API health" "${API_BASE}/api/health"

echo "Public portal health:"
if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] curl -sfk ${API_BASE}/api/portal/health?slug=${PORTAL_HEALTH_SLUG}"
else
  code=$(curl -sk -o /tmp/peskids-portal-health.json -w '%{http_code}' \
    "${API_BASE}/api/portal/health?slug=${PORTAL_HEALTH_SLUG}" || true)
  echo "HTTP $code"
  assert_status "$code" "200" "GET portal health" /tmp/peskids-portal-health.json
  if ! grep -q "\"slug\":\"${PORTAL_HEALTH_SLUG}\"" /tmp/peskids-portal-health.json; then
    echo "ERROR: portal health response missing slug ${PORTAL_HEALTH_SLUG}" >&2
    head -c 500 /tmp/peskids-portal-health.json >&2 || true
    echo >&2
    exit 1
  fi
  if ! grep -q '"n8n_reachable":true' /tmp/peskids-portal-health.json; then
    echo "ERROR: portal health expected n8n_reachable=true" >&2
    head -c 500 /tmp/peskids-portal-health.json >&2 || true
    echo >&2
    exit 1
  fi
  if ! grep -q '"uptime_reachable":true' /tmp/peskids-portal-health.json; then
    echo "ERROR: portal health expected uptime_reachable=true" >&2
    head -c 500 /tmp/peskids-portal-health.json >&2 || true
    echo >&2
    exit 1
  fi
  head -c 260 /tmp/peskids-portal-health.json 2>/dev/null || true
  echo
fi

if [[ -n "$PORTAL_TENANT_HEALTH_TOKEN" ]]; then
  echo "Authenticated tenant portal health:"
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] curl -sfk ${API_BASE}/api/portal/tenant/${PORTAL_HEALTH_SLUG}/health"
  else
    code=$(curl -sk -o /tmp/peskids-tenant-health.json -w '%{http_code}' \
      "${API_BASE}/api/portal/tenant/${PORTAL_HEALTH_SLUG}/health" \
      -H "Authorization: Bearer ${PORTAL_TENANT_HEALTH_TOKEN}" || true)
    echo "HTTP $code"
    assert_status "$code" "200" "GET tenant portal health" /tmp/peskids-tenant-health.json
    head -c 260 /tmp/peskids-tenant-health.json 2>/dev/null || true
    echo
  fi
else
  echo "Skipping authenticated tenant portal health (set PORTAL_TENANT_HEALTH_TOKEN to enable)."
fi

echo "n8n health:"
preview_url "n8n health" "${N8N_HEALTH_URL}"

echo "Uptime Kuma:"
preview_url "uptime kuma" "${UPTIME_URL}"

LEAD_PAYLOAD='{"name":"Smoke Test","email":"smoke-test@example.invalid","class_modality":"llanogrande","neighborhood":"Llanogrande","grade_interested":"K-5","referral_source":"Other"}'
FEEDBACK_PAYLOAD='{"child_name":"Smoke Child","satisfaction":2,"suggestion":"Smoke low rating","contact_me_back":true}'

echo "POST lead (test email .invalid)..."
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

echo "POST feedback low rating (test child)..."
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

echo "Forms:"
echo "  ${API_BASE}/peskids/lead-form.html"
echo "  ${API_BASE}/peskids/feedback-form.html"
echo "Done."
