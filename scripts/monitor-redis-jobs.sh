#!/usr/bin/env bash
# Monitorea conteos BullMQ en Redis del VPS (SSH + docker exec + redis-cli).
# Requiere: acceso SSH al VPS, REDIS_PASSWORD (p. ej. doppler run -- ./scripts/monitor-redis-jobs.sh).
#
# Uso:
#   doppler run --project ops-intcloudsysops --config prd -- ./scripts/monitor-redis-jobs.sh
#   ./scripts/monitor-redis-jobs.sh openclaw
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

QUEUE_NAME="${1:-openclaw}"
VPS_SSH="${VPS_SSH:-vps-dragon@100.120.151.91}"
REDIS_CONTAINER="${REDIS_CONTAINER:-infra-redis-1}"
REFRESH_SEC="${REFRESH_SEC:-3}"
PREFIX="bull:${QUEUE_NAME}"

require_cmd ssh

if [[ -z "${REDIS_PASSWORD:-}" ]] && command -v doppler >/dev/null 2>&1; then
  if doppler secrets get REDIS_PASSWORD --project "${DOPPLER_PROJECT:-ops-intcloudsysops}" --config "${DOPPLER_CONFIG:-prd}" --plain >/dev/null 2>&1; then
    REDIS_PASSWORD="$(doppler secrets get REDIS_PASSWORD --project "${DOPPLER_PROJECT:-ops-intcloudsysops}" --config "${DOPPLER_CONFIG:-prd}" --plain)"
    export REDIS_PASSWORD
  fi
fi

require_env REDIS_PASSWORD

PW_B64="$(printf '%s' "${REDIS_PASSWORD}" | base64 | tr -d '\n')"

rcli() {
  local quoted
  quoted=$(printf '%q ' "$@")
  # shellcheck disable=SC2029
  ssh -o BatchMode=yes -o ConnectTimeout=20 "${VPS_SSH}" \
    "docker exec -e REDISCLI_AUTH=\$(echo '${PW_B64}' | base64 -d) ${REDIS_CONTAINER} redis-cli --no-auth-warning ${quoted}"
}

trap 'echo ""; log_info "Salida (Ctrl+C)"; exit 0' INT TERM

log_info "Redis Jobs Monitor (cada ${REFRESH_SEC}s) — queue ${QUEUE_NAME} — ${VPS_SSH}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

while true; do
  if ! WAIT="$(rcli LLEN "${PREFIX}:wait")"; then
    log_error "Fallo SSH o Redis (revisa clave SSH y contenedor ${REDIS_CONTAINER})"
    exit 1
  fi
  ACTIVE="$(rcli LLEN "${PREFIX}:active")"
  DONE="$(rcli ZCARD "${PREFIX}:completed")"
  FAIL_COUNT="$(rcli ZCARD "${PREFIX}:failed")"
  RECENT="$(rcli ZRANGE "${PREFIX}:completed" -15 -1 | tr '\n' ' ')"

  if [[ -t 1 ]]; then
    clear
  fi
  echo "🔴 Redis Jobs Monitor — ${QUEUE_NAME} — $(timestamp)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  printf "Waiting:     %s\n" "${WAIT}"
  printf "Active:      %s\n" "${ACTIVE}"
  printf "Completed:   %s\n" "${DONE}"
  printf "Failed:      %s\n" "${FAIL_COUNT}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Últimos job IDs (completed): ${RECENT}"
  echo ""
  echo "Ctrl+C · ${VPS_SSH} · ${REDIS_CONTAINER}"
  sleep "${REFRESH_SEC}"
done
