#!/usr/bin/env bash
# Instala scripts de limpieza/monitoreo opsly-mac2011.
# macOS: LaunchAgents en ~/Library/LaunchAgents (ruta repo = OPSLY_ROOT).
# Linux: muestra instrucciones para /opt/opsly + systemd/cron.
#
# Uso: ./scripts/install-mac2011-monitoring.sh [--dry-run]

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run() {
  if [[ "${DRY_RUN}" == true ]]; then
    echo "[DRY-RUN] $*"
  else
    "$@"
  fi
}

echo "🔧 Opsly — instalación monitoreo Mac 2011 / host"
echo "   Repo: ${REPO_ROOT}"
echo ""

if [[ "$(uname -s)" == "Darwin" ]]; then
  LAUNCH_AGENTS="${HOME}/Library/LaunchAgents"
  LOG_DIR="${REPO_ROOT}/logs"
  run mkdir -p "${LOG_DIR}"
  run mkdir -p "${HOME}/opsly/scripts"
  run cp "${REPO_ROOT}/scripts/mac2011-cleanup-robust.sh" "${HOME}/opsly/scripts/"
  run cp "${REPO_ROOT}/scripts/mac2011-monitor.sh" "${HOME}/opsly/scripts/"
  run cp "${REPO_ROOT}/scripts/mac2011-gpu-monitor.sh" "${HOME}/opsly/scripts/"
  run chmod +x "${HOME}/opsly/scripts/mac2011-"*.sh

  for plist in com.opsly.mac2011.cleanup.plist com.opsly.mac2011.monitor.plist; do
    sed "s|__OPSLY_ROOT__|${REPO_ROOT}|g" "${REPO_ROOT}/infra/launchd/${plist}" >"/tmp/${plist}"
    run cp "/tmp/${plist}" "${LAUNCH_AGENTS}/${plist}"
  done

  echo "Cargando LaunchAgents…"
  if [[ "${DRY_RUN}" != true ]]; then
    launchctl unload "${LAUNCH_AGENTS}/com.opsly.mac2011.cleanup.plist" 2>/dev/null || true
    launchctl unload "${LAUNCH_AGENTS}/com.opsly.mac2011.monitor.plist" 2>/dev/null || true
    launchctl load -w "${LAUNCH_AGENTS}/com.opsly.mac2011.cleanup.plist"
    launchctl load -w "${LAUNCH_AGENTS}/com.opsly.mac2011.monitor.plist"
  fi

  echo ""
  echo "✅ macOS: LaunchAgents instalados."
  echo "   Logs: ${REPO_ROOT}/logs/"
  echo "   Estado JSON: ${REPO_ROOT}/logs/mac2011-status.json (tras ejecutar monitor)"
  echo "   Discord: export DISCORD_WEBHOOK_URL en el entorno (o añadir Variable a plist)."
  echo ""
  echo "API (VPS): copiar JSON al servidor o exponer URL:"
  echo "   MAC2011_STATUS_FILE=/ruta/mac2011-status.json"
  echo "   o MAC2011_STATUS_URL=https://..."
  exit 0
fi

echo "Linux: copiar a /opt/opsly (o OPSLY_ROOT) y:"
echo "  sudo cp infra/systemd/opsly-mac2011-*.service /etc/systemd/system/"
echo "  sudo cp infra/systemd/opsly-mac2011-cleanup.timer /etc/systemd/system/"
echo "  sudo systemctl daemon-reload && sudo systemctl enable --now opsly-mac2011-cleanup.timer"
echo "  sudo cp infra/cron/logrotate-opsly-mac2011 /etc/logrotate.d/opsly-mac2011"
echo "  # Descomentar líneas en infra/cron/opsly-mac2011-cron y copiar a /etc/cron.d/"
