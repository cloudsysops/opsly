#!/usr/bin/env bash
# Auditoría de ramas (solo lectura). No borra nada en local ni en GitHub.
# Uso: ./scripts/git-branch-hygiene.sh [--no-fetch] [--base origin/main]
set -euo pipefail

FETCH=1
BASE="origin/main"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-fetch) FETCH=0; shift ;;
    --base)
      BASE="${2:?}"
      shift 2
      ;;
    -h | --help)
      echo "Uso: $0 [--no-fetch] [--base <rama>]"
      exit 0
      ;;
    *)
      echo "Opción desconocida: $1" >&2
      exit 1
      ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "No es un repositorio git." >&2
  exit 1
}
cd "$ROOT"

if [[ "$FETCH" -eq 1 ]]; then
  git fetch origin --prune
fi

echo "=== Base: ${BASE} ==="
echo ""
echo "=== Remotas totalmente mergeadas en la base (candidatas a borrar en origin tras revisión) ==="
git branch -r --merged "$BASE" | sed 's/^[* ]*//' | grep -vE 'HEAD|/main$' || true
echo ""
echo "=== Remotas no mergeadas (revisar PR / integrar / archivar) ==="
git branch -r --no-merged "$BASE" | sed 's/^[* ]*//' | grep -v HEAD || true
echo ""
echo "=== Locales con upstream [gone] (se pueden borrar con git branch -d/-D tras confirmar) ==="
git branch -vv | grep ': gone]' || echo "(ninguna)"
echo ""
echo "=== Worktrees ==="
git worktree list || true
echo ""
if command -v gh >/dev/null 2>&1; then
  echo "=== PRs abiertos en GitHub (recuento) ==="
  gh pr list --state open --json number --jq 'length' 2>/dev/null || echo "(gh: sin resultado)"
else
  echo "=== PRs abiertos (omitido: gh no está en PATH) ==="
fi
echo ""
echo "=== Stash local (recuento; el script no borra entradas) ==="
git stash list | wc -l | tr -d ' '
