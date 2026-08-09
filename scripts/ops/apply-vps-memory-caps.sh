#!/usr/bin/env bash
# Apply interim Docker memory caps on VPS without full stack recreate.
# Prefer night window (America/Bogota 22:00–06:00). Default: --dry-run.
#
# Usage:
#   ./scripts/ops/apply-vps-memory-caps.sh --dry-run
#   ./scripts/ops/apply-vps-memory-caps.sh --execute --ssh-host 100.120.151.91
set -euo pipefail

DRY_RUN=1
SSH_HOST="${SSH_HOST:-100.120.151.91}"
SSH_USER="${SSH_USER:-vps-dragon}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --execute) DRY_RUN=0; shift ;;
    --ssh-host) SSH_HOST="${2:?}"; shift 2 ;;
    --ssh-user) SSH_USER="${2:?}"; shift 2 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

# container=mem_limit (docker update --memory)
CAPS=(
  "twenty_peskids=640m"
  "twenty_peskids_worker=384m"
  "twenty_peskids_db=256m"
  "twenty_peskids_redis=64m"
  "twenty_icso=640m"
  "twenty_icso_worker=384m"
  "twenty_icso_db=256m"
  "twenty_icso_redis=64m"
  "n8n_peskids=384m"
  "n8n_localrank=384m"
  "n8n_legalvial=256m"
  "n8n_smiletripcare=256m"
  "n8n_intcloudsysops=256m"
  "uptime_peskids=128m"
  "uptime_localrank=128m"
  "uptime_legalvial=128m"
  "uptime_smiletripcare=128m"
  "uptime_intcloudsysops=128m"
  "peskids=256m"
  "panini-lab=256m"
)

remote_script() {
  cat <<'EOS'
set -euo pipefail
DRY_RUN="${DRY_RUN:?}"
echo "host=$(hostname) dry_run=${DRY_RUN}"
free -h | head -2
updated=0
skipped=0
for entry in "$@"; do
  name="${entry%%=*}"
  mem="${entry#*=}"
  if ! docker inspect "$name" >/dev/null 2>&1; then
    echo "skip missing: $name"
    skipped=$((skipped + 1))
    continue
  fi
  cur="$(docker inspect -f '{{.HostConfig.Memory}}' "$name" 2>/dev/null || echo 0)"
  echo "plan: $name -> --memory=${mem} (current_bytes=${cur})"
  if [[ "$DRY_RUN" == "1" ]]; then
    continue
  fi
  docker update --memory="$mem" --memory-swap="$mem" "$name" >/dev/null
  updated=$((updated + 1))
  echo "updated: $name"
done
echo "done updated=${updated} skipped_missing=${skipped}"
free -h | head -2
EOS
}

echo "== apply-vps-memory-caps ssh=${SSH_USER}@${SSH_HOST} dry_run=${DRY_RUN} =="

# Quote each cap for remote argv (portable; no mapfile / bash 4+)
quoted_caps=""
for entry in "${CAPS[@]}"; do
  quoted_caps+=" $(printf '%q' "$entry")"
done

# shellcheck disable=SC2086
ssh -o BatchMode=yes -o ConnectTimeout=20 "${SSH_USER}@${SSH_HOST}" \
  "DRY_RUN=${DRY_RUN} bash -s --${quoted_caps}" \
  < <(remote_script)

if [[ "$DRY_RUN" == "1" ]]; then
  echo "Dry-run only. Re-run with --execute in night window after human OK."
fi
