#!/bin/bash
# scripts/verify-all-tools.sh - Verify all tools & plugins
set -euo pipefail

echo "VERIFYING ALL TOOLS & PLUGINS"
echo "=============================="

# Node/NPM
node --version > /dev/null && echo "Node.js: OK" || echo "Node.js: MISSING"
npm --version > /dev/null && echo "npm: OK" || echo "npm: MISSING"
pnpm --version > /dev/null && echo "pnpm: OK" || echo "pnpm: MISSING"

# Languages
python3 --version > /dev/null && echo "Python 3: OK" || echo "Python 3: MISSING"
git --version > /dev/null && echo "Git: OK" || echo "Git: MISSING"

# Container
docker --version > /dev/null && echo "Docker: OK" || echo "Docker: MISSING"
docker-compose --version > /dev/null && echo "Docker Compose: OK" || echo "Docker Compose: MISSING"

# SSH
[ -f ~/.ssh/id_ed25519 ] && echo "SSH key: OK" || echo "SSH key: MISSING"
[ -d .git ] && echo "Git repo: OK" || echo "Git repo: MISSING"

# Monorepo
npm list @intcloudsysops/orchestrator > /dev/null 2>&1 && echo "Orchestrator: OK" || echo "Orchestrator: MISSING"

# Python tools
source ~/.venv/opsly/bin/activate 2>/dev/null || true
python3 -c "import notebooklm" 2>/dev/null && echo "notebooklm-py: OK" || echo "notebooklm-py: MISSING"
python3 -c "import playwright" 2>/dev/null && echo "playwright: OK" || echo "playwright: MISSING"

# Doppler
doppler --version > /dev/null 2>&1 && echo "Doppler CLI: OK" || echo "Doppler CLI: MISSING"

# Scripts
[ -f scripts/hermes-local.sh ] && echo "Hermes script: OK" || echo "Hermes script: MISSING"
[ -f scripts/deploy-vps.sh ] && echo "Deploy script: OK" || echo "Deploy script: MISSING"
[ -f scripts/validate-monitoring.sh ] && echo "Monitoring script: OK" || echo "Monitoring script: MISSING"

# Cursor settings
[ -f .cursor/settings.json ] && echo "Cursor settings: OK" || echo "Cursor settings: MISSING"
[ -f .cursor/extensions.json ] && echo "Cursor extensions: OK" || echo "Cursor extensions: MISSING"

# Git hooks
[ -x .githooks/pre-commit ] && echo "Pre-commit hook: OK" || echo "Pre-commit hook: MISSING"

# Docker compose files
[ -f infra/docker-compose.hermes.yml ] && echo "Hermes compose: OK" || echo "Hermes compose: MISSING"
[ -f infra/docker-compose.platform.yml ] && echo "Platform compose: OK" || echo "Platform compose: MISSING"

# MCP docs
[ -f docs/MCP-SERVERS.md ] && echo "MCP servers doc: OK" || echo "MCP servers doc: MISSING"

echo ""
echo "=============================="
echo "VERIFICATION COMPLETE"
echo ""
echo "Next: npm run build"
