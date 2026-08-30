#!/bin/bash
# Agent validation checklist
# Verifica que el agente heredó todo correctamente
# Uso: bash scripts/agent-validation.sh [--agent-name=<name>]

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_NAME="${AGENT_NAME:-$1}"
AGENT_NAME="${AGENT_NAME##*=}"  # Extract from --agent-name=

if [ -z "$AGENT_NAME" ]; then
  echo "❌ No agent name provided"
  echo "Usage: bash scripts/agent-validation.sh --agent-name=<name>"
  echo "Or set: export AGENT_NAME=<name>"
  exit 1
fi

echo "✅ Agent Validation Checklist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Agent: $AGENT_NAME"
echo ""

PASS=0
FAIL=0

# 1. Registrado en agents-team.json
echo -n "1. Registered in agents-team.json... "
if grep -q "\"$AGENT_NAME\"" "$PROJECT_ROOT/config/agents-team.json" 2>/dev/null; then
  echo "✅"
  ((PASS++))
else
  echo "❌ (Run: node scripts/agent-registry-sync.js --agent-name=$AGENT_NAME)"
  ((FAIL++))
fi

# 2. System prompt creado
echo -n "2. System prompt created... "
PROMPT_FILE="$PROJECT_ROOT/docs/.agent-prompts/$AGENT_NAME.system.md"
if [ -f "$PROMPT_FILE" ]; then
  echo "✅"
  ((PASS++))
else
  echo "❌ (Run: bash scripts/agent-onboarding.sh $AGENT_NAME)"
  ((FAIL++))
fi

# 3. MCP tools accesibles
echo -n "3. MCP tools accessible... "
if node "$PROJECT_ROOT/scripts/mcp-bootstrap.js" --no-health-check &>/dev/null; then
  echo "✅"
  ((PASS++))
else
  echo "❌ (Run: npm run dev)"
  ((FAIL++))
fi

# 4. brain:research configurado
echo -n "4. brain:research configured... "
if grep -q "brain:research" "$PROJECT_ROOT/config/agents-team.json" 2>/dev/null; then
  echo "✅"
  ((PASS++))
else
  echo "❌ (Check agents-team.json shared_context)"
  ((FAIL++))
fi

# 5. Skills mapeados
echo -n "5. Skills mapped... "
if node "$PROJECT_ROOT/scripts/skills-mapper.js" --agent-name="$AGENT_NAME" --output=json &>/dev/null; then
  echo "✅"
  ((PASS++))
else
  echo "❌ (Run: node scripts/skills-mapper.js --agent-name=$AGENT_NAME)"
  ((FAIL++))
fi

# 6. AGENTS.md accesible
echo -n "6. AGENTS.md readable... "
if [ -f "$PROJECT_ROOT/AGENTS.md" ]; then
  echo "✅"
  ((PASS++))
else
  echo "❌ (AGENTS.md missing)"
  ((FAIL++))
fi

# 7. Brain accesible
echo -n "7. Obsidian brain available... "
BRAIN_COUNT=$(find "$PROJECT_ROOT/docs/brain" -name "*.md" -type f 2>/dev/null | wc -l)
if [ "$BRAIN_COUNT" -gt 0 ]; then
  echo "✅ ($BRAIN_COUNT files)"
  ((PASS++))
else
  echo "❌ (No files in docs/brain/)"
  ((FAIL++))
fi

# 8. Doppler secrets OK (si available)
echo -n "8. Doppler secrets available... "
if command -v doppler &>/dev/null; then
  if doppler run --project ops-intcloudsysops --config prd -- printenv NOTEBOOKLM_NOTEBOOK_ID &>/dev/null; then
    echo "✅"
    ((PASS++))
  else
    echo "⚠️  (Doppler not configured, may need auth)"
  fi
else
  echo "⏭️  (Doppler CLI not installed)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Summary: $PASS passed, $FAIL failed"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "✅ All checks passed! Agent is ready."
  echo ""
  echo "Next: node scripts/agent-welcome-briefing.mjs --agent-name=$AGENT_NAME"
  exit 0
else
  echo "⚠️  Some checks failed. Fix above issues and run again."
  exit 1
fi
