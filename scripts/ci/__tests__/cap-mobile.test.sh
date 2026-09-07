#!/usr/bin/env bash
# Guard: cap-mobile.sh only accepts registered apps and never syncs on --dry-run.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SCRIPT="${ROOT}/scripts/cap-mobile.sh"

chmod +x "$SCRIPT" \
  "${ROOT}/scripts/icso-cap-android.sh" \
  "${ROOT}/scripts/icso-cap-ios.sh" \
  "${ROOT}/scripts/peskids-cap-android.sh" \
  "${ROOT}/scripts/peskids-cap-ios.sh"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

if "$SCRIPT" >/dev/null 2>"$out"; then
  fail "expected usage error with no args"
fi

if "$SCRIPT" ../escape android --dry-run >/dev/null 2>"$out"; then
  fail "expected invalid slug to fail"
fi

if "$SCRIPT" unknown android --dry-run >/dev/null 2>"$out"; then
  fail "expected unknown app to fail"
fi
grep -q 'Unknown mobile app' "$out" || fail "unknown app should mention registry"

if "$SCRIPT" icso windows --dry-run >/dev/null 2>"$out"; then
  fail "expected invalid platform to fail"
fi

icso_dry="$("$SCRIPT" icso android --dry-run)"
printf '%s\n' "$icso_dry" | grep -q 'capacitor sync android' || fail "icso dry-run should print sync"
printf '%s\n' "$icso_dry" | grep -q '\[dry-run\]' || fail "icso dry-run should prefix commands"

peskids_dry="$("$SCRIPT" peskids ios --dry-run)"
printf '%s\n' "$peskids_dry" | grep -q 'capacitor sync ios' || fail "peskids dry-run should print sync"

wrapper_dry="$("${ROOT}/scripts/icso-cap-android.sh" --dry-run)"
printf '%s\n' "$wrapper_dry" | grep -q '\[dry-run\]' || fail "icso wrapper should forward --dry-run"

echo "cap-mobile.test.sh OK"
