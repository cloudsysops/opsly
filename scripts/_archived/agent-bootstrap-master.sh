#!/bin/bash
# Master Agent Bootstrap
# Orquesta todo el flujo: detect → registry → skills → MCP → briefing → validation
# Uso: bash scripts/agent-bootstrap-master.sh --agent-name=<name> [--dry-run]

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Parse args
AGENT_NAME=""
DRY_RUN=0
SKIP_VALIDATION=0

for arg in "$@"; do
  case $arg in
    --agent-name=*)
      AGENT_NAME="${arg#*=}"
      ;;
    --dry-run)
      DRY_RUN=1
      ;;
    --skip-validation)
      SKIP_VALIDATION=1
      ;;
  esac
done

if [ -z "$AGENT_NAME" ]; then
  echo "❌ No agent name provided"
  echo "Usage: bash scripts/agent-bootstrap-master.sh --agent-name=<name> [--dry-run]"
  exit 1
fi

echo "🚀 Agent Bootstrap Master"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Agent: $AGENT_NAME"
if [ $DRY_RUN -eq 1 ]; then
  echo "Mode: DRY RUN (no changes)"
fi
echo ""

# Phase 1: Detect
echo "📍 PHASE 1: Detection"
echo "─────────────────────────"
node "$PROJECT_ROOT/scripts/agent-detect.js" --agent-name="$AGENT_NAME"
echo ""

# Phase 2: Registry
echo "📍 PHASE 2: Registry Sync"
echo "─────────────────────────"
if [ $DRY_RUN -eq 1 ]; then
  node "$PROJECT_ROOT/scripts/agent-registry-sync.js" --agent-name="$AGENT_NAME" --dry-run
else
  node "$PROJECT_ROOT/scripts/agent-registry-sync.js" --agent-name="$AGENT_NAME"
fi
echo ""

# Phase 3: Skills Mapping
echo "📍 PHASE 3: Skills Mapping"
echo "─────────────────────────"
node "$PROJECT_ROOT/scripts/skills-mapper.js" --agent-name="$AGENT_NAME"
echo ""

# Phase 4: Skills Preload
echo "📍 PHASE 4: Skills Preload"
echo "─────────────────────────"
if [ $DRY_RUN -eq 1 ]; then
  node "$PROJECT_ROOT/scripts/skills-preload.js" --agent-name="$AGENT_NAME"
else
  node "$PROJECT_ROOT/scripts/skills-preload.js" --agent-name="$AGENT_NAME" --save
fi
echo ""

# Phase 5: MCP Bootstrap
echo "📍 PHASE 5: MCP Tools Setup"
echo "─────────────────────────"
node "$PROJECT_ROOT/scripts/mcp-bootstrap.js" --no-health-check
echo ""

# Phase 6: Welcome Briefing
echo "📍 PHASE 6: Welcome Briefing"
echo "─────────────────────────"
node "$PROJECT_ROOT/scripts/agent-welcome-briefing.mjs" --agent-name="$AGENT_NAME"
echo ""

# Phase 7: Validation (optional)
if [ $SKIP_VALIDATION -eq 0 ]; then
  echo "📍 PHASE 7: Validation Checklist"
  echo "─────────────────────────"
  bash "$PROJECT_ROOT/scripts/agent-validation.sh" --agent-name="$AGENT_NAME" || {
    echo ""
    echo "⚠️  Some validation checks failed"
    echo "   Re-run with --skip-validation to proceed anyway"
    if [ $DRY_RUN -eq 0 ]; then
      exit 1
    fi
  }
  echo ""
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $DRY_RUN -eq 1 ]; then
  echo "✅ DRY RUN complete"
  echo ""
  echo "To apply changes, run without --dry-run:"
  echo "  bash scripts/agent-bootstrap-master.sh --agent-name=$AGENT_NAME"
else
  echo "✅ Agent Bootstrap Complete!"
  echo ""
  echo "🎯 Next Steps:"
  echo "   1. Agent registered in agents-team.json"
  echo "   2. System prompt created"
  echo "   3. Skills pre-loaded and mapped"
  echo "   4. MCP tools configured"
  echo "   5. brain:research ready"
  echo ""
  echo "🚀 Agent is ready to work!"
fi

echo ""
