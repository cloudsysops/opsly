#!/usr/bin/env bash
# Tests para el webhook n8n Discord->GitHub
set -euo pipefail

PASS=0
FAIL=0
N8N_URL="https://n8n-intcloudsysops.ops.smiletripcare.com"

assert() {
  local desc="$1"
  local result="$2"
  local expected="$3"
  if [[ "$result" == "$expected" ]]; then
    echo "  PASS $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL $desc (got: $result, expected: $expected)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "test n8n webhook Discord->GitHub — $(date)"
echo ""

# T1: n8n responde
HTTP=$(curl -sk -o /dev/null -w "%{http_code}" \
  "$N8N_URL/healthz" 2>/dev/null || echo "000")
assert "n8n responde" "$HTTP" "200"

# T2+: webhook endpoint existe
WEBHOOK_URL="${N8N_WEBHOOK_URL:-}"
if [[ -z "$WEBHOOK_URL" ]]; then
  echo "  WARN N8N_WEBHOOK_URL no definida — skipping tests de webhook"
else
  HTTP=$(curl -sk -o /dev/null -w "%{http_code}" \
    -X POST -H "Content-Type: application/json" \
    -d '{}' "$WEBHOOK_URL" 2>/dev/null || echo "000")
  assert "webhook rechaza payload vacio" "$(echo "$HTTP" | rg -c "400|422")" "1"

  HTTP=$(curl -sk -o /dev/null -w "%{http_code}" \
    -X POST -H "Content-Type: application/json" \
    -H "X-Opsly-Secret: ${N8N_WEBHOOK_SECRET:-test}" \
    -d '{"content":"# test\necho hello","dry_run":true}' \
    "$WEBHOOK_URL" 2>/dev/null || echo "000")
  assert "webhook acepta payload valido" "$HTTP" "200"
fi

echo ""
echo "Result: PASS $PASS | FAIL $FAIL"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
