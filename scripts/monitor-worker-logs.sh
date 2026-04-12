#!/usr/bin/env bash
# Muestra líneas recientes del orchestrator en el VPS (docker logs), refrescando cada 2s.
#
# Uso:
#   ./scripts/monitor-worker-logs.sh
#   ORCHESTRATOR_CONTAINER=opsly_orchestrator ./scripts/monitor-worker-logs.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

VPS_SSH="${VPS_SSH:-vps-dragon@100.120.151.91}"
ORCH="${ORCHESTRATOR_CONTAINER:-opsly_orchestrator}"
REFRESH_SEC="${REFRESH_SEC:-2}"
TAIL_LINES="${TAIL_LINES:-120}"

require_cmd ssh

trap 'echo ""; log_info "Salida (Ctrl+C)"; exit 0' INT TERM

log_info "Logs orchestrator (${ORCH}) — ${VPS_SSH} — cada ${REFRESH_SEC}s"

while true; do
  if [[ -t 1 ]]; then
    clear
  fi
  echo "📋 Worker / orchestrator — $(timestamp)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  # shellcheck disable=SC2029
  if ! ssh -o BatchMode=yes -o ConnectTimeout=20 "${VPS_SSH}" \
    "docker logs ${ORCH} --tail ${TAIL_LINES} 2>&1 | grep -iE 'job|worker|complete|fail|cursor|notify|enqueue|openclaw|bull|orchestrator' || true"; then
    log_warn "SSH o docker logs falló (¿contenedor ${ORCH} existe en el VPS?)"
  fi
  echo ""
  echo "Ctrl+C para salir"
  sleep "${REFRESH_SEC}"
done
