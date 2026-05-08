#!/usr/bin/env bash
set -euo pipefail

# Create Opsly fixed environment/module branches.
# Default is dry-run; pass --apply to create locally, and --push to push upstream.

MODULES=(api admin portal orchestrator llm mcp infra billing tenant docs skills)
REMOTE="origin"
APPLY=0
PUSH=0
BASE_BRANCH="main"
STAGING_BRANCH="staging"

usage() {
  cat <<USAGE
Usage: $0 [--apply] [--push] [--remote origin] [--base main]

Creates fixed branches:
  - staging
  - module/{api,admin,portal,orchestrator,llm,mcp,infra,billing,tenant,docs,skills}

Default mode prints commands only. Use --apply for local branches and --push to publish.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      APPLY=1
      shift
      ;;
    --push)
      APPLY=1
      PUSH=1
      shift
      ;;
    --remote)
      REMOTE="${2:-}"
      shift 2
      ;;
    --base)
      BASE_BRANCH="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

run() {
  printf '+ %q' "$@"
  printf '\n'
  if [[ "$APPLY" -eq 1 ]]; then
    "$@"
  fi
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository" >&2
  exit 1
fi

if [[ "$APPLY" -eq 1 && -n "$(git status --porcelain)" ]]; then
  echo "Working tree has changes; commit or stash before creating branches." >&2
  exit 1
fi

run git fetch "$REMOTE" --prune

BASE_REF="${REMOTE}/${BASE_BRANCH}"
if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
  echo "Base ref not found: $BASE_REF" >&2
  exit 1
fi

run git checkout -B "$STAGING_BRANCH" "$BASE_REF"
if [[ "$PUSH" -eq 1 ]]; then
  run git push -u "$REMOTE" "$STAGING_BRANCH"
fi

MODULE_BASE_REF="${REMOTE}/${STAGING_BRANCH}"
if ! git rev-parse --verify --quiet "$MODULE_BASE_REF" >/dev/null; then
  MODULE_BASE_REF="$STAGING_BRANCH"
fi

for module in "${MODULES[@]}"; do
  branch="module/${module}"
  run git checkout -B "$branch" "$MODULE_BASE_REF"
  if [[ "$PUSH" -eq 1 ]]; then
    run git push -u "$REMOTE" "$branch"
  fi
done

run git checkout "$STAGING_BRANCH"

echo "Done. Next: protect main, staging and module/* in GitHub branch rules."
