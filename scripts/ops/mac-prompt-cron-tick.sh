#!/usr/bin/env bash
# Cron/LaunchAgent tick: pull Mac runner (ff-only) then validate prompt queue.
# Safe: never executes Markdown as shell; never force-pushes.
# Usage: ./scripts/ops/mac-prompt-cron-tick.sh [--dry-run] [--pull-only] [--validate-only]
set -euo pipefail

DRY_RUN=0
PULL=1
VALIDATE=1
for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN=1 ;;
    --pull-only) VALIDATE=0 ;;
    --validate-only) PULL=0 ;;
    -h|--help)
      sed -n '2,5p' "$0"
      exit 0
      ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROOT="${REPO_ROOT:-${ROOT}}"
cd "${ROOT}"

log() { printf '[mac-prompt-cron] %s\n' "$*"; }
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "start ${TS} root=${ROOT}"

ARGS=()
if [[ "${DRY_RUN}" == "1" ]]; then
  ARGS+=(--dry-run)
fi

pull_rc=0
validate_rc=0

if [[ "${PULL}" == "1" ]]; then
  if bash "${ROOT}/scripts/ops/mac-runner-pull.sh" "${ARGS[@]+"${ARGS[@]}"}"; then
    log "pull ok"
  else
    pull_rc=$?
    log "pull failed rc=${pull_rc}"
  fi
fi

if [[ "${VALIDATE}" == "1" ]]; then
  if bash "${ROOT}/scripts/ops/validate-prompt-queue.sh" "${ARGS[@]+"${ARGS[@]}"}"; then
    log "validate ok"
  else
    validate_rc=$?
    log "validate failed rc=${validate_rc}"
  fi
fi

if [[ "${pull_rc}" -ne 0 || "${validate_rc}" -ne 0 ]]; then
  exit 1
fi
log "done"
exit 0
