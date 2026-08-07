#!/usr/bin/env bash
# Instala el git-pull-watcher en la máquina local.
#
# macOS (cualquier Mac, opsly-admin u otra futura):
#   ./scripts/install-git-pull-watcher.sh
#   → LaunchAgent en ~/Library/LaunchAgents (invoca --once cada 60s)
#
# Linux — VPS (system, /opt/opsly, requiere sudo):
#   sudo ./scripts/install-git-pull-watcher.sh
#
# Linux — worker / PC-gamer / cualquier máquina futura (user, sin sudo,
# requiere el repo clonado en ~/opsly):
#   ./scripts/install-git-pull-watcher.sh --user
#
# Uso: ./scripts/install-git-pull-watcher.sh [--user] [--dry-run]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MODE="system"
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --user) MODE="user" ;;
    --dry-run) DRY_RUN=true ;;
    -h | --help)
      grep '^#' "$0" | head -14
      exit 0
      ;;
    *) die "Opción desconocida: $arg (usa --user y/o --dry-run)" ;;
  esac
done

run() {
  if [[ "${DRY_RUN}" == true ]]; then
    echo "[DRY-RUN] $*"
  else
    "$@"
  fi
}

log_info "Opsly — instalación git-pull-watcher (repo: ${REPO_ROOT})"

if [[ "$(uname -s)" == "Darwin" ]]; then
  LAUNCH_AGENTS="${HOME}/Library/LaunchAgents"
  LOG_DIR="${REPO_ROOT}/runtime/logs"
  PLIST="com.opsly.git-pull-watcher.plist"

  run mkdir -p "${LOG_DIR}"
  run mkdir -p "${LAUNCH_AGENTS}"

  sed "s|__OPSLY_ROOT__|${REPO_ROOT}|g" "${REPO_ROOT}/infra/launchd/${PLIST}" >"/tmp/${PLIST}"
  run cp "/tmp/${PLIST}" "${LAUNCH_AGENTS}/${PLIST}"

  if [[ "${DRY_RUN}" != true ]]; then
    launchctl unload "${LAUNCH_AGENTS}/${PLIST}" 2>/dev/null || true
    launchctl load -w "${LAUNCH_AGENTS}/${PLIST}"
  fi

  log_ok "macOS: LaunchAgent instalado (chequea la rama activa cada 60s)."
  log_info "Logs: ${LOG_DIR}/launchd-git-pull-watcher.{out,err}"
  log_info "Desinstalar: launchctl unload ${LAUNCH_AGENTS}/${PLIST} && rm ${LAUNCH_AGENTS}/${PLIST}"
  exit 0
fi

if [[ "$(uname -s)" != "Linux" ]]; then
  die "SO no reconocido ($(uname -s)); instala manualmente con scripts/git-pull-watcher.sh"
fi

require_cmd systemctl
chmod +x "${REPO_ROOT}/scripts/git-pull-watcher.sh" "${REPO_ROOT}/scripts/git-sync-repo.sh" 2>/dev/null || true

if [[ "${MODE}" == "user" ]]; then
  # Worker / PC-gamer / cualquier máquina futura: requiere ~/opsly (systemd
  # user usa %h en la unidad; ver infra/systemd/opsly-git-pull-watcher.user.service).
  [[ "${REPO_ROOT}" == "${HOME}/opsly" ]] || log_warn "Repo en ${REPO_ROOT}, no en \$HOME/opsly — edita WorkingDirectory/%h en la unidad tras copiarla."

  run mkdir -p "${HOME}/.config/systemd/user"
  run cp "${REPO_ROOT}/infra/systemd/opsly-git-pull-watcher.user.service" \
    "${HOME}/.config/systemd/user/opsly-git-pull-watcher.service"

  if [[ "${DRY_RUN}" != true ]]; then
    systemctl --user daemon-reload
    systemctl --user enable --now opsly-git-pull-watcher.service
  fi

  log_ok "Linux (user): opsly-git-pull-watcher activo vía systemd --user."
  log_info "Logs: journalctl --user -u opsly-git-pull-watcher.service -f"
  log_info "Para que arranque tras reboot sin login interactivo: sudo loginctl enable-linger \"\$(whoami)\""
  exit 0
fi

# MODE=system: VPS, /opt/opsly, requiere sudo
if [[ "$(id -u)" -ne 0 ]]; then
  die "Modo system (VPS): ejecutar con sudo, o usa --user en workers sin sudo" 1
fi
[[ -d /opt/opsly/scripts ]] || die "No existe /opt/opsly/scripts (¿estás en el VPS con el repo ya clonado?)" 1

run cp "${REPO_ROOT}/infra/systemd/opsly-git-pull-watcher.service" /etc/systemd/system/opsly-git-pull-watcher.service
if [[ "${DRY_RUN}" != true ]]; then
  systemctl daemon-reload
  systemctl enable --now opsly-git-pull-watcher.service
fi

log_ok "Linux (system/VPS): opsly-git-pull-watcher activo."
log_info "Logs: journalctl -u opsly-git-pull-watcher.service -f"
