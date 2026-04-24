#!/usr/bin/env bash
# Sincroniza el clon Opsly con origin (fast-forward) en la rama indicada o la actual.
# Uso en opsly-admin, opsly-worker (repo ~/opsly) y VPS (/opt/opsly) antes de cambios o arranque de servicios.
#
#   ./scripts/git-sync-repo.sh
#   ./scripts/git-sync-repo.sh /ruta/al/repo
#   ./scripts/git-sync-repo.sh /ruta/al/repo main
#   OPSLY_REPO=/opt/opsly ./scripts/git-sync-repo.sh
#   DRY_RUN=1 ./scripts/git-sync-repo.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "${1:-${OPSLY_REPO:-$SCRIPT_DIR/..}}" && pwd)"
BRANCH="${2:-}"

if [[ ! -d "$REPO/.git" ]]; then
  echo "git-sync-repo: no es un repo git: $REPO" >&2
  exit 1
fi

cd "$REPO"

if [[ -z "$BRANCH" ]]; then
  BRANCH="$(git branch --show-current 2>/dev/null || true)"
  if [[ -z "$BRANCH" ]]; then
    echo "git-sync-repo: no hay rama actual; indica la rama como segundo argumento" >&2
    exit 1
  fi
fi

REMOTE="${OPSLY_GIT_REMOTE:-origin}"

if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "DRY_RUN: would run in $REPO → git fetch $REMOTE $BRANCH && git pull --ff-only $REMOTE $BRANCH"
  exit 0
fi

echo "git-sync-repo: $REPO (rama $BRANCH, remote $REMOTE)"
git fetch "$REMOTE" "$BRANCH"
git pull --ff-only "$REMOTE" "$BRANCH"
echo "git-sync-repo: OK $(git log -1 --oneline)"
