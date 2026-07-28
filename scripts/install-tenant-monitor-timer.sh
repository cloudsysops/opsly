#!/usr/bin/env bash
# Install systemd timers for tenant + host monitoring on the VPS.
# Usage: sudo ./scripts/install-tenant-monitor-timer.sh [--dry-run]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

UNIT_DIR="/etc/systemd/system"
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo) to install system timers." >&2
  exit 2
fi

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

chmod +x "${REPO_ROOT}/scripts/monitor-tenants.sh" "${REPO_ROOT}/scripts/disk-alert.sh" 2>/dev/null || true

run cp "${REPO_ROOT}/infra/systemd/opsly-tenant-monitor.service" "${UNIT_DIR}/opsly-tenant-monitor.service"
run cp "${REPO_ROOT}/infra/systemd/opsly-tenant-monitor.timer" "${UNIT_DIR}/opsly-tenant-monitor.timer"
run cp "${REPO_ROOT}/infra/systemd/opsly-host-resource-alert.service" "${UNIT_DIR}/opsly-host-resource-alert.service"
run cp "${REPO_ROOT}/infra/systemd/opsly-host-resource-alert.timer" "${UNIT_DIR}/opsly-host-resource-alert.timer"

# Point WorkingDirectory / script to this repo path
if [[ "$DRY_RUN" != "true" ]]; then
  sed -i "s|/opt/opsly|${REPO_ROOT}|g" \
    "${UNIT_DIR}/opsly-tenant-monitor.service" \
    "${UNIT_DIR}/opsly-host-resource-alert.service"
fi

run systemctl daemon-reload
run systemctl enable --now opsly-tenant-monitor.timer opsly-host-resource-alert.timer
run systemctl start opsly-tenant-monitor.service || true
run systemctl list-timers 'opsly-tenant-monitor.timer' 'opsly-host-resource-alert.timer' --no-pager || true

echo "Installed. Manual run: ${REPO_ROOT}/scripts/monitor-tenants.sh --local-host"
