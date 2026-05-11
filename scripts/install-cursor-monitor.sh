#!/usr/bin/env bash
set -euo pipefail

# Install or update the Cursor prompt monitor unit for Maia life-systems operations.
# The monitor is intentionally opt-in and expects an existing opsly checkout.

OPSLY_ROOT="${OPSLY_ROOT:-/opt/opsly}"
UNIT_NAME="${UNIT_NAME:-cursor-prompt-monitor.service}"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
DRY_RUN=0

usage() {
  cat <<USAGE
Usage: $0 [--dry-run]

Environment:
  OPSLY_ROOT   Repo path on the target host (default: /opt/opsly)
  UNIT_NAME    systemd unit name (default: cursor-prompt-monitor.service)
  SYSTEMD_DIR  systemd unit directory (default: /etc/systemd/system)
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

run() {
  printf '+ %q' "$@"
  printf '\n'
  if [[ "$DRY_RUN" -eq 0 ]]; then
    "$@"
  fi
}

unit_path="${SYSTEMD_DIR}/${UNIT_NAME}"
monitor_script="${OPSLY_ROOT}/scripts/cursor-prompt-monitor.sh"

if [[ "$DRY_RUN" -eq 0 && ! -x "$monitor_script" ]]; then
  echo "Missing executable monitor script: $monitor_script" >&2
  exit 1
fi

tmp_unit="$(mktemp)"
trap 'rm -f "$tmp_unit"' EXIT

cat >"$tmp_unit" <<UNIT
[Unit]
Description=Opsly Cursor Prompt Monitor
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${OPSLY_ROOT}
Environment=OPSLY_ROOT=${OPSLY_ROOT}
ExecStart=${monitor_script}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
UNIT

run install -m 0644 "$tmp_unit" "$unit_path"
run systemctl daemon-reload
run systemctl enable "$UNIT_NAME"
run systemctl restart "$UNIT_NAME"

echo "Cursor monitor installed: ${UNIT_NAME}"
