#!/usr/bin/env bash
# Monitorea cambios en docs/ y AGENTS.md; tras un periodo estable hace commit y push a origin main.
# Uso en VPS: systemd (ver docs/AUTO-PUSH-WATCHER.md). Variables: REPO_ROOT, POLL_SEC, DEBOUNCE.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="${REPO_ROOT:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
POLL_SEC="${POLL_SEC:-30}"
DEBOUNCE="${DEBOUNCE:-10}"
BRANCH="${WATCH_BRANCH:-main}"
DRY_RUN="${DRY_RUN:-false}"
NO_VERIFY="${NO_VERIFY:-false}"

usage() {
  cat <<'EOF'
Usage: auto-push-watcher.sh [options]

Options:
  --dry-run       Log actions only; no git write or push
  --debounce N    Seconds to wait after last detected change (default: 10)
  --poll N        Seconds between status checks (default: 30)
  --branch NAME   Only run on this branch (default: main)
  --no-verify     Pass --no-verify to git commit (evita hooks; usar con cuidado)
  -h, --help      This help

Environment:
  REPO_ROOT, POLL_SEC, DEBOUNCE, WATCH_BRANCH, DRY_RUN, NO_VERIFY
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      export DRY_RUN
      shift
      ;;
    --debounce)
      DEBOUNCE="${2:?}"
      shift 2
      ;;
    --poll)
      POLL_SEC="${2:?}"
      shift 2
      ;;
    --branch)
      BRANCH="${2:?}"
      shift 2
      ;;
    --no-verify)
      NO_VERIFY=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1 (try --help)"
      ;;
  esac
done

require_cmd git

cd "${REPO_ROOT}"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  die "Not a git repository: ${REPO_ROOT}"
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${current_branch}" != "${BRANCH}" ]]; then
  log_warn "Current branch is '${current_branch}', expected '${BRANCH}'. Exiting (no watch)."
  exit 0
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  die "No git remote 'origin' configured"
fi

trap 'log_info "Daemon detenido"; exit 0' INT TERM

paths_dirty() {
  # Porcelain for watched paths only
  git status --porcelain -- docs/ AGENTS.md 2>/dev/null | grep -q .
}

commit_and_push() {
  local verify_args=()
  if [[ "${NO_VERIFY}" == "true" ]]; then
    verify_args=(--no-verify)
  fi

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: would git add docs/ AGENTS.md"
    if paths_dirty; then
      log_info "DRY-RUN: would git commit and git push origin ${BRANCH}"
    fi
    return 0
  fi

  if ! paths_dirty; then
    return 0
  fi

  git add docs/ AGENTS.md
  if git diff --cached --quiet; then
    log_info "Nothing to stage after add; skip commit"
    return 0
  fi

  git commit "${verify_args[@]}" -m "chore(watch): auto-sync docs and AGENTS.md"
  git push origin "${BRANCH}"
  log_info "Pushed watched paths to origin ${BRANCH}"
}

log_info "Watching ${REPO_ROOT} (branch ${BRANCH}, poll ${POLL_SEC}s, debounce ${DEBOUNCE}s)"

while true; do
  sleep "${POLL_SEC}"
  if ! paths_dirty; then
    continue
  fi
  log_info "Changes under docs/ or AGENTS.md; debouncing ${DEBOUNCE}s…"
  sleep "${DEBOUNCE}"
  if ! paths_dirty; then
    log_info "Working tree clean after debounce; skip"
    continue
  fi
  commit_and_push || log_warn "commit/push failed; will retry on next cycle"
done
