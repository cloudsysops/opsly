#!/usr/bin/env bash
# Instala el timer systemd para opsly-disk-maintain-fanout (VPS o worker Linux).
#
# VPS (system, /opt/opsly):
#   sudo ./scripts/install-opsly-disk-maintain-timer.sh
#
# Worker (user systemd, ~/opsly):
#   ./scripts/install-opsly-disk-maintain-timer.sh --user
#
# Requiere: scripts copiados en el destino y chmod +x; en VPS git pull en /opt/opsly.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

MODE="system"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --user) MODE="user" ;;
    -h | --help)
      grep '^#' "$0" | head -22
      exit 0
      ;;
    *) die "Opción desconocida: $1" 1 ;;
  esac
  shift
done

chmod +x "${REPO_ROOT}/scripts/opsly-disk-maintain-fanout.sh" "${REPO_ROOT}/scripts/opsly-maintain-remote.sh" 2>/dev/null || true

if [[ "${MODE}" == "user" ]]; then
  require_cmd systemctl
  mkdir -p "${HOME}/.config/systemd/user"
  cp "${REPO_ROOT}/infra/systemd/opsly-disk-maintain-fanout.user.service" "${HOME}/.config/systemd/user/opsly-disk-maintain-fanout.service"
  cp "${REPO_ROOT}/infra/systemd/opsly-disk-maintain-fanout.user.timer" "${HOME}/.config/systemd/user/opsly-disk-maintain-fanout.timer"
  cp "${REPO_ROOT}/infra/systemd/opsly-disk-maintain-nightly.user.service" "${HOME}/.config/systemd/user/opsly-disk-maintain-nightly.service"
  cp "${REPO_ROOT}/infra/systemd/opsly-disk-maintain-nightly.user.timer" "${HOME}/.config/systemd/user/opsly-disk-maintain-nightly.timer"
  log_info "Edita %h en el .service si el clon no está en ~/opsly"
  systemctl --user daemon-reload
  systemctl --user enable --now opsly-disk-maintain-fanout.timer opsly-disk-maintain-nightly.timer
  log_ok "Timers user activos: opsly-disk-maintain-fanout.timer + opsly-disk-maintain-nightly.timer"
  exit 0
fi

if [[ "$(id -u)" -ne 0 ]]; then
  die "Modo system: ejecutar con sudo" 1
fi

require_cmd systemctl
[[ -d /opt/opsly/scripts ]] || die "No existe /opt/opsly/scripts (git pull en el VPS)" 1

cp "${REPO_ROOT}/infra/systemd/opsly-disk-maintain-fanout.service" /etc/systemd/system/opsly-disk-maintain-fanout.service
cp "${REPO_ROOT}/infra/systemd/opsly-disk-maintain-fanout.timer" /etc/systemd/system/opsly-disk-maintain-fanout.timer
cp "${REPO_ROOT}/infra/systemd/opsly-disk-maintain-nightly.service" /etc/systemd/system/opsly-disk-maintain-nightly.service
cp "${REPO_ROOT}/infra/systemd/opsly-disk-maintain-nightly.timer" /etc/systemd/system/opsly-disk-maintain-nightly.timer
chmod +x /opt/opsly/scripts/opsly-disk-maintain-fanout.sh /opt/opsly/scripts/opsly-maintain-remote.sh
systemctl daemon-reload
systemctl enable --now opsly-disk-maintain-fanout.timer opsly-disk-maintain-nightly.timer
log_ok "Timers system activos: opsly-disk-maintain-fanout.timer + opsly-disk-maintain-nightly.timer"
