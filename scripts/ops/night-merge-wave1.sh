#!/usr/bin/env bash
# Wave 1: merge the stacked night-merge PR with the operator PAT (triggers Deploy)
# then dispatch Deploy explicitly. No-op outside America/Bogota 22:00–06:00.
# Usage: ./scripts/ops/night-merge-wave1.sh [--dry-run] [--pr 1154]
set -euo pipefail

DRY_RUN=0
PR="${NIGHT_MERGE_WAVE1_PR:-1154}"
REPO="${GITHUB_REPOSITORY:-cloudsysops/opsly}"
STATE_DIR="${OPSLY_NIGHT_AGENT_STATE:-${HOME}/Library/Logs/opsly}"
STATE_FILE="${STATE_DIR}/night-merge-wave1.day"

for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN=1 ;;
    --pr=*) PR="${arg#*=}" ;;
    -h|--help)
      sed -n '2,5p' "$0"
      exit 0
      ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

mkdir -p "${STATE_DIR}"
log() { printf '[wave1] %s\n' "$*"; }
notify() { ./scripts/notify-discord.sh "$1" "$2" "${3:-info}" >/dev/null 2>&1 || true; }

if ! node scripts/ci/check-production-change-window.mjs --check-now >/dev/null 2>&1; then
  log "outside America/Bogota night window — no-op"
  exit 0
fi

day="$(TZ=America/Bogota date +%F)"
if [[ -f "${STATE_FILE}" ]] && grep -qx "${day}" "${STATE_FILE}"; then
  log "already ran wave1 for ${day}"
  exit 0
fi

if ! gh pr view "${PR}" --repo "${REPO}" --json state --jq '.state' | grep -qx OPEN; then
  log "PR #${PR} is not OPEN — nothing to merge"
  printf '%s\n' "${day}" >"${STATE_FILE}"
  exit 0
fi

if [[ "${DRY_RUN}" == "1" ]]; then
  log "DRY_RUN would squash-merge #${PR} then gh workflow run Deploy"
  exit 0
fi

log "squash-merging #${PR} (operator token — unlike GITHUB_TOKEN this can trigger Deploy)"
gh pr merge "${PR}" --repo "${REPO}" --squash --delete-branch
sleep 3
sha="$(gh api "repos/${REPO}/commits/main" --jq '.sha')"
log "main@${sha:0:7} — dispatching Deploy"
gh workflow run Deploy --repo "${REPO}" --ref main -f skip_tests=false || true
notify "✅ Night merge wave1" "Merged #${PR} → main@${sha:0:7}; Deploy dispatched" success
printf '%s\n' "${day}" >"${STATE_FILE}"
log "done"
