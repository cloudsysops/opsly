#!/usr/bin/env bash
# Indexador Repo-First (wikilinks estilo Obsidian): find *.md → JSON con título, keywords, size_bytes.
# Uso local: ./scripts/index-knowledge.sh
# VPS tras git pull: OPSLY_ROOT=/opt/opsly KNOWLEDGE_INDEX_OUT=/tmp/opsly-knowledge-index.json ./scripts/index-knowledge.sh
# O dejar el índice en repo: KNOWLEDGE_INDEX_OUT=/opt/opsly/config/knowledge-index.json (default si no se define).
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

collect_md_paths() {
  local base="$1"
  find "$base" \( \
    -name node_modules -o \
    -name .git -o \
    -name dist -o \
    -name .next -o \
    -name coverage -o \
    -name .turbo \
    \) -prune -o \
    -type f -name '*.md' -print0
}

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[index-knowledge] DRY_RUN: OUT=$OUT OPSLY_ROOT=$OPSLY_ROOT"
  n="$(find "$OPSLY_ROOT" \( -name node_modules -o -name .git -o -name dist -o -name .next -o -name coverage -o -name .turbo \) -prune -o -type f -name '*.md' -print | wc -l | tr -d ' ')"
  echo "[index-knowledge] DRY_RUN: ${n} archivos .md"
  tmp="$(mktemp)"
  collect_md_paths "$OPSLY_ROOT" | node "$SCRIPT_DIR/generate-knowledge-index.mjs" --stdin0 "$OPSLY_ROOT" >"$tmp"
  head -c 900 "$tmp"
  echo ""
  echo "..."
  rm -f "$tmp"
  exit 0
fi

collect_md_paths "$OPSLY_ROOT" | node "$SCRIPT_DIR/generate-knowledge-index.mjs" --stdin0 "$OPSLY_ROOT" >"${OUT}.tmp"
mv "${OUT}.tmp" "$OUT"
echo "[index-knowledge] Wrote $OUT ($(wc -c <"$OUT" | tr -d ' ') bytes)"
