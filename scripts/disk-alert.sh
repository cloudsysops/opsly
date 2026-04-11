#!/usr/bin/env bash
# Alertas por uso de disco en /. Opcional: Discord vía scripts/notify-discord.sh y DISCORD_WEBHOOK_URL.
# Uso en VPS (cron cada 5 min): source /opt/opsly/.env o export DISCORD_WEBHOOK_URL
#
# Umbrales: WARN 80%, CRITICAL 90%, EMERGENCY 95% (emergency ejecuta limpieza agresiva local).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

WARN_THRESHOLD="${DISK_WARN_THRESHOLD:-80}"
CRITICAL_THRESHOLD="${DISK_CRITICAL_THRESHOLD:-90}"
EMERGENCY_THRESHOLD="${DISK_EMERGENCY_THRESHOLD:-95}"
OPS_ROOT="${OPSLY_ROOT:-/opt/opsly}"

if [[ -f "${OPS_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${OPS_ROOT}/.env"
  set +a
fi

LOG_DIR="${OPS_ROOT}/logs"
mkdir -p "${LOG_DIR}" 2>/dev/null || true
ALERT_LOG="${LOG_DIR}/opsly-disk-alerts.log"
MONITOR_LOG="${LOG_DIR}/opsly-disk-monitor.log"

DISK_USAGE="$(df / | tail -1 | awk '{gsub(/%/,"",$5); print $5}' | tr -d '[:space:]')"
DISK_FREE="$(df -h / | tail -1 | awk '{print $4}')"

if ! [[ "${DISK_USAGE}" =~ ^[0-9]+$ ]]; then
  log_error "No se pudo leer uso de disco (%): '${DISK_USAGE}'"
  exit 1
fi

send_discord() {
  local level="$1"
  local message="$2"
  local color="warning"
  case "$level" in
    EMERGENCY) color="error" ;;
    CRITICAL) color="error" ;;
    WARNING) color="warning" ;;
  esac
  if [[ -x "${REPO_ROOT}/scripts/notify-discord.sh" ]]; then
    DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}" \
      "${REPO_ROOT}/scripts/notify-discord.sh" \
      "Disco VPS ${level}" \
      "${message} (uso ${DISK_USAGE}%, libre ${DISK_FREE})" \
      "${color}" || true
  fi
}

log_line() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*" | tee -a "${ALERT_LOG}" 2>/dev/null || echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

if [[ "${DISK_USAGE}" -ge "${EMERGENCY_THRESHOLD}" ]]; then
  log_line "EMERGENCY disco ${DISK_USAGE}% — iniciando limpieza agresiva"
  send_discord "EMERGENCY" "Disco al ${DISK_USAGE}%. Ejecutando vps-cleanup-robust.sh --aggressive."
  if [[ -x "${OPS_ROOT}/scripts/vps-cleanup-robust.sh" ]]; then
    bash "${OPS_ROOT}/scripts/vps-cleanup-robust.sh" --aggressive || log_warn "Limpieza agresiva devolvió error"
  else
    log_warn "No se encontró ${OPS_ROOT}/scripts/vps-cleanup-robust.sh"
  fi
elif [[ "${DISK_USAGE}" -ge "${CRITICAL_THRESHOLD}" ]]; then
  log_line "CRITICAL disco ${DISK_USAGE}%"
  send_discord "CRITICAL" "Disco al ${DISK_USAGE}%. Limpieza urgente recomendada."
elif [[ "${DISK_USAGE}" -ge "${WARN_THRESHOLD}" ]]; then
  log_line "WARNING disco ${DISK_USAGE}%"
  send_discord "WARNING" "Disco al ${DISK_USAGE}%. Monitorear."
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] uso=${DISK_USAGE}% libre=${DISK_FREE}" >>"${MONITOR_LOG}" 2>/dev/null || true
