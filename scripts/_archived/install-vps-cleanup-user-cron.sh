#!/usr/bin/env bash
# Install user crontab entries for VPS cleanup without sudo.
# Usage: ./scripts/install-vps-cleanup-user-cron.sh [--dry-run] [--remove]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN=false
REMOVE=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --remove) REMOVE=true ;;
  esac
done

MARKER_BEGIN="# OPSLY-USER-CLEANUP-BEGIN"
MARKER_END="# OPSLY-USER-CLEANUP-END"
LOG_DIR="${OPSLY_ROOT:-${REPO_ROOT}}/runtime/logs"
mkdir -p "${LOG_DIR}"

LIGHT_LINE="0 */6 * * * cd ${REPO_ROOT} && set -a && [ -f .env ] && . ./.env; set +a; python3 ./scripts/ops/vps_docker_housekeeping.py --light --log-file ${LOG_DIR}/vps-docker-housekeeping.log >>${LOG_DIR}/opsly-cleanup.user.log 2>&1"
RESET_LINE="30 2 * * * cd ${REPO_ROOT} && ./scripts/reset-ops-logs.sh >>${LOG_DIR}/opsly-cleanup.user.log 2>&1"

BLOCK=$(cat <<EOF
${MARKER_BEGIN}
${LIGHT_LINE}
${RESET_LINE}
${MARKER_END}
EOF
)

current="$(crontab -l 2>/dev/null || true)"
cleaned="$(printf '%s\n' "$current" | awk -v b="$MARKER_BEGIN" -v e="$MARKER_END" '
  $0==b {skip=1; next}
  $0==e {skip=0; next}
  !skip {print}
')"

if [[ "$REMOVE" == "true" ]]; then
  new="$cleaned"
else
  new="$(printf '%s\n%s\n' "$cleaned" "$BLOCK")"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  echo "=== crontab preview ==="
  printf '%s\n' "$new"
  exit 0
fi

printf '%s\n' "$new" | crontab -
echo "Cleanup crontab installed for $(whoami). Entries:"
crontab -l | sed -n "/${MARKER_BEGIN}/,/${MARKER_END}/p"
echo "Manual: python3 ${REPO_ROOT}/scripts/ops/vps_docker_housekeeping.py --light"
