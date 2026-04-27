#!/usr/bin/env bash
# Instala la unidad systemd opsly-worker en el equipo actual (worker Mac 2011).
# Uso: desde ~/opsly, con sudo:  sudo ./scripts/install-opsly-worker-systemd.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_SRC="${ROOT}/infra/systemd/opsly-worker.service"
if [[ ! -f "${UNIT_SRC}" ]]; then
  echo "No se encuentra ${UNIT_SRC}" >&2
  exit 1
fi
if [[ "${EUID}" -ne 0 ]]; then
  echo "Ejecutar con sudo: sudo $0" >&2
  exit 1
fi
install -m 0644 "${UNIT_SRC}" /etc/systemd/system/opsly-worker.service
mkdir -p /home/opslyquantum/opsly/runtime/logs
chown opslyquantum:opslyquantum /home/opslyquantum/opsly/runtime/logs
systemctl daemon-reload
systemctl enable opsly-worker.service
systemctl restart opsly-worker.service
systemctl --no-pager status opsly-worker.service
