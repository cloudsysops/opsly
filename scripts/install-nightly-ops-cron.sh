#!/usr/bin/env bash
# Install user crontab for nightly Opsly maintenance at 01:00 America/Bogota.
# Usage: ./scripts/install-nightly-ops-cron.sh [--dry-run] [--remove]
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

MARKER_BEGIN="# OPSLY-NIGHTLY-OPS-BEGIN"
MARKER_END="# OPSLY-NIGHTLY-OPS-END"
LOG_DIR="${OPSLY_ROOT:-${REPO_ROOT}}/runtime/logs"
mkdir -p "${LOG_DIR}"

chmod +x "${REPO_ROOT}/scripts/nightly-ops-upgrade.sh" \
  "${REPO_ROOT}/scripts/upgrade-n8n-tenant.sh" 2>/dev/null || true

# 01:00 America/Bogota every day (TZ set in crontab line)
# 01:15 America/Bogota — after GitHub Actions Night merge (01:00 / 06:00 UTC)
NIGHT_LINE="15 1 * * * TZ=America/Bogota cd ${REPO_ROOT} && ./scripts/nightly-ops-upgrade.sh >>${LOG_DIR}/nightly-ops.cron.log 2>&1"

BLOCK=$(cat <<EOF
${MARKER_BEGIN}
${NIGHT_LINE}
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
echo "Nightly ops crontab installed for $(whoami)."
crontab -l | sed -n "/${MARKER_BEGIN}/,/${MARKER_END}/p"
echo "Manual dry-run: NIGHTLY_FORCE=1 ./scripts/nightly-ops-upgrade.sh --dry-run"
echo "Manual execute (night only unless NIGHTLY_FORCE=1): ./scripts/nightly-ops-upgrade.sh"
