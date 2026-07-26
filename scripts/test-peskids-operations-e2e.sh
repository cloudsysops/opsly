#!/usr/bin/env bash
set -euo pipefail

# Smoke test for Peskids operations endpoints (local or staging).
# Usage: BASE_URL=https://www.peskids.com ./scripts/test-peskids-operations-e2e.sh [--dry-run]

BASE_URL="${BASE_URL:-http://127.0.0.1:3004}"
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

pass=0
fail=0

check() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"

  if $DRY_RUN; then
    echo "[dry-run] GET ${url} (expect ${expected})"
    return 0
  fi

  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$url" || echo "000")
  if [[ "$code" == "$expected" ]]; then
    echo "OK  ${name} (${code})"
    pass=$((pass + 1))
  else
    echo "FAIL ${name} expected ${expected} got ${code}" >&2
    fail=$((fail + 1))
  fi
}

echo "Peskids operations smoke — ${BASE_URL}"

check "health" "${BASE_URL}/api/health"
check "public familias clases page" "${BASE_URL}/familias/clases" "200"
check "public familias reservas page" "${BASE_URL}/familias/reservas" "200"

# Unauthenticated API should reject portal routes
check "portal classes auth gate" "${BASE_URL}/api/portal/classes" "401"
check "portal students auth gate" "${BASE_URL}/api/portal/students" "401"
check "admin classes auth gate" "${BASE_URL}/api/admin/classes" "401"

if $DRY_RUN; then
  echo "Dry run complete."
  exit 0
fi

echo "Passed: ${pass}  Failed: ${fail}"
[[ "$fail" -eq 0 ]]
