#!/usr/bin/env bash
# Tests para drive-sync.sh
set -euo pipefail

PASS=0
FAIL=0
SCRIPT="./scripts/drive-sync.sh"

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
echo "test drive-sync.sh — $(date)"
echo ""

# T1: script existe y ejecutable
assert "script existe" "$(test -f "$SCRIPT" && echo 1 || echo 0)" "1"
assert "script ejecutable" "$(test -x "$SCRIPT" && echo 1 || echo 0)" "1"

# T2: dry-run lista archivos correctos
output=$(./scripts/drive-sync.sh --dry-run 2>&1 || true)
for f in "AGENTS.md" "VISION.md" "docs/FAQ.md"; do
  assert "dry-run menciona $f" "$(echo "$output" | rg -c "$f")" "1"
done

# T3: sin token -> exit 0 con warning
result=$(GOOGLE_DRIVE_TOKEN="" "$SCRIPT" 2>&1; echo "EXIT:$?")
assert "exit 0 sin token" "$(echo "$result" | rg -c "EXIT:0")" "1"
warn_count="$(echo "$result" | rg -ci "skip|warn|token" || true)"
warn_ok="0"
if [[ "$warn_count" -ge 1 ]]; then
  warn_ok="1"
fi
assert "warning en output" "$warn_ok" "1"

# T4: archivos objetivo existen en repo
for f in AGENTS.md VISION.md docs/FAQ.md docs/TROUBLESHOOTING.md; do
  assert "$f existe en repo" "$(test -f "$f" && echo 1 || echo 0)" "1"
done

# T5: folder ID hardcodeado es el correcto
assert "folder ID correcto" \
  "$(rg -c "1r8fFtPnYRCjH1OEzLmXe7u-vcpWGqnWf" "$SCRIPT")" "1"

echo ""
echo "Result: PASS $PASS | FAIL $FAIL"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
