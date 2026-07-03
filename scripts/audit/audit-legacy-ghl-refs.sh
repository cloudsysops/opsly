#!/bin/bash
set -euo pipefail

# Audit legacy GHL references for cleanup opportunities
# Identifies files using old patterns vs new feature-flag pattern
# NO code changes; report only

PESKIDS_SAFE_GHL_REFS=0
PESKIDS_UNSAFE_GHL_REFS=0
ICSO_GHL_REFS=0

echo "📋 Legacy GHL Reference Audit"
echo "================================"
echo ""

# PESKIDS: Check for safe refs (behind feature flags)
echo "🔍 Peskids (should be behind feature flags):"
echo ""

PESKIDS_CRM_SYNC="apps/peskids/lib/peskids-crm-sync.ts"
if grep -q "isPeskidsGhlEnabled" "$PESKIDS_CRM_SYNC" 2>/dev/null; then
  echo "✅ $PESKIDS_CRM_SYNC"
  echo "   └─ sendLeadToGHL() protected by isPeskidsGhlEnabled() flag"
  PESKIDS_SAFE_GHL_REFS=$((PESKIDS_SAFE_GHL_REFS + 1))
else
  echo "❌ $PESKIDS_CRM_SYNC"
  echo "   └─ sendLeadToGHL() NOT behind feature flag"
  PESKIDS_UNSAFE_GHL_REFS=$((PESKIDS_UNSAFE_GHL_REFS + 1))
fi

echo ""
echo "🔍 Peskids — Tests (can be cleaned up post-Phase-2):"
echo ""

PESKIDS_TESTS=$(find apps/peskids -name "*.test.ts" -o -name "*.spec.ts" | xargs grep -l "sendLeadToGHL\|postPeskidsLeadWithGHL" 2>/dev/null || echo "")
if [[ -n "$PESKIDS_TESTS" ]]; then
  echo "📄 Test files with GHL mocks (Phase 2 cleanup candidate):"
  echo "$PESKIDS_TESTS" | while read FILE; do
    COUNT=$(grep -c "sendLeadToGHL\|postPeskidsLeadWithGHL" "$FILE")
    echo "   $FILE ($COUNT refs)"
  done
else
  echo "✅ No Peskids test files with GHL refs"
fi

echo ""
echo "🔍 ICSO (uses old GHL-first pattern, not yet migrated):"
echo ""

ICSO_ROUTE="apps/intcloudsysops/app/api/leads/route.ts"
if [[ -f "$ICSO_ROUTE" ]]; then
  if grep -q "postPeskidsLeadWithGHL" "$ICSO_ROUTE" 2>/dev/null; then
    echo "⚠️  $ICSO_ROUTE"
    echo "   └─ Calls postPeskidsLeadWithGHL() directly (old pattern)"
    echo "   └─ STATUS: Blocked until ICSO migration (separate task)"
    ICSO_GHL_REFS=$((ICSO_GHL_REFS + 1))
  fi
fi

ICSO_CANONICAL="apps/intcloudsysops/lib/peskids-canonical-api.ts"
if [[ -f "$ICSO_CANONICAL" ]]; then
  if grep -q "postPeskidsLeadWithGHL" "$ICSO_CANONICAL" 2>/dev/null; then
    echo "⚠️  $ICSO_CANONICAL"
    echo "   └─ Defines postPeskidsLeadWithGHL() (hardcoded to GHL)"
    echo "   └─ STATUS: Blocked until ICSO migration (separate task)"
    ICSO_GHL_REFS=$((ICSO_GHL_REFS + 1))
  fi
fi

echo ""
echo "📊 Summary:"
echo "==========="
echo "Peskids:"
echo "  ✅ Safe (behind flags): $PESKIDS_SAFE_GHL_REFS"
echo "  ❌ Unsafe (exposed): $PESKIDS_UNSAFE_GHL_REFS"
echo ""
echo "ICSO:"
echo "  ⚠️  Old pattern (not migrated): $ICSO_GHL_REFS"
echo "  └─ Blocked: Requires 1.5h migration before cleanup"
echo ""

# Recommendations
echo "📋 Cleanup Recommendations:"
echo "==========================="
echo ""
echo "PHASE 1 (Current — No cleanup):"
echo "  ✅ Peskids: Keep GHL behind feature flags (safe)"
echo "  ✅ ICSO: Do NOT touch (legacy pattern, separate migration task)"
echo ""
echo "PHASE 2 (Day 30+ post-cutover):"
echo "  🗑️  Remove Peskids test mocks (sendLeadToGHL test helpers)"
echo "  🗑️  Remove Peskids @deprecated markers from:"
echo "      - apps/peskids/app/api/webhooks/gohighlevel/route.ts"
echo "      - apps/peskids/lib/agents/lead-followup.service.ts"
echo "      - apps/peskids/lib/agents/pipeline-manager.service.ts"
echo ""
echo "PHASE 3 (After ICSO migration):"
echo "  🗑️  Clean up ICSO GHL refs (same as Peskids Phase 2)"
echo "  📝 Provide ICSO cleanup checklist (will be generated post-migration)"
echo ""

# Counts
TOTAL_SAFE=$PESKIDS_SAFE_GHL_REFS
TOTAL_UNSAFE=$PESKIDS_UNSAFE_GHL_REFS
TOTAL_BLOCKED=$ICSO_GHL_REFS

if [[ $TOTAL_UNSAFE -eq 0 && $TOTAL_BLOCKED -eq 0 ]]; then
  echo "✅ Overall: No unsafe GHL refs; ready for cutover"
  exit 0
else
  echo "⚠️  Overall: $TOTAL_UNSAFE unsafe refs + $TOTAL_BLOCKED blocked tasks"
  exit 1
fi
