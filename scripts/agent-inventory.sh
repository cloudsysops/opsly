#!/bin/bash
##
# agent-inventory.sh — List all agents and their configuration status
##

echo "🤖 OPSLY AGENT INVENTORY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/config/agent-services.json"

echo "📋 ACTIVE AGENTS (enabled: true)"
echo "─────────────────────────────────────────────────────────────────"
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));
Object.entries(config.services)
  .filter(([_, service]) => service.enabled)
  .forEach(([name, service]) => {
    console.log('✅ ' + name.padEnd(15) + ' → ' + service.url);
  });
"

echo ""
echo "❌ DISABLED AGENTS (setup required)"
echo "─────────────────────────────────────────────────────────────────"
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));
Object.entries(config.services)
  .filter(([_, service]) => !service.enabled)
  .forEach(([name, service]) => {
    console.log('⚪ ' + name.padEnd(15) + ' (port ' + (5000 + Object.keys(config.services).indexOf(name)) + ')');
  });
"

echo ""
echo "👥 REGISTERED AGENT TEAM (agents-team.json)"
echo "─────────────────────────────────────────────────────────────────"
AGENTS_TEAM="$PROJECT_ROOT/config/agents-team.json"
if [ -f "$AGENTS_TEAM" ]; then
  node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('$AGENTS_TEAM', 'utf8'));
    config.agents.forEach(agent => {
      const status = agent.local_only ? '🔒' : '☁️ ';
      console.log(status + ' ' + agent.name.padEnd(25) + ' [' + agent.role + ']');
    });
  "
fi

echo ""
echo "🧠 BRAIN-DRIVEN CONTEXT STATUS"
echo "─────────────────────────────────────────────────────────────────"
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));
if (config.global_context_strategy) {
  console.log('✅ Strategy: ' + config.global_context_strategy.name);
  console.log('✅ Token savings target: ' + config.global_context_strategy.token_savings_target);
  console.log('✅ MCP tools: ' + config.global_context_strategy.mcp_tools_required.join(', '));
} else {
  console.log('⚠️  No global context strategy found');
}
"

echo ""
echo "📚 ONBOARDING NEW AGENTS"
echo "─────────────────────────────────────────────────────────────────"
echo "Usage: ./scripts/agent-onboarding.sh <opsly_service_key> [--enable]"
echo ""
echo "Examples:"
echo "  ./scripts/agent-onboarding.sh local_hermes --enable"
echo "  ./scripts/agent-onboarding.sh local_copilot --enable"
echo "  ./scripts/agent-onboarding.sh local_codex"
echo ""
echo "See docs/01-development/AGENT-SERVICE-NAMING.md (Opsly ids vs external_cli)."
