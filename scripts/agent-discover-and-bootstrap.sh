#!/bin/bash
# Discover new agents in agents-team.json and bootstrap them
# Useful for manual triggering or post-merge agent discovery
# Usage: bash scripts/agent-discover-and-bootstrap.sh [--verbose] [--force]

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_TEAM="$PROJECT_ROOT/config/agents-team.json"
BOOTSTRAP_DIR="$PROJECT_ROOT/.agent-bootstrap-state"
VERBOSE=0
FORCE=0

# Parse args
for arg in "$@"; do
  case $arg in
    --verbose)
      VERBOSE=1
      ;;
    --force)
      FORCE=1
      ;;
  esac
done

mkdir -p "$BOOTSTRAP_DIR"

is_bootstrapped() {
  [ -f "$BOOTSTRAP_DIR/.bootstrapped-$1" ]
}

mark_bootstrapped() {
  touch "$BOOTSTRAP_DIR/.bootstrapped-$1"
}

echo "🔍 Agent Discovery"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get all agents from config
agents=$(jq -r '.agents[].name' "$AGENTS_TEAM" 2>/dev/null || echo "")

if [ -z "$agents" ]; then
  echo "❌ No agents found in agents-team.json"
  exit 1
fi

echo "📋 Registered agents in config:"
for agent in $agents; do
  echo "   • $agent"
done
echo ""

# Find uninitialized agents
echo "🔎 Checking bootstrap state..."
uninitialized=()

for agent in $agents; do
  if [ $FORCE -eq 1 ] || ! is_bootstrapped "$agent"; then
    uninitialized+=("$agent")
    status="❌ UNINITIALIZED"
    [ -f "$BOOTSTRAP_DIR/.bootstrapped-$agent" ] && status="⚠️  FORCE RESET"
    [ $VERBOSE -eq 1 ] && echo "   $status: $agent"
  else
    [ $VERBOSE -eq 1 ] && echo "   ✅ READY: $agent"
  fi
done

echo ""

if [ ${#uninitialized[@]} -eq 0 ]; then
  echo "✅ All agents bootstrapped"
  exit 0
fi

echo "⚙️  Bootstrapping ${#uninitialized[@]} agent(s)..."
echo ""

bootstrapped=0
failed=0

for agent in "${uninitialized[@]}"; do
  echo "🚀 $agent..."

  if bash "$PROJECT_ROOT/scripts/agent-bootstrap-master.sh" \
    --agent-name="$agent" \
    --skip-validation; then
    mark_bootstrapped "$agent"
    echo ""
    ((bootstrapped++))
  else
    echo "   ❌ Failed"
    echo ""
    ((failed++))
  fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Bootstrap Summary"
echo "   Initialized: $bootstrapped"
[ $failed -gt 0 ] && echo "   Failed: $failed"
echo ""

exit 0
