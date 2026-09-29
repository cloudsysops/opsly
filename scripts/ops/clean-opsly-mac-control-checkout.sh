#!/usr/bin/env bash
# Safe cleanup of a dirty opsly-control checkout on the Mac (or any opsly-admin host).
# Purpose: unblock the out-of-band Mac runner recovery (PR #1657) whose "Verify Mac
# control checkout clean" gate fails with BLOCKER_OPSLY_CONTROL_DIRTY_WORKTREE.
#
# What it does (idempotent, reversible):
#   1. Locate the opsly-control checkout and verify its origin is cloudsysops/opsly-control.
#   2. Stash ALL dirty state (tracked deletions + untracked) so nothing is lost.
#   3. Restore the tracked control/*.request files to HEAD.
#   4. Remove leftover untracked dirs/files ONLY if they are not inside the stash.
#   5. Verify `git status --porcelain` is empty.
#
# Safety:
#   - Never deletes the stash; the operator can inspect/apply it afterwards.
#   - Requires `--apply` to actually mutate the worktree; default is dry-run.
#   - Does NOT touch main repo opsly, does NOT push anything.
#
# Usage (on the Mac):
#   ./scripts/ops/clean-opsly-mac-control-checkout.sh            # dry-run
#   ./scripts/ops/clean-opsly-mac-control-checkout.sh --apply    # apply cleanup
#   OPSLY_CONTROL_REPO=/path/to/opsly-control ./script.sh --apply --stash-name my_evidence
#
set -euo pipefail

APPLY=false
STASH_NAME="opsly-control-clean-$(date -u +%Y%m%dT%H%M%SZ)"
REPO="${OPSLY_CONTROL_REPO:-}"

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    --stash-name=*) STASH_NAME="${arg#*=}" ;;
    -h|--help)
      sed -n '2,24p' "$0"
      exit 0
      ;;
  esac
done
args=("$@")
for i in "${!args[@]}"; do
  if [[ "${args[$i]}" == "--stash-name" && -n "${args[$((i + 1))]:-}" ]]; then STASH_NAME="${args[$((i + 1))]}"; fi
done

log() { echo "[opsly-control-clean] $*"; }

# --- locate checkout ----------------------------------------------------
if [[ -z "$REPO" ]]; then
  for candidate in "$HOME/opsly-control" "$HOME/src/opsly-control" "$HOME/Projects/opsly-control" "$HOME/Documents/opsly-control"; do
    if [[ -d "$candidate/.git" ]]; then REPO="$candidate"; break; fi
  done
fi
if [[ -z "$REPO" ]]; then
  REPO="$(find "$HOME" -maxdepth 4 -type d -name opsly-control -exec test -d '{}/.git' ';' -print -quit 2>/dev/null || true)"
fi
if [[ -z "$REPO" || ! -d "$REPO/.git" ]]; then
  log "ERROR: opsly-control checkout not found (OPSLY_CONTROL_REPO=${OPSLY_CONTROL_REPO:-})" >&2
  exit 78
fi
log "repo: $REPO"

# --- verify origin ------------------------------------------------------
ORIGIN="$(git -C "$REPO" remote get-url origin 2>/dev/null || true)"
case "$ORIGIN" in
  *cloudsysops/opsly-control*) log "origin OK: $ORIGIN" ;;
  *) log "ERROR: unexpected origin '$ORIGIN' — refusing" >&2; exit 78 ;;
esac

# --- inspect current dirty state ---------------------------------------
cd "$REPO"
STATUS="$(git status --porcelain)"
if [[ -z "$STATUS" ]]; then
  log "worktree already clean; nothing to do"
  exit 0
fi
log "-- dirty state before cleanup --"
git status --short | head -50

# --- captured evidence: stash (never dropped) --------------------------
if [[ "$APPLY" == "true" ]]; then
  log "stashing ALL changes (tracked + untracked) as: ${STASH_NAME}"
  git stash push -u -m "${STASH_NAME}"
  log "stash list:"
  git stash list | head -5
fi

# --- restore tracked deletions of control/*.request --------------------
TRACKED_DELETED="$(git status --porcelain | awk '$1=="D"{print $2}' | grep '^control/.*\.request$' || true)"
if [[ -n "$TRACKED_DELETED" ]]; then
  log "-- restoring tracked deletions --"
  while IFS= read -r f; do
    if [[ "$APPLY" == "true" ]]; then
      git restore --source=HEAD --staged --worktree -- "$f" && log "restored: $f"
    else
      log "[dry-run] would restore: $f"
    fi
  done <<<"$TRACKED_DELETED"
fi

# --- leftover untracked outside stash scope ----------------------------
UNTRACKED="$(git status --porcelain | awk '$1=="??"{print substr($0,4)}' || true)"
if [[ -n "$UNTRACKED" ]]; then
  log "-- untracked entries (left untouched for manual review) --"
  echo "$UNTRACKED" | head -50
  if [[ "$APPLY" == "true" ]]; then
    log "NOTE: untracked entries were included in the stash above. To remove leftovers"
    log "      that are still present after stashing, run:  git clean -fd --dry-run"
  fi
fi

# --- verify -------------------------------------------------------------
if [[ "$APPLY" == "true" ]]; then
  REMAIN="$(git status --porcelain)"
  if [[ -z "$REMAIN" ]]; then
    log "SUCCESS: opsly-control worktree is clean"
    log "Next: re-run the recovery workflow (PR #1657) — the Verify-clean gate should pass."
  else
    log "WARN: still dirty after cleanup:"
    git status --short | head -30
    log "Review untracked leftovers manually (evidence is safe in stash '${STASH_NAME}')."
    exit 2
  fi
else
  log "dry-run: no changes made. Re-run with --apply to perform the cleanup."
fi