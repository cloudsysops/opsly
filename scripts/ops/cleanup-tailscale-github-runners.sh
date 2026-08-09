#!/usr/bin/env bash
# Remove offline GitHub Actions Tailscale nodes left by non-ephemeral auth keys.
# Default: --dry-run (list only). Requires Tailscale API access key.
#
# Usage:
#   ./scripts/ops/cleanup-tailscale-github-runners.sh
#   ./scripts/ops/cleanup-tailscale-github-runners.sh --execute
#   TAILSCALE_API_KEY=tskey-api-… TAILSCALE_TAILNET=- ./scripts/ops/cleanup-tailscale-github-runners.sh --execute
#
# API key: https://login.tailscale.com/admin/settings/keys (API access keys)
set -euo pipefail

DRY_RUN=1
NAME_SUBSTR="${TAILSCALE_RUNNER_NAME_SUBSTR:-github-runner}"
# Also match hostnames from .github/actions/tailscale-connect
NAME_SUBSTR_ALT="${TAILSCALE_RUNNER_NAME_SUBSTR_ALT:-opsly-gha-}"
TAILNET="${TAILSCALE_TAILNET:--}"
API_KEY="${TAILSCALE_API_KEY:-${TS_API_KEY:-}}"

usage() {
  cat <<'EOF'
Usage: cleanup-tailscale-github-runners.sh [--dry-run|--execute] [--help]

Lists (or deletes) Tailscale devices whose name contains github-runner or opsly-gha-.
Requires TAILSCALE_API_KEY (or TS_API_KEY). Default is --dry-run.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --execute) DRY_RUN=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$API_KEY" ]]; then
  echo "Missing TAILSCALE_API_KEY (or TS_API_KEY)." >&2
  echo "Create an API access key in Tailscale admin → Settings → Keys." >&2
  echo "Or delete offline github-runner* machines manually in the admin UI." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

echo "tailnet=${TAILNET} name_filter=${NAME_SUBSTR}|${NAME_SUBSTR_ALT} dry_run=${DRY_RUN}"

devices_json="$(
  curl -fsS "https://api.tailscale.com/api/v2/tailnet/${TAILNET}/devices" \
    -u "${API_KEY}:"
)"

matched=0
deleted=0
while IFS=$'\t' read -r id name last_seen; do
  [[ -z "$id" ]] && continue
  matched=$((matched + 1))
  echo "match: ${name} id=${id} lastSeen=${last_seen}"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "  (dry-run) would DELETE"
    continue
  fi
  curl -fsS -X DELETE "https://api.tailscale.com/api/v2/device/${id}" -u "${API_KEY}:" >/dev/null
  echo "  deleted"
  deleted=$((deleted + 1))
done < <(
  echo "$devices_json" | jq -r --arg a "$NAME_SUBSTR" --arg b "$NAME_SUBSTR_ALT" '
    .devices[]
    | select((.name // .hostname // "") | test($a + "|" + $b))
    | [(.id // .nodeId), (.name // .hostname // "?"), (.lastSeen // "?")]
    | @tsv
  '
)

echo "matched=${matched} deleted=${deleted} dry_run=${DRY_RUN}"
if [[ "$DRY_RUN" -eq 1 && "$matched" -gt 0 ]]; then
  echo "Re-run with --execute to delete."
fi
