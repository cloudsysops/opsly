#!/usr/bin/env bash
# Idempotent install of edge-watchdog cron on the VPS (no sudo required).
# Usage: ./scripts/ops/install-edge-watchdog.sh [--dry-run]
set -euo pipefail

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      sed -n '2,6p' "$0"
      exit 0
      ;;
  esac
done

OPSLY_ROOT="${OPSLY_ROOT:-/opt/opsly}"
SCRIPT="${OPSLY_ROOT}/scripts/ops/edge-watchdog.sh"
LOG="${OPSLY_ROOT}/runtime/logs/edge-watchdog.log"
CRON_LINE="*/2 * * * * OPSLY_ROOT=${OPSLY_ROOT} NOTIFY=1 ${SCRIPT} >> ${LOG} 2>&1"

if [[ ! -x "$SCRIPT" ]]; then
  echo "error: missing executable ${SCRIPT}" >&2
  echo "hint: copy scripts/ops/edge-watchdog.sh to VPS or git pull" >&2
  exit 1
fi

mkdir -p "${OPSLY_ROOT}/runtime/logs" "${OPSLY_ROOT}/runtime/edge-watchdog"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "DRY-RUN would install cron:"
  echo "  ${CRON_LINE}"
  exit 0
fi

# Replace any previous edge-watchdog cron lines
(crontab -l 2>/dev/null | grep -v edge-watchdog.sh || true; echo "$CRON_LINE") | crontab -
echo "installed cron:"
crontab -l | grep edge-watchdog || true

# Smoke once (no Discord spam if NOTIFY unset here)
OPSLY_ROOT="$OPSLY_ROOT" NOTIFY=0 "$SCRIPT" || true
echo "OK — edge-watchdog cron active every 2 min"
