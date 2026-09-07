#!/usr/bin/env bash
# Guard: pre/post compare treats prod health drop as regress, staging as warn.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPARE="${ROOT}/ci/night-cleanup-compare.jq"
REVIEW="${ROOT}/ci/night-cleanup-review.sh"
ORCH="${ROOT}/ci/night-cleanup-and-verify.sh"
VPS="${ROOT}/ci/night-cleanup-vps.sh"

bash -n "${REVIEW}"
bash -n "${ORCH}"
bash -n "${VPS}"

verdict() {
  local pre="$1"
  local post="$2"
  jq -n --argjson pre "${pre}" --argjson post "${post}" '{pre:$pre, post:$post}' \
    | jq -r -f "${COMPARE}"
}

ok_health='{"health":{"api":{"http":200},"peskids":{"http":200},"staging":{"http":200}}}'
if [[ "$(verdict "${ok_health}" "${ok_health}")" != "ok" ]]; then
  echo "expected ok when health holds" >&2
  exit 1
fi

regressed='{"health":{"api":{"http":200},"peskids":{"http":502},"staging":{"http":200}}}'
got="$(verdict "${ok_health}" "${regressed}")"
if [[ "${got}" != regress:*peskids* ]]; then
  echo "expected peskids regress, got ${got}" >&2
  exit 1
fi

staging_drop='{"health":{"api":{"http":200},"peskids":{"http":200},"staging":{"http":0}}}'
got="$(verdict "${ok_health}" "${staging_drop}")"
if [[ "${got}" != warn:*staging* ]]; then
  echo "expected staging warn, got ${got}" >&2
  exit 1
fi

STATE="$(mktemp -d)"
export NIGHT_CLEANUP_FORCE=1
export DRY_RUN=1
export APPLY_MERGED_BRANCHES=0
export CLOSE_STALE_AUTOFIX=0
export NIGHT_CLEANUP_STATE_DIR="${STATE}"
export NIGHT_CLEANUP_ARCHIVE_DIR="${STATE}/archive"
cd "${ROOT}/.."
chmod +x scripts/ci/night-cleanup-and-verify.sh scripts/ci/night-cleanup-review.sh
./scripts/ci/night-cleanup-and-verify.sh
test -f "${STATE}/pre.json"
test -f "${STATE}/post.json"
test -f "${STATE}/report.md"

echo "night-cleanup-and-verify.test.sh ok"
