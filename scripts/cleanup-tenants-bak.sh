#!/usr/bin/env bash
# Cleanup script for tenants.bak directory (requires root or sudo)
# Usage: sudo bash scripts/cleanup-tenants-bak.sh

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT" || exit 1

echo "🧹 Cleaning up tenants.bak directory..."

if [ ! -d "tenants.bak" ]; then
  echo "✓ tenants.bak/ already removed or not present"
  exit 0
fi

# Remove with force flag
rm -rf tenants.bak/

if [ ! -d "tenants.bak" ]; then
  echo "✅ tenants.bak/ successfully removed"

  # Verify structure validation passes
  echo "🧭 Validating repository structure..."
  npm run validate-structure --silent

  echo "✨ Ready to delete obsolete branches:"
  echo "  - codex/merge-vps-local-runtime-2026-05-15"
  echo "  - feat/agent-apps-mcp-2026-05-15"
  echo "  - backup/main-before-bypass-20260513-214923"
  echo ""
  echo "Run: git push origin --delete codex/merge-vps-local-runtime-2026-05-15 feat/agent-apps-mcp-2026-05-15 backup/main-before-bypass-20260513-214923"
else
  echo "❌ Failed to remove tenants.bak/"
  exit 1
fi
