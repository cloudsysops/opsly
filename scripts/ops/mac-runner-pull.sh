#!/usr/bin/env bash
# Fast-forward pull for the Mac runner (or REPO_ROOT). Safe: no force, no reset.
# Usage: ./scripts/ops/mac-runner-pull.sh [--dry-run] [--branch main]
set -euo pipefail

DRY_RUN=0
BRANCH="${NIGHT_QUEUE_TRUSTED_BRANCH:-main}"
for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN=1 ;;
    --branch)
      echo "use: --branch=NAME" >&2
      exit 2
      ;;
    --branch=*) BRANCH="${arg#--branch=}" ;;
    -h|--help)
      sed -n '2,4p' "$0"
      exit 0
      ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROOT="${REPO_ROOT:-${ROOT}}"
cd "${ROOT}"

log() { printf '[mac-pull] %s\n' "$*"; }

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "not a git work tree: ${ROOT}"
  exit 1
fi

current="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
if [[ "${current}" != "${BRANCH}" ]]; then
  log "refusing pull — checked out '${current}', expected '${BRANCH}'"
  exit 0
fi

dirty="$(git status --porcelain 2>/dev/null || true)"
if [[ -n "${dirty}" ]]; then
  log "working tree dirty — skipping pull (ff-only requires clean tree)"
  exit 0
fi

if [[ "${DRY_RUN}" == "1" ]]; then
  log "DRY_RUN would: git fetch origin ${BRANCH} && git pull --ff-only origin ${BRANCH}"
  exit 0
fi

git fetch origin "${BRANCH}"
before="$(git rev-parse HEAD)"
if git pull --ff-only origin "${BRANCH}"; then
  after="$(git rev-parse HEAD)"
  if [[ "${before}" == "${after}" ]]; then
    log "already up to date (${after:0:9})"
  else
    log "pulled ${before:0:9} → ${after:0:9}"
  fi
else
  log "pull --ff-only failed (diverged or offline)"
  exit 1
fi
