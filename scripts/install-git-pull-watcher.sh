#!/usr/bin/env bash
# Instala el git-pull-watcher en la máquina local (opsly-admin / opsly-worker).
# macOS: LaunchAgent en ~/Library/LaunchAgents (invoca --once cada StartInterval).
# Linux: muestra instrucciones para systemd (infra/systemd/opsly-git-pull-watcher.service).
#
# Uso: ./scripts/install-git-pull-watcher.sh [--dry-run]
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

echo "🔧 Opsly — instalación git-pull-watcher"
echo "   Repo: ${REPO_ROOT}"
echo ""

if [[ "$(uname -s)" == "Darwin" ]]; then
  LAUNCH_AGENTS="${HOME}/Library/LaunchAgents"
  LOG_DIR="${REPO_ROOT}/runtime/logs"
  PLIST="com.opsly.git-pull-watcher.plist"

  run mkdir -p "${LOG_DIR}"
  run mkdir -p "${LAUNCH_AGENTS}"

  sed "s|__OPSLY_ROOT__|${REPO_ROOT}|g" "${REPO_ROOT}/infra/launchd/${PLIST}" >"/tmp/${PLIST}"
  run cp "/tmp/${PLIST}" "${LAUNCH_AGENTS}/${PLIST}"

  echo "Cargando LaunchAgent…"
  if [[ "${DRY_RUN}" != true ]]; then
    launchctl unload "${LAUNCH_AGENTS}/${PLIST}" 2>/dev/null || true
    launchctl load -w "${LAUNCH_AGENTS}/${PLIST}"
  fi

  echo ""
  echo "✅ macOS: LaunchAgent instalado (chequea origin/main cada 60s)."
  echo "   Logs: ${LOG_DIR}/launchd-git-pull-watcher.{out,err}"
  echo "   Rama vigilada: la que esté activa en ${REPO_ROOT} al momento del pull"
  echo "     (--once usa la rama actual del checkout, no está fijada a 'main')."
  echo "   Desinstalar: launchctl unload ${LAUNCH_AGENTS}/${PLIST} && rm ${LAUNCH_AGENTS}/${PLIST}"
  echo ""
  echo "⚠️  Requiere working tree limpio para hacer pull; si tienes cambios sin"
  echo "   commitear, el watcher avisa por log y NO toca nada (ver runtime/logs/)."

elif [[ "$(uname -s)" == "Linux" ]]; then
  echo "Linux detectado (esperado en opsly-worker / PC-gamer)."
  echo ""
  echo "Instalación systemd (requiere sudo):"
  echo "  sudo cp ${REPO_ROOT}/infra/systemd/opsly-git-pull-watcher.service /etc/systemd/system/"
  echo "  sudo systemctl daemon-reload"
  echo "  sudo systemctl enable --now opsly-git-pull-watcher.service"
  echo ""
  echo "Ajusta antes de instalar si tu usuario/ruta difieren de opslyquantum:/home/opslyquantum/opsly"
  echo "  (ver docs/04-infrastructure/WORKER-SETUP-MAC2011.md para el usuario Linux recomendado)."
  echo ""
  echo "Logs: journalctl -u opsly-git-pull-watcher.service -f"

else
  echo "SO no reconocido ($(uname -s)); instala manualmente con scripts/git-pull-watcher.sh"
fi
