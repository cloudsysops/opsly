#!/usr/bin/env bash
# Archiva metadata de ramas viejas y opcionalmente las borra (remoto mergeado / local [gone]).
# Siempre corre auditoría primero; por defecto --dry-run (no borra).
#
# Uso:
#   ./scripts/git-branch-cleanup.sh                    # dry-run + archivo en docs/
#   ./scripts/git-branch-cleanup.sh --apply-merged     # borra remotas ya mergeadas en base
#   ./scripts/git-branch-cleanup.sh --apply-local-gone   # borra locales con upstream gone
#   ./scripts/git-branch-cleanup.sh --apply-all          # ambos (tras archivo)
#
# Ver también: ./scripts/git-branch-hygiene.sh (solo lectura)
set -euo pipefail

BASE="${BASE:-origin/main}"
FETCH=1
DRY_RUN=1
APPLY_MERGED_REMOTE=0
APPLY_LOCAL_GONE=0
ARCHIVE_ROOT=""

usage() {
  cat <<'EOF'
Uso: ./scripts/git-branch-cleanup.sh [opciones]

  --dry-run              Solo listar y archivar (default)
  --apply-merged         Borrar ramas remotas totalmente mergeadas en --base
  --apply-local-gone     Borrar ramas locales con upstream [gone]
  --apply-all            --apply-merged + --apply-local-gone
  --no-fetch             No ejecutar git fetch --prune
  --base <ref>           Rama base (default: origin/main)
  --archive-dir <path>   Carpeta de archivo (default: docs/01-development/archive/git-branches/YYYY-MM-DD)

Protegidas: main/master, HEAD, rama actual, ramas con PR abierto en GitHub.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --apply-merged) DRY_RUN=0; APPLY_MERGED_REMOTE=1; shift ;;
    --apply-local-gone) DRY_RUN=0; APPLY_LOCAL_GONE=1; shift ;;
    --apply-all) DRY_RUN=0; APPLY_MERGED_REMOTE=1; APPLY_LOCAL_GONE=1; shift ;;
    --no-fetch) FETCH=0; shift ;;
    --base) BASE="${2:?}"; shift 2 ;;
    --archive-dir) ARCHIVE_ROOT="${2:?}"; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    *)
      echo "Opción desconocida: $1" >&2
      usage
      exit 1
      ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "No es un repositorio git." >&2
  exit 1
}
cd "$ROOT"

if [[ -z "$ARCHIVE_ROOT" ]]; then
  ARCHIVE_ROOT="docs/01-development/archive/git-branches/$(date -u +%Y-%m-%d)"
fi
mkdir -p "$ARCHIVE_ROOT"

CURRENT="$(git branch --show-current 2>/dev/null || true)"
PROTECTED_FILE="$ARCHIVE_ROOT/protected-branches.txt"
: >"$PROTECTED_FILE"
echo "main" >>"$PROTECTED_FILE"
echo "master" >>"$PROTECTED_FILE"
[[ -n "$CURRENT" ]] && echo "$CURRENT" >>"$PROTECTED_FILE"

if command -v gh >/dev/null 2>&1; then
  gh pr list --state open --json headRefName --jq '.[].headRefName' 2>/dev/null >>"$PROTECTED_FILE" || true
fi

is_protected() {
  local name="$1"
  local short="${name#origin/}"
  while IFS= read -r p; do
    [[ -z "$p" ]] && continue
    if [[ "$short" == "$p" ]]; then
      return 0
    fi
  done <"$PROTECTED_FILE"
  return 1
}

archive_branch_ref() {
  local ref="$1"
  local label="$2"
  local safe
  safe="$(echo "$label" | tr '/:' '__')"
  local dir="$ARCHIVE_ROOT/$safe"
  mkdir -p "$dir"
  {
    echo "# Archive: $label"
    echo "ref=$ref"
    echo "archived_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    echo "## Last commit"
    git log -1 "$ref" --format=fuller 2>/dev/null || echo "(no log)"
    echo ""
    echo "## Commits not in $BASE"
    git log "$BASE..$ref" --oneline 2>/dev/null || echo "(none or unreachable)"
    echo ""
    echo "## Diff stat vs $BASE"
    git diff "$BASE...$ref" --stat 2>/dev/null || git diff "$BASE" "$ref" --stat 2>/dev/null || echo "(no diff)"
  } >"$dir/summary.md"
}

if [[ "$FETCH" -eq 1 ]]; then
  git fetch origin --prune
fi

echo "=== Git branch cleanup ==="
echo "base=$BASE dry_run=$([[ $DRY_RUN -eq 1 ]] && echo true || echo false)"
echo "archive=$ARCHIVE_ROOT"
echo ""

MERGED_LIST="$ARCHIVE_ROOT/merged-remote-candidates.txt"
GONE_LIST="$ARCHIVE_ROOT/local-gone-candidates.txt"
: >"$MERGED_LIST"
: >"$GONE_LIST"

echo "=== Remotas mergeadas (candidatas) ==="
while IFS= read -r br; do
  br="${br#"${br%%[![:space:]]*}"}"
  br="${br%"${br##*[![:space:]]}"}"
  [[ -z "$br" ]] && continue
  if is_protected "$br"; then
    echo "  skip (protected) $br"
    continue
  fi
  echo "$br" >>"$MERGED_LIST"
  echo "  archive $br"
  archive_branch_ref "$br" "${br#origin/}"
  if [[ "$APPLY_MERGED_REMOTE" -eq 1 ]]; then
    remote="${br#origin/}"
    echo "  DELETE remote $remote"
    git push origin --delete "$remote"
  fi
done < <(git branch -r --merged "$BASE" | sed 's/^[* ]*//' | grep -vE 'HEAD|/main$|/master$' || true)

echo ""
echo "=== Locales [gone] (candidatas) ==="
while IFS= read -r line; do
  [[ "$line" != *"[gone]"* ]] && continue
  local_branch="$(echo "$line" | sed 's/^[* ]*//' | awk '{print $1}')"
  [[ -z "$local_branch" ]] && continue
  if is_protected "$local_branch"; then
    echo "  skip (protected) $local_branch"
    continue
  fi
  echo "$local_branch" >>"$GONE_LIST"
  echo "  archive local $local_branch"
  archive_branch_ref "$local_branch" "local/$local_branch"
  if [[ "$APPLY_LOCAL_GONE" -eq 1 ]]; then
    echo "  DELETE local $local_branch"
    git branch -D "$local_branch"
  fi
done < <(git branch -vv || true)

echo ""
echo "=== Resumen ==="
merged_count=$(wc -l <"$MERGED_LIST" | tr -d ' ')
gone_count=$(wc -l <"$GONE_LIST" | tr -d ' ')
echo "mergeadas remotas archivadas: $merged_count (lista: $MERGED_LIST)"
echo "locales gone archivadas:     $gone_count (lista: $GONE_LIST)"
echo "protegidas:                  $PROTECTED_FILE"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo ""
  echo "Dry-run: no se borró nada. Para aplicar:"
  echo "  $0 --apply-merged        # solo remotas ya en main"
  echo "  $0 --apply-local-gone    # solo locales [gone]"
  echo "  $0 --apply-all           # ambos"
fi

echo ""
./scripts/git-branch-hygiene.sh --no-fetch --base "$BASE" || true
