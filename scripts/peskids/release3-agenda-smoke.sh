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

check_status_any() {
  local name="$1"
  local url="$2"
  shift 2
  local expected_codes=("$@")
  local code
  code="$(curl -sf -o /dev/null -w '%{http_code}' "$url" || echo "000")"
  for expected in "${expected_codes[@]}"; do
    if [[ "$code" == "$expected" ]]; then
      if [[ "$code" == "200" ]]; then
        echo "OK  $name (200 shell) $url"
      else
        echo "OK  $name (${code} legacy redirect) $url"
      fi
      pass=$((pass + 1))
      return 0
    fi
  done
  echo "FAIL $name expected one of ${expected_codes[*]} got=$code $url"
  fail=$((fail + 1))
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
check_status_any "teacher shell" "$BASE/teacher/dashboard" 200 307 308 302 301
check_status_any "support shell" "$BASE/support/dashboard" 200 307 308 302 301
check_status_any "familias submissions shell" "$BASE/familias/submissions" 200 307 308 302 301
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
