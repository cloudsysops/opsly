#!/usr/bin/env bash
# Wait for Bogotá night window, then squash-merge night-merge PRs in order.
# Usage:
#   ./scripts/ops/night-merge-wait.sh --prs 1178,1161
#   ./scripts/ops/night-merge-wait.sh --prs 1178,1161 --dry-run
set -euo pipefail

PRS=()
DRY_RUN=false
REPO="${GITHUB_REPOSITORY:-cloudsysops/opsly}"
LOG="${OPSLY_NIGHT_MERGE_LOG:-/tmp/opsly-night-merge-wait.log}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prs)
      IFS=',' read -r -a PRS <<<"${2:-}"
      shift 2
      ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "Unknown: $1" >&2; exit 1 ;;
  esac
done

if [[ ${#PRS[@]} -eq 0 ]]; then
  echo "ERROR: --prs required" >&2
  exit 1
fi

exec >>"$LOG" 2>&1
echo "[night-merge] start $(TZ=America/Bogota date) prs=${PRS[*]}"

while true; do
  # Force decimal: leading zeros make bash treat HHMM as octal (0607 → wrong window).
  H=$(TZ=America/Bogota date +%H%M)
  H10=$((10#$H))
  if [[ "$H10" -ge 2200 || "$H10" -lt 600 ]]; then
    echo "[night-merge] window open H=$H (dec=$H10)"
    break
  fi
  echo "[night-merge] wait H=$H (dec=$H10)"
  sleep 120
done

merge_one() {
  local n="$1"
  local state
  state=$(gh api "repos/${REPO}/pulls/${n}" --jq '{merged,state,mergeable,draft,title}')
  echo "[night-merge] #$n $state"
  if [[ "$(echo "$state" | jq -r .merged)" == "true" ]]; then
    echo "[night-merge] skip #$n already merged"
    return 0
  fi
  if [[ "$(echo "$state" | jq -r .draft)" == "true" ]]; then
    echo "[night-merge] skip #$n draft"
    return 1
  fi
  title=$(echo "$state" | jq -r .title)
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[night-merge] dry-run would merge #$n"
    return 0
  fi
  if gh api -X PUT "repos/${REPO}/pulls/${n}/merge" \
    -f merge_method=squash \
    -f commit_title="${title} (#${n})"; then
    echo "[night-merge] merged #$n"
    sleep 20
    return 0
  fi
  echo "[night-merge] FAIL #$n"
  return 1
}

for n in "${PRS[@]}"; do
  merge_one "$n" || true
done

echo "[night-merge] done $(TZ=America/Bogota date)" > /tmp/opsly-night-merges-ready
echo ready >> /tmp/opsly-night-merges-ready
