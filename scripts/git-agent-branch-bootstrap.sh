#!/usr/bin/env bash
# Idempotent: create long-lived agent branches on the remote if missing.
# See: docs/01-development/GIT-WORKFLOW.md (flujo multi-agente).
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/git-agent-branch-bootstrap.sh [--dry-run] [--remote NAME] [--base BRANCH] [--with-staging]

Creates on the remote (if missing):
  local/claude, local/cursor, local/codex

Options:
  --dry-run       Print actions only; no push.
  --remote NAME   Remote name (default: origin, or GIT_AGENT_BOOTSTRAP_REMOTE).
  --base BRANCH   Base branch on remote (default: main, or GIT_AGENT_BOOTSTRAP_BASE).
  --with-staging  Also create refs/heads/staging from base if staging does not exist.

Examples:
  ./scripts/git-agent-branch-bootstrap.sh --dry-run
  ./scripts/git-agent-branch-bootstrap.sh --with-staging
EOF
}

DRY_RUN=0
REMOTE="${GIT_AGENT_BOOTSTRAP_REMOTE:-origin}"
BASE_BRANCH="${GIT_AGENT_BOOTSTRAP_BASE:-main}"
WITH_STAGING=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --remote)
      REMOTE="$2"
      shift
      ;;
    --base)
      BASE_BRANCH="$2"
      shift
      ;;
    --with-staging) WITH_STAGING=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

remote_head_exists() {
  git ls-remote --heads "$REMOTE" "$1" | grep -q .
}

log() {
  printf '%s\n' "$*"
}

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  echo "Remote not found: $REMOTE" >&2
  exit 1
fi

log "Fetching ${REMOTE}/${BASE_BRANCH} ..."
if [[ "$DRY_RUN" -eq 1 ]]; then
  log "[dry-run] git fetch ${REMOTE} ${BASE_BRANCH}"
else
  git fetch "$REMOTE" "$BASE_BRANCH"
fi

BASE_REF="refs/remotes/${REMOTE}/${BASE_BRANCH}"
if [[ "$DRY_RUN" -eq 0 ]] && ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "Missing remote-tracking branch ${BASE_REF}. Run: git fetch ${REMOTE} ${BASE_BRANCH}" >&2
  exit 1
fi

create_ref_if_missing() {
  local head="$1"
  local desc="$2"
  if remote_head_exists "$head"; then
    log "OK: ${REMOTE}/${head} already exists"
    return 0
  fi
  log "Creating ${REMOTE}/${head} from ${REMOTE}/${BASE_BRANCH} (${desc})"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "[dry-run] git push ${REMOTE} ${BASE_REF}:refs/heads/${head}"
  else
    git push "$REMOTE" "${BASE_REF}:refs/heads/${head}"
  fi
}

if [[ "$WITH_STAGING" -eq 1 ]]; then
  create_ref_if_missing "staging" "optional integration branch"
fi

for agent in claude cursor codex; do
  create_ref_if_missing "local/${agent}" "agent integration"
done

log "Done."
