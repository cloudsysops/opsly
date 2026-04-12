#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "⏳ Running docs:sync…"
npm run docs:sync

OUT="$ROOT/docs/IMPLEMENTATION-STATUS.md"
if [[ ! -f "$OUT" ]]; then
  echo "❌ docs/IMPLEMENTATION-STATUS.md missing"
  exit 1
fi

grep -q "Phase 1" "$OUT" || { echo "❌ Expected 'Phase 1' in output"; exit 1; }
grep -q "Phase 2" "$OUT" || { echo "❌ Expected 'Phase 2' in output"; exit 1; }
grep -q "Generado (ISO)" "$OUT" || { echo "❌ Expected timestamp table in output"; exit 1; }

ST="$ROOT/docs/SPRINT-TRACKING.md"
AA="$ROOT/docs/AGENTS-ASSIGNMENTS.md"
[[ -f "$ST" ]] || { echo "❌ docs/SPRINT-TRACKING.md missing"; exit 1; }
[[ -f "$AA" ]] || { echo "❌ docs/AGENTS-ASSIGNMENTS.md missing"; exit 1; }
grep -q "Sprint 1" "$ST" || { echo "❌ Expected Sprint 1 in SPRINT-TRACKING"; exit 1; }
grep -q "Cursor" "$AA" || { echo "❌ Expected agent Cursor in AGENTS-ASSIGNMENTS"; exit 1; }

echo "✅ All docs sync checks passed"
