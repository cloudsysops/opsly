#!/usr/bin/env bash
# Smoke checks for Peskids auth surfaces (public HTTP only; no secrets).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="${PESKIDS_BASE_URL:-https://www.peskids.com}"
API="${OPSLY_API_URL:-https://api.op-sly.com}"
DEMO_LOGIN_SMOKE="${PESKIDS_DEMO_LOGIN_SMOKE:-${SCRIPT_DIR}/peskids/verify-peskids-demo-logins.sh}"

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
check_status_any "admin gate" "$BASE/admin" 200 307 308 302 301
check_status_any "teacher shell" "$BASE/teacher/dashboard" 200 307 308 302 301
check_status_any "support shell" "$BASE/support/dashboard" 200 307 308 302 301
check_status_any "familias submissions shell" "$BASE/familias/submissions" 200 307 308 302 301
check_body_absent "familias no google oauth button" "$BASE/familias/login" "signInWithOAuth|Continuar con Google|Google OAuth"
check_status "opsly api health" "$API/api/health" "200"

if [[ -x "$DEMO_LOGIN_SMOKE" ]]; then
  echo "=== Demo login smoke ==="
  if "$DEMO_LOGIN_SMOKE"; then
    echo "OK  demo login smoke"
    pass=$((pass + 1))
  else
    echo "FAIL demo login smoke"
    fail=$((fail + 1))
  fi
else
  echo "SKIP demo login smoke (missing $DEMO_LOGIN_SMOKE)"
fi

echo "---"
echo "passed=$pass failed=$fail"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
