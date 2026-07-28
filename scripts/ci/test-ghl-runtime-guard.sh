#!/usr/bin/env bash
# Positive + negative tests for GHL runtime guard.
# Usage: bash scripts/ci/test-ghl-runtime-guard.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

GUARD=scripts/ci/check-no-new-ghl-runtime.sh

echo "== positive: current tree matches baseline =="
bash "$GUARD"

echo "== negative: injected GHL reference must fail =="
# git grep only sees tracked files — temporarily patch a tracked file.
probe_target="apps/peskids/README.md"
backup="$(mktemp "${TMPDIR:-/tmp}/ghl-guard-readme-XXXXXX")"
cp "$probe_target" "$backup"
trap 'cp "$backup" "$probe_target"; rm -f "$backup"' EXIT

printf '\n<!-- GoHighLevel probe TEMP for guard test; do not commit -->\n' >>"$probe_target"

set +e
bash "$GUARD" >/tmp/ghl-guard-neg.out 2>&1
rc=$?
set -e
cp "$backup" "$probe_target"

if [[ "$rc" -eq 0 ]]; then
  echo "FAIL: guard should have detected new GHL reference" >&2
  cat /tmp/ghl-guard-neg.out >&2 || true
  exit 1
fi

echo "OK: guard rejected new GHL reference (exit=$rc)"
echo "GHL runtime guard tests passed"
