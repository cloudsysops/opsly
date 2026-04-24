#!/usr/bin/env bash
# Tests para notify-discord.sh
# Ejecutar: ./scripts/test-notify-discord.sh
set -euo pipefail

PASS=0
FAIL=0
SCRIPT="./scripts/utils/notify-discord.sh"

assert() {
  local desc="$1"
  local result="$2"
  local expected="$3"
  if [[ "$result" == "$expected" ]]; then
    echo "  PASS $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL $desc"
    echo "     got:      $result"
    echo "     expected: $expected"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "test notify-discord.sh — $(date)"
echo ""

# T1: script existe y es ejecutable
assert "script existe" "$(test -f "$SCRIPT" && echo 1 || echo 0)" "1"
assert "script ejecutable" "$(test -x "$SCRIPT" && echo 1 || echo 0)" "1"

# T2: dry-run sin webhook -> exit 0
code=$(DISCORD_WEBHOOK_URL="" "$SCRIPT" "T" "M" "success" --dry-run \
  >/dev/null 2>/dev/null; echo $?)
assert "dry-run sin webhook: exit 0" "$code" "0"

# T3: dry-run produce JSON valido
payload=$(DISCORD_WEBHOOK_URL="https://fake" \
  "$SCRIPT" "Titulo test" "Mensaje test" "success" --dry-run 2>/dev/null)
echo "$payload" | python3 -m json.tool > /dev/null 2>&1
assert "payload es JSON valido" "$?" "0"

# T4: JSON contiene campos requeridos
for field in title description color timestamp footer; do
  count=$(echo "$payload" | rg -c "\"$field\"" || true)
  assert "JSON contiene '$field'" "$count" "1"
done

# T5: colores correctos por tipo
for tipo in success error info warning; do
  expected_color=""
  case "$tipo" in
    success) expected_color="3066993" ;;
    error) expected_color="15158332" ;;
    info) expected_color="3447003" ;;
    warning) expected_color="16776960" ;;
  esac
  p=$(DISCORD_WEBHOOK_URL="https://fake" \
    "$SCRIPT" "T" "M" "$tipo" --dry-run 2>/dev/null)
  assert "color $tipo = ${expected_color}" \
    "$(echo "$p" | rg -c "${expected_color}")" "1"
done

# T6: footer contiene "Opsly Platform"
assert "footer Opsly Platform" \
  "$(echo "$payload" | rg -c "Opsly Platform")" "1"

# T7: sin webhook real -> exit 0 (no rompe flujo)
code=$(DISCORD_WEBHOOK_URL="" "$SCRIPT" "T" "M" "info" >/dev/null 2>/dev/null; echo $?)
assert "sin webhook real: exit 0" "$code" "0"

echo ""
echo "Result: PASS $PASS | FAIL $FAIL"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
