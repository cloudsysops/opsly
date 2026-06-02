#!/bin/bash
# founder-mode-startup.sh — Load Founder Mode operating goal at session start

set -e

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════╗
║                          🎯 FOUNDER MODE ACTIVE                       ║
╚════════════════════════════════════════════════════════════════════════╝

Operating Goal: Peskids → Blueprint → Agency Replication
Active Since: 2026-06-02
Repository: cloudsysops/opsly

📋 Decision Gate (before every action):
   1. Does this help Peskids go live?
   2. Does this make Blueprint replicable?
   3. Does this measure lead conversion?
   ➜ If NO to all three: DON'T DO IT

🚨 Hard Rules:
   ✗ No K8s, Terraform, multi-cloud
   ✗ No new platform modules or products
   ✗ No autonomous agents, AI memory, marketplace
   ✗ No refactoring unrelated to goal

🔗 Context:
   - Peskids: Live case study (go-live is success metric)
   - Blueprint: Reusable template for replication
   - Agency: Distribution channel (not a new product)

📚 Read first: AGENTS.md → FOUNDER MODE EXPLICIT RULES section
═══════════════════════════════════════════════════════════════════════════

EOF

# Load branch/theme from git
BRANCH=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
THEME=$(echo "$BRANCH" | sed 's/.*-//' | tr '-' ' ')

echo "📌 Current Branch: $BRANCH"
echo "🏷️  Session Theme: $THEME"
echo ""

# Load next action from AGENTS.md if available
if grep -q "🔄 Estado Actual" "$REPO_ROOT/AGENTS.md" 2>/dev/null; then
  echo "⚡ Next Priority (from AGENTS.md):"
  head -20 "$REPO_ROOT/AGENTS.md" | grep -A 5 "🔄" || echo "  (no blocker documented)"
else
  echo "⚡ Next Priority: Check AGENTS.md for current session state"
fi

echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo ""
