#!/usr/bin/env bash
# Indexador Repo-First (estilo Obsidian): escanea docs/ y AGENTS.md / VISION.md → JSON de topics.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OPSLY_ROOT="${OPSLY_ROOT:-$REPO_ROOT}"
OUT="${KNOWLEDGE_INDEX_OUT:-$REPO_ROOT/config/knowledge-index.json}"

DRY_RUN="${DRY_RUN:-false}"
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

mkdir -p "$(dirname "$OUT")"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[index-knowledge] DRY_RUN: would write to $OUT from OPSLY_ROOT=$OPSLY_ROOT"
  node "$SCRIPT_DIR/generate-knowledge-index.mjs" "$OPSLY_ROOT" | head -c 400
  echo "..."
  exit 0
fi

node "$SCRIPT_DIR/generate-knowledge-index.mjs" "$OPSLY_ROOT" >"${OUT}.tmp"
mv "${OUT}.tmp" "$OUT"
echo "[index-knowledge] Wrote $OUT"
