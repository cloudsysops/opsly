#!/bin/bash
##
# agent-onboarding.sh — Auto-configure new agents with brain:research
# Usage: ./scripts/agent-onboarding.sh <opsly_service_key> [--enable]
##

set -e

AGENT_NAME="${1:-}"
ENABLE_FLAG="${2:-}"

if [ -z "$AGENT_NAME" ]; then
  echo "Usage: agent-onboarding.sh <opsly_service_key> [--enable]"
  echo "Examples:"
  echo "  ./scripts/agent-onboarding.sh local_hermes --enable"
  echo "  (service key must exist under services in config/agent-services.json)"
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_AGENTS_TEAM="$PROJECT_ROOT/config/agents-team.json"
CONFIG_AGENT_SERVICES="$PROJECT_ROOT/config/agent-services.json"

echo "🤖 Agent Onboarding: $AGENT_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Check if agent exists in agent-services.json
if ! grep -q "\"$AGENT_NAME\":" "$CONFIG_AGENT_SERVICES"; then
  echo "⚠️  Agent '$AGENT_NAME' not found in config/agent-services.json"
  echo "   Add it first under 'services' section"
  exit 1
fi

echo "✅ Agent '$AGENT_NAME' found in service registry"

# Step 2: Inject brain:research into agent's system prompt
echo ""
echo "📚 Injecting brain:research configuration..."

BRAIN_RESEARCH_INSTRUCTION="
# Brain-Driven Context Optimization
Always use brain:research for investigation queries:
- Triggers: investigar, research, explain, ¿cómo funciona
- Tool: brain:research (MCP)
- Expected: {question, answer, sources[], confidence, iterations}
- Savings: 60-70% tokens vs full context
- Skill: opsly-brain-researcher (HIGH priority)

Required system instruction:
1. Query exists in docs/brain/ → brain:research
2. Search code locally → grep/find
3. Architecture context → AGENTS.md + VISION.md
4. Last resort → ask user
"

# Step 3: Create agent-specific config if needed
AGENT_PROMPT_FILE="$PROJECT_ROOT/docs/.agent-prompts/$AGENT_NAME.system.md"
mkdir -p "$(dirname "$AGENT_PROMPT_FILE")"

if [ ! -f "$AGENT_PROMPT_FILE" ]; then
  echo "$BRAIN_RESEARCH_INSTRUCTION" > "$AGENT_PROMPT_FILE"
  echo "✅ Created system prompt: $AGENT_PROMPT_FILE"
else
  echo "ℹ️  System prompt already exists: $AGENT_PROMPT_FILE"
fi

# Step 4: Optionally enable the agent
if [ "$ENABLE_FLAG" = "--enable" ]; then
  echo ""
  echo "🚀 Enabling agent in agent-services.json..."

  # Use sed to update enabled flag (cross-platform compatible)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"$AGENT_NAME\": {/\"$AGENT_NAME\": {\n      \"enabled\": true,/g" "$CONFIG_AGENT_SERVICES" 2>/dev/null || true
  else
    # Linux
    sed -i "s/\"$AGENT_NAME\": {/\"$AGENT_NAME\": {\n      \"enabled\": true,/g" "$CONFIG_AGENT_SERVICES" 2>/dev/null || true
  fi

  # Better approach: use node
  node -e "
    const fs = require('fs');
    const file = '$CONFIG_AGENT_SERVICES';
    let config = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (config.services['$AGENT_NAME']) {
      config.services['$AGENT_NAME'].enabled = true;
      fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
      console.log('✅ Agent enabled in agent-services.json');
    }
  " || echo "⚠️  Manual enable required in agent-services.json"
fi

# Step 5: Register in agents-team.json if needed
echo ""
echo "📋 Verifying agents-team.json configuration..."

if grep -q "\"$AGENT_NAME\"" "$CONFIG_AGENTS_TEAM"; then
  echo "✅ Agent already registered in agents-team.json"
else
  echo "ℹ️  Add agent to agents-team.json under 'agents' array if needed"
fi

# Step 6: Verify MCP tools are available
echo ""
echo "🔧 Verifying MCP tools availability..."
if [ -f "$PROJECT_ROOT/apps/mcp/src/tools/obsidian/mcp-tool.ts" ]; then
  if grep -q "brain:research" "$PROJECT_ROOT/apps/mcp/src/tools/obsidian/mcp-tool.ts"; then
    echo "✅ brain:research MCP tool is available"
  fi
fi

# Step 7: Print onboarding summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Onboarding complete for agent: $AGENT_NAME"
echo ""
echo "📌 Next steps:"
echo "   1. Read AGENTS.md#brain-driven-context"
echo "   2. Use skill-finder.js for auto-detection"
echo "   3. Call brain:research for investigation queries"
echo ""
echo "🎯 Token optimization rules:"
echo "   • docs/brain/ exists? → brain:research (300 tokens)"
echo "   • Code search?        → grep locally"
echo "   • Architecture?       → AGENTS.md + VISION.md"
echo "   • Last resort?        → Ask user"
echo ""
echo "📚 System prompt location:"
echo "   $AGENT_PROMPT_FILE"
echo ""
