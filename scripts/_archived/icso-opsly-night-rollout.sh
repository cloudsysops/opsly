#!/usr/bin/env bash
# Night window helper: apply VPS memory caps + pull ICSO image after marketing merge.
# Default is --dry-run. Requires America/Bogota 22:00–06:00 for --execute.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MODE="${1:---dry-run}"
SSH_HOST="${SSH_HOST:-100.120.151.91}"
SSH_USER="${SSH_USER:-vps-dragon}"
OPSLY_ROOT="${OPSLY_ROOT:-/opt/opsly}"

usage() {
  cat <<'EOF'
Usage: ./scripts/ops/icso-opsly-night-rollout.sh [--dry-run|--execute]

Night-only (America/Bogota 22:00–06:00) unless --dry-run:
  1) apply-vps-memory-caps.sh
  2) git pull on VPS
  3) redeploy ICSO service only (compose pull/up --no-deps icso) when present

Env: SSH_HOST (default Tailscale), SSH_USER, OPSLY_ROOT
EOF
}

bogota_hour() {
  TZ=America/Bogota date +%H
}

in_night_window() {
  local hour
  hour="$(bogota_hour)"
  # 22–23 or 00–05
  [[ "$hour" -ge 22 || "$hour" -lt 6 ]]
}

if [[ "$MODE" == "-h" || "$MODE" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "$MODE" != "--dry-run" && "$MODE" != "--execute" ]]; then
  usage
  exit 1
fi

echo "== ICSO/Opsly night rollout ($MODE) =="
echo "Bogota now: $(TZ=America/Bogota date '+%Y-%m-%d %H:%M %Z')"

if [[ "$MODE" == "--execute" ]] && ! in_night_window; then
  echo "ERROR: --execute blocked outside night window (22:00–06:00 America/Bogota)." >&2
  echo "Re-run with --dry-run now, or wait for the window." >&2
  exit 2
fi

CAPS_ARGS=("--dry-run")
if [[ "$MODE" == "--execute" ]]; then
  CAPS_ARGS=("--execute")
fi

echo "-- memory caps"
./scripts/ops/apply-vps-memory-caps.sh "${CAPS_ARGS[@]}"

echo "-- VPS pull + ICSO recreate"
REMOTE_CMD=$(
  cat <<EOF
set -euo pipefail
cd ${OPSLY_ROOT}
git fetch origin
git pull --ff-only origin main
if [[ -f infra/docker-compose.platform.yml ]]; then
  if docker compose --env-file ${OPSLY_ROOT}/.env -f infra/docker-compose.platform.yml config --services 2>/dev/null | grep -qx icso; then
    if [[ '${MODE}' == '--execute' ]]; then
      docker compose --env-file ${OPSLY_ROOT}/.env -f infra/docker-compose.platform.yml pull icso
      docker compose --env-file ${OPSLY_ROOT}/.env -f infra/docker-compose.platform.yml up -d --no-deps icso
    else
      echo "[dry-run] would pull/up icso"
    fi
  else
    echo "NOTE: no 'icso' service in platform compose — skip container recreate (marketing may be external host)."
  fi
fi
EOF
)

if [[ "$MODE" == "--dry-run" ]]; then
  echo "[dry-run] would ssh ${SSH_USER}@${SSH_HOST} and run:"
  echo "$REMOTE_CMD"
else
  ssh -o BatchMode=yes -o ConnectTimeout=15 "${SSH_USER}@${SSH_HOST}" "$REMOTE_CMD"
fi

echo "OK: night rollout ${MODE} finished."
