#!/usr/bin/env bash
# Instala la unidad systemd de USUARIO opsly-worker (sin sudo).
# Uso: desde ~/opsly:  ./scripts/install-opsly-worker-user-systemd.sh
#
# Para que arranque tras reboot sin login interactivo (una vez, con sudo):
#   sudo loginctl enable-linger "$USER"
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_SRC="${ROOT}/infra/systemd/opsly-worker.user.service"
USER_UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UNIT_DST="${USER_UNIT_DIR}/opsly-worker.service"

if [[ ! -f "${UNIT_SRC}" ]]; then
  echo "No se encuentra ${UNIT_SRC}" >&2
  exit 1
fi
if [[ "${EUID}" -eq 0 ]]; then
  echo "Ejecutar como usuario normal (no root). Para unidad de sistema: sudo ./scripts/install-opsly-worker-systemd.sh" >&2
  exit 1
fi

mkdir -p "${ROOT}/runtime/logs"
mkdir -p "${USER_UNIT_DIR}"
install -m 0644 "${UNIT_SRC}" "${UNIT_DST}"
chmod +x "${ROOT}/scripts/run-worker-with-nvm.sh" "${ROOT}/scripts/start-worker.sh" "${ROOT}/scripts/run-orchestrator-worker.sh" 2>/dev/null || true

systemctl --user daemon-reload
systemctl --user enable opsly-worker.service
systemctl --user restart opsly-worker.service
systemctl --user --no-pager status opsly-worker.service

echo ""
echo "Logs: journalctl --user -u opsly-worker.service -f"
echo "Si quieres que arranque tras reboot sin abrir sesión: sudo loginctl enable-linger $(whoami)"
