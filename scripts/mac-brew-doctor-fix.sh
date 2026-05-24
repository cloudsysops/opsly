#!/usr/bin/env bash
# Fix remaining Homebrew doctor warnings (interactive Terminal; Docker needs sudo).
# Run: ./scripts/mac-brew-doctor-fix.sh
set -euo pipefail

echo "==> Remove deprecated formulae (safe to re-install via brew if needed later)"
brew uninstall --ignore-dependencies \
  icu4c@76 icu4c@77 node@18 node@20 nyx pcre postgresql@14 tmate 2>/dev/null || true
brew uninstall --force terraform 2>/dev/null || true

echo "==> Link kegs that were unlinked"
brew link --overwrite node vercel-cli python@3.14 python@3.13 ollama 2>/dev/null || true

echo "==> Reinstall Docker Desktop (requires sudo for /usr/local/cli-plugins)"
brew reinstall --cask --force docker

echo ""
echo "==> brew doctor"
brew doctor || true
