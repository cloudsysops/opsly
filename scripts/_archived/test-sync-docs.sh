#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "⏳ Running docs:sync…"
npm run docs:sync

OUT="$ROOT/docs/generated/implementation-progress.auto.md"
if [[ ! -f "$OUT" ]]; then
  echo "❌ docs/generated/implementation-progress.auto.md missing"
  exit 1
fi

grep -q "Phase 1" "$OUT" || { echo "❌ Expected 'Phase 1' in output"; exit 1; }
grep -q "Phase 2" "$OUT" || { echo "❌ Expected 'Phase 2' in output"; exit 1; }
grep -q "Generado (ISO)" "$OUT" || { echo "❌ Expected timestamp table in output"; exit 1; }

ST="$ROOT/docs/generated/sprint-status.auto.md"
AA="$ROOT/docs/AGENTS-ASSIGNMENTS.md"
[[ -f "$ST" ]] || { echo "❌ docs/generated/sprint-status.auto.md missing"; exit 1; }
[[ -f "$AA" ]] || { echo "❌ docs/AGENTS-ASSIGNMENTS.md missing"; exit 1; }
grep -q "Sprint 1" "$ST" || { echo "❌ Expected Sprint 1 in sprint-status.auto"; exit 1; }
grep -q "Cursor" "$AA" || { echo "❌ Expected agent Cursor in AGENTS-ASSIGNMENTS"; exit 1; }

echo "Verifying generated files have do_not_edit marker..."
for f in "$OUT" "$ST"; do
  if ! grep -q "do_not_edit: true" "$f"; then
    echo "❌ $f missing do_not_edit frontmatter marker"
    exit 1
  fi
done
echo "✅ All generated files have do_not_edit marker"

if [[ -f "$ROOT/docs/IMPLEMENTATION-STATUS.md" ]] || [[ -f "$ROOT/docs/SPRINT-TRACKING.md" ]]; then
  echo "❌ Legacy paths docs/IMPLEMENTATION-STATUS.md and docs/SPRINT-TRACKING.md must not exist (use docs/generated/*.auto.md; archive under docs/history/plans/)"
  exit 1
fi

echo "✅ All docs sync checks passed"
