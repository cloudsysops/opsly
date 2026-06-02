#!/bin/bash
# git-session-brief.sh — Display session context and Founder Mode goal at startup

set -e

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════╗
║                       SESSION CONTEXT BRIEF                           ║
╚════════════════════════════════════════════════════════════════════════╝

EOF

# Current branch and status
BRANCH=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
STATUS=$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null | wc -l)
DIVERGENCE=$(git -C "$REPO_ROOT" rev-list --left-right --count origin/main...HEAD 2>/dev/null | xargs || echo "? ?")
LAST_COMMIT=$(git -C "$REPO_ROOT" log -1 --pretty=format:"%h %s" 2>/dev/null || echo "none")

echo "📌 Current Branch: $BRANCH"
echo "📝 Last Commit:    $LAST_COMMIT"
echo "⚠️  Uncommitted:    $STATUS file(s)"
echo "🔄 Divergence:     $DIVERGENCE (ahead behind main)"
echo ""

# Founder Mode goal
cat << 'EOF'
╔════════════════════════════════════════════════════════════════════════╗
║               🎯 FOUNDER MODE — OPERATING GOAL (2026-06-02+)          ║
╚════════════════════════════════════════════════════════════════════════╝

Goal: Peskids → Blueprint → Agency Replication

Decision Gate:
  Q1: Does this help Peskids go live?
  Q2: Does this make Blueprint replicable?
  Q3: Does this measure lead conversion?
  → If NO to all three: STOP. Don't branch. Escalate.

Hard Rules:
  ✗ No K8s, Terraform, multi-cloud
  ✗ No new platform modules or products
  ✗ No autonomous agents, AI memory, marketplace
  ✗ No refactoring unrelated to Founder Mode goal

Branch Naming:
  - peskids/*     ← go-live, production fixes
  - blueprint/*   ← reusable template, extraction
  - agency/*      ← replication, distribution
  - docs/*        ← rules, AGENTS.md updates
  - fix/{goal}/*  ← bug fixes tagged to goal

═══════════════════════════════════════════════════════════════════════════

EOF

# Parse branch name for theme
THEME=""
if [[ $BRANCH =~ ^peskids ]]; then
  THEME="Peskids Go-Live"
elif [[ $BRANCH =~ ^blueprint ]]; then
  THEME="Blueprint Extraction"
elif [[ $BRANCH =~ ^agency ]]; then
  THEME="Agency Replication"
elif [[ $BRANCH =~ ^docs ]]; then
  THEME="Documentation/Rules"
elif [[ $BRANCH =~ ^fix ]]; then
  THEME="Bug Fix (tied to goal)"
else
  THEME="⚠️  Unknown theme (check branch name)"
fi

echo "🏷️  Session Theme: $THEME"
echo ""

# Load blockers/next action from AGENTS.md
if [ -f "$REPO_ROOT/AGENTS.md" ]; then
  NEXT_ACTION=$(grep -A 3 "🔄 Estado Actual\|^## 🔄 Estado" "$REPO_ROOT/AGENTS.md" 2>/dev/null | head -10)
  if [ -n "$NEXT_ACTION" ]; then
    echo "⚡ Current Blockers (from AGENTS.md):"
    echo "$NEXT_ACTION"
  fi
fi

echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo ""
