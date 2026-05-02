#!/usr/bin/env bash
# Auditoría de ramas vs main: sin borrar nada por defecto.
# Uso: ./scripts/git-branch-hygiene.sh [--no-fetch] [--base REF]
# REF por defecto: origin/main
set -euo pipefail

BASE_REF="origin/main"
DO_FETCH=1

usage() {
  sed -n '1,20p' "$0" | tail -n +2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-fetch) DO_FETCH=0 ;;
    --base)
      BASE_REF="${2:-}"
      if [[ -z "$BASE_REF" ]]; then
        echo "error: --base requires a ref" >&2
        exit 2
      fi
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown arg: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

if [[ "$DO_FETCH" -eq 1 ]]; then
  git fetch origin --prune
fi

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "error: base ref not found: $BASE_REF" >&2
  exit 1
fi

echo "== Opsly — higiene de ramas (solo lectura) =="
echo "Base: $BASE_REF ($(git rev-parse --short "$BASE_REF"))"
echo "Rama actual: $(git branch --show-current)"
echo

echo "== Remotas mergeadas en $BASE_REF (candidatas a borrar en GitHub tras confirmar) =="
MERGED=$(git branch -r --merged "$BASE_REF" | sed 's/^[ *]*//' | grep -vE 'HEAD|->' || true)
if [[ -z "${MERGED// /}" ]]; then
  echo "(ninguna rama remota aparece como totalmente mergeada; o no hay remotas de seguimiento)"
else
  echo "$MERGED"
fi
echo

echo "== Divergencia vs $BASE_REF (commits solo-en-base | solo-en-rama) =="
while IFS= read -r ref; do
  [[ -z "$ref" ]] && continue
  case "$ref" in
    origin/HEAD | origin/main) continue ;;
  esac
  pair=$(git rev-list --left-right --count "$BASE_REF"...$ref 2>/dev/null || echo "? ?")
  only_base=$(echo "$pair" | awk '{print $1}')
  only_tip=$(echo "$pair" | awk '{print $2}')
  printf "  %-55s  main< %s  >tip %s\n" "$ref" "$only_base" "$only_tip"
done < <(git for-each-ref --format='%(refname:short)' refs/remotes/origin/ | grep -E '^origin/.+' | sort)

echo
echo "== Siguientes pasos sugeridos =="
echo "1. Integrar trabajo útil vía PR: git checkout -b feat/<tema> origin/main && …"
echo "2. Tras merge en GitHub: Settings → General → Pull Requests → “Automatically delete head branches”."
echo "3. Borrar remota solo si ya está en main: git push origin --delete <rama>"
echo "4. Doc: docs/01-development/GIT-WORKFLOW.md"
