#!/usr/bin/env bash
# Install user crontab entries for tenant + disk monitoring (no sudo).
# Usage: ./scripts/install-tenant-monitor-cron.sh [--dry-run] [--remove]
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

MARKER_BEGIN="# OPSLY-TENANT-MONITOR-BEGIN"
MARKER_END="# OPSLY-TENANT-MONITOR-END"
LOG_DIR="${OPSLY_ROOT:-${REPO_ROOT}}/runtime/logs"
mkdir -p "${LOG_DIR}"

MONITOR_LINE="*/5 * * * * cd ${REPO_ROOT} && set -a && [ -f .env ] && . ./.env; set +a; ./scripts/monitor-tenants.sh --local-host >>${LOG_DIR}/tenant-monitor.cron.log 2>&1"
DISK_LINE="*/10 * * * * cd ${REPO_ROOT} && set -a && [ -f .env ] && . ./.env; set +a; ./scripts/disk-alert.sh >>${LOG_DIR}/disk-alert.cron.log 2>&1"

BLOCK=$(cat <<EOF
${MARKER_BEGIN}
${MONITOR_LINE}
${DISK_LINE}
${MARKER_END}
EOF
)

current="$(crontab -l 2>/dev/null || true)"
# Strip previous block
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
echo "Crontab installed for $(whoami). Entries:"
crontab -l | sed -n "/${MARKER_BEGIN}/,/${MARKER_END}/p"
echo "Manual: ${REPO_ROOT}/scripts/monitor-tenants.sh --local-host"
