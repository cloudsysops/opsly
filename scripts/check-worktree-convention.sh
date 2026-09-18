#!/usr/bin/env bash
# Chequeo de convención de worktrees (solo lectura). No borra ni mueve nada.
# Implementa el checklist de anti-colisión de docs/03-agents/WORKTREE-CONVENTION.md:
# "1 worktree = 1 agente + 1 tema", bajo .worktrees/<agente>/<tema>/.
#
# Uso:
#   ./scripts/check-worktree-convention.sh            # reporte (exit 0 siempre)
#   ./scripts/check-worktree-convention.sh --strict    # exit 1 si hay no conformes
set -euo pipefail

STRICT=0
for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=1 ;;
    -h | --help)
      echo "Uso: $0 [--strict]"
      exit 0
      ;;
    *)
      echo "Opción desconocida: $arg" >&2
      exit 1
      ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "No es un repositorio git." >&2
  exit 1
}

echo "=== git worktree list ==="
git worktree list
echo ""

NONCONFORMING=0
while IFS= read -r line; do
  wpath="$(echo "$line" | awk '{print $1}')"
  branch="$(echo "$line" | sed -n 's/.*\[\(.*\)\]/\1/p')"

  # El worktree principal (el propio repo) no aplica a la convención.
  [[ "$wpath" == "$ROOT" ]] && continue

  case "$wpath" in
    "$ROOT"/.worktrees/*/*)
      : # conforme
      ;;
    *)
      NONCONFORMING=$((NONCONFORMING + 1))
      echo "NO CONFORME: $wpath (rama: ${branch:-detached})"
      echo "  Esperado bajo: \$ROOT/.worktrees/<agente>/<tema>/"
      ;;
  esac
done < <(git worktree list | tail -n +1)

echo ""
if [[ "$NONCONFORMING" -eq 0 ]]; then
  echo "OK: todos los worktrees siguen la convención (.worktrees/<agente>/<tema>/)."
else
  echo "AVISO: $NONCONFORMING worktree(s) fuera de convención (ver docs/03-agents/WORKTREE-CONVENTION.md)."
  echo "No se borra ni mueve nada automáticamente — reubicar o dejar constancia en AGENTS.md."
fi

if command -v gh >/dev/null 2>&1; then
  echo ""
  echo "=== PRs abiertos (gh pr list --state open) ==="
  env -u GH_TOKEN -u GITHUB_TOKEN gh pr list --state open --limit 50 \
    --json number,headRefName,isDraft \
    --template '{{range .}}#{{.number}}	{{.headRefName}}{{if .isDraft}} (draft){{end}}
{{end}}' 2>/dev/null || echo "(gh no disponible o sin auth válida — ver docs/03-agents/WORKTREE-CONVENTION.md paso 2.3)"
fi

echo ""
echo "=== Ramas remotas sin mergear en origin/main ==="
git branch -r --no-merged origin/main 2>/dev/null | grep -vE 'HEAD|/main$' || echo "(requiere git fetch origin previo)"

if [[ "$STRICT" -eq 1 && "$NONCONFORMING" -gt 0 ]]; then
  exit 1
fi
