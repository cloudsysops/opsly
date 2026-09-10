#!/usr/bin/env bash
set -euo pipefail

# Lista el primer archivo en .cursor/prompts/queue/ que declare status: pending.
# Uso: desde el chat, pegar la salida o ejecutar antes de abrir Cursor.
# Ver: docs/01-development/AGENT-PROMPT-QUEUE.md

ROOT="$(git rev-parse --show-toplevel)"
QUEUE="$ROOT/.cursor/prompts/queue"

mkdir -p "$QUEUE"

shopt -s nullglob
files=("$QUEUE"/*.md)
if [ ${#files[@]} -eq 0 ]; then
  echo "Cola vacía: no hay .md en $QUEUE"
  exit 0
fi

for f in "${files[@]}"; do
  if grep -qE '^status:[[:space:]]*pending' "$f" 2>/dev/null; then
    echo "Siguiente pendiente:"
    echo "$f"
    echo "---"
    head -n 120 "$f"
    exit 0
  fi
done

echo "Hay ${#files[@]} archivo(s) en queue/ pero ninguno con «status: pending» en cabecera YAML."
exit 0
