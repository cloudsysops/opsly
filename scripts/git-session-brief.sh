#!/usr/bin/env bash
# git-session-brief.sh — Resume la rama actual, el tema y si hay mezcla de ámbitos.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then
  echo "## Opsly session brief"
  echo "- No es un repositorio git."
  exit 0
fi

cd "$ROOT"

branch="$(git branch --show-current 2>/dev/null || true)"
if [[ -z "$branch" ]]; then
  branch="detached"
fi

infer_theme() {
  case "$1" in
    main|master|develop)
      echo "base"
      ;;
    feat/*|fix/*|docs/*|chore/*|refactor/*|test/*|perf/*|hotfix/*|release/*)
      echo "${1#*/}"
      ;;
    *)
      echo "$1"
      ;;
  esac
}

slugify() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | tr ' _.' '-' \
    | sed 's/[^a-z0-9/-]\+/-/g; s#//*#/#g; s#^/*##; s#/*$##; s#-*-#-#g; s#--*-#-#g; s#--\+#-#g'
}

theme="$(infer_theme "$branch")"
upstream="$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)"
if [[ -z "$upstream" ]]; then
  upstream="(sin upstream)"
fi

worktree="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

changed_files="$(mktemp)"
areas="$(mktemp)"
cleanup() {
  rm -f "$changed_files" "$areas"
}
trap cleanup EXIT

{
  git diff --name-only --diff-filter=ACMRTUXB HEAD 2>/dev/null || true
  git ls-files --others --exclude-standard 2>/dev/null || true
} | sed '/^$/d' | awk '!seen[$0]++' >"$changed_files"

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  area="${file%%/*}"
  if [[ "$file" != */* ]]; then
    area="root"
  fi
  case "$file" in
    AGENTS.md|VISION.md|ROADMAP.md|README.md|CONTRIBUTING.md|SECURITY.md|CODE_OF_CONDUCT.md|package-lock.json|pnpm-lock.yaml|yarn.lock)
      area="root"
      ;;
  esac
  printf '%s\n' "$area"
done <"$changed_files" | awk '!seen[$0]++' >"$areas"

tree_state="limpio"
if [[ -s "$changed_files" ]]; then
  tree_state="sucio"
fi

area_count="$(wc -l <"$areas" | tr -d ' ')"
areas_list="$(tr '\n' ',' <"$areas" | sed 's/,$//' | sed 's/,/, /g')"

suggested_branch=""
if [[ "$branch" == "main" || "$branch" == "master" || "$branch" == "develop" || "$branch" == "detached" ]]; then
  dominant_area="$(head -n 1 "$areas" 2>/dev/null || true)"
  if [[ -n "$dominant_area" ]]; then
    suggested_branch="feat/$(slugify "$dominant_area")"
  else
    suggested_branch="feat/<tema-corto>"
  fi
else
  prefix="${branch%%/*}"
  if [[ "$prefix" == "$branch" ]]; then
    prefix="feat"
  fi
  suggested_branch="${prefix}/$(slugify "$theme")"
fi

warning=""
if [[ "$branch" == "main" || "$branch" == "master" ]]; then
  if [[ -s "$changed_files" ]]; then
    warning="Estás en main con cambios locales. Crea una rama por tema antes de seguir."
  fi
elif [[ "$area_count" -gt 1 ]]; then
  warning="Hay mezcla de temas en esta sesión. Divide el trabajo por rama o worktree antes de seguir."
fi

echo "## Opsly session brief"
echo "- Rama: ${branch}"
echo "- Tema: ${theme}"
echo "- Upstream: ${upstream}"
echo "- Worktree: ${worktree}"
echo "- Estado del árbol: ${tree_state}"

if [[ -s "$changed_files" ]]; then
echo "- Areas tocadas: ${areas_list}"
else
  echo "- Areas tocadas: (ninguna)"
fi

echo "- Rama sugerida: ${suggested_branch}"

if [[ -n "$warning" ]]; then
  echo "- Recomendacion: ${warning}"
else
  echo "- Recomendacion: mantener esta sesión dentro de un solo tema."
fi
