#!/usr/bin/env bash
# Sincroniza el clon Opsly con origin (checkout opcional + fast-forward).
# Uso: ./scripts/git-sync-repo.sh [REPO] [BRANCH]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT_DEFAULT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO="$(cd "${1:-${OPSLY_REPO:-$REPO_ROOT_DEFAULT}}" && pwd)"
TARGET_BRANCH="${2:-}"

if [[ ! -d "$REPO/.git" ]]; then
  echo "git-sync-repo: no es un repo git: $REPO" >&2
  exit 1
fi

cd "$REPO"

if [[ -z "$TARGET_BRANCH" ]]; then
  TARGET_BRANCH="$(git branch --show-current 2>/dev/null || true)"
  if [[ -z "$TARGET_BRANCH" ]]; then
    echo "git-sync-repo: no hay rama actual; indica la rama como segundo argumento" >&2
    exit 1
  fi
fi

REMOTE="${OPSLY_GIT_REMOTE:-origin}"
CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || true)"

if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  echo "git-sync-repo: working tree sucio en $REPO — commit, stash o restore antes de sincronizar" >&2
  git status -sb >&2 || true
  exit 1
fi

if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "DRY_RUN: repo=$REPO current=$CURRENT_BRANCH target=$TARGET_BRANCH"
  echo "DRY_RUN: git fetch $REMOTE $TARGET_BRANCH"
  if [[ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]]; then
    echo "DRY_RUN: git checkout $TARGET_BRANCH"
  fi
  echo "DRY_RUN: git pull --ff-only $REMOTE $TARGET_BRANCH"
  exit 0
fi

echo "git-sync-repo: $REPO → rama $TARGET_BRANCH (remote $REMOTE)"
git fetch "$REMOTE" "$TARGET_BRANCH"

if [[ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]]; then
  if ! git show-ref --verify --quiet "refs/remotes/${REMOTE}/${TARGET_BRANCH}"; then
    echo "git-sync-repo: no existe ${REMOTE}/${TARGET_BRANCH}" >&2
    exit 1
  fi
  git checkout "$TARGET_BRANCH"
fi

git pull --ff-only "$REMOTE" "$TARGET_BRANCH"
echo "git-sync-repo: OK $(git rev-parse --short HEAD) $(git log -1 --oneline)"
