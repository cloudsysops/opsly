#!/bin/bash
# NotebookLM integration status checker

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYNC_MARKER="$PROJECT_ROOT/.brain-notebooklm-sync-timestamp"

echo "🔍 NotebookLM Integration Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get NotebookLM config from Doppler
if command -v doppler &>/dev/null; then
  NOTEBOOKLM_ENABLED=$(doppler run --project ops-intcloudsysops --config prd -- printenv NOTEBOOKLM_ENABLED 2>/dev/null || echo "NOT_SET")
  NOTEBOOKLM_NOTEBOOK_ID=$(doppler run --project ops-intcloudsysops --config prd -- printenv NOTEBOOKLM_NOTEBOOK_ID 2>/dev/null || echo "NOT_SET")
  NOTEBOOKLM_TENANT=$(doppler run --project ops-intcloudsysops --config prd -- printenv NOTEBOOKLM_DEFAULT_TENANT_SLUG 2>/dev/null || echo "platform")
else
  NOTEBOOKLM_ENABLED="${NOTEBOOKLM_ENABLED:-NOT_SET}"
  NOTEBOOKLM_NOTEBOOK_ID="${NOTEBOOKLM_NOTEBOOK_ID:-NOT_SET}"
  NOTEBOOKLM_TENANT="${NOTEBOOKLM_DEFAULT_TENANT_SLUG:-platform}"
fi

# Check status
if [ "$NOTEBOOKLM_ENABLED" = "true" ]; then
  STATUS_ICON="✅"
  STATUS_TEXT="ENABLED"
else
  STATUS_ICON="⚠️ "
  STATUS_TEXT="DISABLED"
fi

echo "$STATUS_ICON NotebookLM: $STATUS_TEXT"
echo ""

echo "📋 Configuration:"
if [ "$NOTEBOOKLM_ENABLED" = "true" ]; then
  NB_ID_SHORT="${NOTEBOOKLM_NOTEBOOK_ID:0:8}..."
  echo "   Notebook ID: $NB_ID_SHORT"
  echo "   Tenant: $NOTEBOOKLM_TENANT"
else
  echo "   ⚠️  Not fully configured. Run:"
  echo "      doppler secrets set NOTEBOOKLM_ENABLED true"
  echo "      doppler secrets set NOTEBOOKLM_NOTEBOOK_ID <id>"
fi

echo ""

# Brain status
BRAIN_PATH="$PROJECT_ROOT/docs/brain"
if [ -d "$BRAIN_PATH" ]; then
  BRAIN_COUNT=$(find "$BRAIN_PATH" -name "*.md" -type f 2>/dev/null | wc -l)
  echo "🧠 Obsidian Brain:"
  echo "   Total files: $BRAIN_COUNT"

  if [ -f "$SYNC_MARKER" ]; then
    LAST_SYNC_TS=$(cat "$SYNC_MARKER")
    LAST_SYNC_DATE=$(date -r "$LAST_SYNC_TS" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "unknown")
    HOURS_AGO=$(( ($(date +%s) - $LAST_SYNC_TS) / 3600 ))
    if [ $HOURS_AGO -lt 1 ]; then
      echo "   Last sync: < 1 hour ago ($LAST_SYNC_DATE)"
    else
      echo "   Last sync: $HOURS_AGO hours ago ($LAST_SYNC_DATE)"
    fi
  else
    echo "   Last sync: ❌ Never (first sync needed)"
  fi
else
  echo "⚠️  docs/brain/ not found"
fi

echo ""

# Python/notebooklm-py check
echo "🔧 Dependencies:"
if command -v python3 &>/dev/null; then
  PY_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
  echo "   Python: ✅ $PY_VERSION"

  if python3 -c "import notebooklm" 2>/dev/null; then
    echo "   notebooklm-py: ✅ installed"
  else
    echo "   notebooklm-py: ❌ not installed (required for VPS sync)"
    echo "      Install: pip3 install notebooklm-py"
  fi
else
  echo "   Python: ❌ not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 Available Commands:"
echo "   npm run brain:to-notebooklm       Sync Obsidian brain only"
echo "   npm run notebooklm:sync           Sync docs + brain"
echo "   npm run notebooklm:full-sync      Sync everything (docs + brain + skills)"
echo "   npm run notebooklm:query          Query NotebookLM"
echo ""
echo "📚 Documentation:"
echo "   docs/NOTEBOOKLM-BRAIN-SYNC.md"
echo "   docs/adr/ADR-025-notebooklm-knowledge-layer.md"
echo ""

if [ "$NOTEBOOKLM_ENABLED" = "true" ] && [ "$BRAIN_COUNT" -gt 0 ]; then
  echo "✅ Ready to sync! Run:"
  echo "   npm run brain:to-notebooklm"
  echo ""
fi
