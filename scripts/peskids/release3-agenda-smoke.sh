#!/usr/bin/env bash
# Release 3 smoke: shared agenda APIs + auth gates (public HTTP; optional session checks via env).
set -euo pipefail

BASE="${PESKIDS_BASE_URL:-https://peskids.op-sly.com}"

pass=0
fail=0

check_status() {
  local name="$1"
  local url="$2"
  local expected="$3"
  local code
  code="$(curl -sf -o /dev/null -w '%{http_code}' "$url" || echo "000")"
  if [[ "$code" == "$expected" ]]; then
    echo "OK  $name ($code) $url"
    pass=$((pass + 1))
  else
    echo "FAIL $name expected=$expected got=$code $url"
    fail=$((fail + 1))
  fi
}

check_json_unauthorized() {
  local name="$1"
  local url="$2"
  local body
  body="$(curl -s -o /tmp/peskids-r3-smoke.json -w '%{http_code}' "$url" || echo "000")"
  if [[ "$body" == "401" || "$body" == "403" ]]; then
    echo "OK  $name ($body without session) $url"
    pass=$((pass + 1))
  else
    echo "FAIL $name expected 401/403 got=$body $url"
    fail=$((fail + 1))
  fi
}

echo "=== Peskids Release 3 agenda smoke ==="
check_status "landing" "$BASE/" "200"
check_status "familias portal" "$BASE/familias" "200"
check_status "familias login" "$BASE/familias/login" "200"
check_status "teacher gate" "$BASE/teacher/dashboard" "307"
check_json_unauthorized "admin agenda gate" "$BASE/api/admin/agenda"
check_json_unauthorized "portal agenda gate" "$BASE/api/portal/agenda"

if [[ -n "${PESKIDS_SMOKE_ADMIN_TOKEN:-}" ]]; then
  agenda_code="$(curl -s -o /tmp/peskids-admin-agenda.json -w '%{http_code}' \
    -H "Cookie: peskids_admin_session=${PESKIDS_SMOKE_ADMIN_TOKEN}" \
    "$BASE/api/admin/agenda" || echo "000")"
  if [[ "$agenda_code" == "200" ]]; then
    echo "OK  admin agenda authenticated ($agenda_code)"
    pass=$((pass + 1))
  else
    echo "FAIL admin agenda authenticated expected=200 got=$agenda_code"
    fail=$((fail + 1))
  fi
else
  echo "SKIP admin agenda authenticated (set PESKIDS_SMOKE_ADMIN_TOKEN)"
fi

echo "---"
echo "passed=$pass failed=$fail"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
