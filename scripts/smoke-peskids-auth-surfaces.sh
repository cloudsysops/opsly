#!/usr/bin/env bash
# Smoke checks for Peskids auth surfaces (public HTTP only; no secrets).
set -euo pipefail

BASE="${PESKIDS_BASE_URL:-https://peskids.op-sly.com}"
API="${OPSLY_API_URL:-https://api.op-sly.com}"

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

check_body_absent() {
  local name="$1"
  local url="$2"
  local pattern="$3"
  local body
  body="$(curl -sf "$url" || true)"
  if echo "$body" | grep -qiE "$pattern"; then
    echo "FAIL $name matched forbidden pattern on $url"
    fail=$((fail + 1))
  else
    echo "OK  $name (no $pattern) $url"
    pass=$((pass + 1))
  fi
}

echo "=== Peskids auth surface smoke ==="
check_status "landing" "$BASE/" "200"
check_status "familias login" "$BASE/familias/login" "200"
check_status "admin gate" "$BASE/admin" "307"
check_status "teacher gate" "$BASE/teacher/dashboard" "307"
check_status "support gate" "$BASE/support/dashboard" "307"
check_status "familias submissions gate" "$BASE/familias/submissions" "307"
check_body_absent "familias no google oauth button" "$BASE/familias/login" "signInWithOAuth|Continuar con Google|Google OAuth"
check_status "opsly api health" "$API/api/health" "200"

echo "---"
echo "passed=$pass failed=$fail"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
