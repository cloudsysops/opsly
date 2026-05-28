#!/usr/bin/env bash
# Ejecuta vps_docker_housekeeping.py en VPS vía SSH o localmente en el servidor.
# Uso:
#   ./scripts/vps-docker-housekeeping.sh [--dry-run] [--auto] [--notify-discord]
#   doppler run --project ops-intcloudsysops --config prd -- ./scripts/vps-docker-housekeeping.sh --auto
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PY="${ROOT}/scripts/ops/vps_docker_housekeeping.py"
VPS_SSH="${VPS_SSH_TARGET:-vps-dragon@100.120.151.91}"
DOPPLER_PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-prd}"

run_local_python() {
  if command -v doppler >/dev/null 2>&1; then
    doppler run --project "${DOPPLER_PROJECT}" --config "${DOPPLER_CONFIG}" -- \
      python3 "${PY}" "$@"
  else
    python3 "${PY}" "$@"
  fi
}

# En el VPS (existe /opt/opsly y docker): ejecutar en local
if [[ -d /opt/opsly ]] && command -v docker >/dev/null 2>&1; then
  cd /opt/opsly
  exec python3 scripts/ops/vps_docker_housekeeping.py "$@"
fi

# En Mac/dev: delegar al VPS por SSH (el script vive en /opt/opsly tras git pull)
REMOTE_ARGS=()
for arg in "$@"; do
  REMOTE_ARGS+=("${arg}")
done

run_local_python --remote-ssh "${VPS_SSH}" "${REMOTE_ARGS[@]}"
