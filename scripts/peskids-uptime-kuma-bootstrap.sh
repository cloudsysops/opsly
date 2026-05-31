#!/usr/bin/env bash
# Bootstrap Uptime Kuma for tenant peskids (first admin, monitors, /status/peskids).
# Run on VPS (Tailscale) where uptime_peskids exposes port 8003 → 3001.
#
# Usage:
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/peskids-uptime-kuma-bootstrap.sh
#
#   # Or set password once in Doppler:
#   doppler secrets set PESKIDS_UPTIME_KUMA_PASSWORD --project ops-intcloudsysops --config prd
#
# Env:
#   UPTIME_KUMA_URL          default http://127.0.0.1:8003
#   UPTIME_KUMA_USERNAME     default peskids-ops
#   UPTIME_KUMA_PASSWORD     or PESKIDS_UPTIME_KUMA_PASSWORD from Doppler
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

UPTIME_KUMA_URL="${UPTIME_KUMA_URL:-http://127.0.0.1:8003}"
UPTIME_KUMA_USERNAME="${UPTIME_KUMA_USERNAME:-peskids-ops}"
UPTIME_KUMA_PASSWORD="${UPTIME_KUMA_PASSWORD:-${PESKIDS_UPTIME_KUMA_PASSWORD:-}}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/peskids-uptime-kuma-bootstrap.sh [--dry-run]

Creates Uptime Kuma admin (if empty), HTTP monitors, and public status page slug "peskids".
Requires: python3, pip; run on VPS or with UPTIME_KUMA_URL pointing at the instance.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    -h | --help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; exit 1 ;;
  esac
  shift
done

if [[ -z "$UPTIME_KUMA_PASSWORD" ]]; then
  echo "FAIL: set UPTIME_KUMA_PASSWORD or PESKIDS_UPTIME_KUMA_PASSWORD (Doppler prd)" >&2
  exit 1
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] would bootstrap $UPTIME_KUMA_URL as $UPTIME_KUMA_USERNAME"
  exit 0
fi

VENV_DIR="$(mktemp -d)"
trap 'rm -rf "$VENV_DIR"' EXIT

python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install -q 'uptime-kuma-api>=1.2.1'

export UPTIME_KUMA_URL UPTIME_KUMA_USERNAME UPTIME_KUMA_PASSWORD
"$VENV_DIR/bin/python" "$ROOT_DIR/scripts/peskids-uptime-kuma-bootstrap.py"

echo "Public URL: https://uptime-peskids.op-sly.com/status/peskids"
