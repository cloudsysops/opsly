#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[obsidian] repo: $ROOT"
echo "[obsidian] regenerating markdown file index..."
node scripts/update-obsidian-file-index.mjs

echo "[obsidian] regenerating knowledge index..."
bash scripts/index-knowledge.sh

echo "[obsidian] validating documentation structure..."
node scripts/validate-structure.js

echo "[obsidian] ready:"
echo "  vault: $ROOT/docs"
echo "  dashboard: $ROOT/docs/brain/dashboard.md"
echo "  file index: $ROOT/docs/.obsidian/file-index.json"
echo "  knowledge index: $ROOT/config/knowledge-index.json"
