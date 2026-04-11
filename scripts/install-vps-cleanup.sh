#!/usr/bin/env bash
# Instala cron, logrotate y (opcional) timer systemd para limpieza/alertas en el VPS.
# Ejecutar EN EL VPS como root: sudo bash /opt/opsly/scripts/install-vps-cleanup.sh [--timer]
#
# --timer  Copia e habilita opsly-cleanup.timer (desactiva duplicar la línea diaria de cron si la usas).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
INSTALL_TIMER="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --timer)
      INSTALL_TIMER="true"
      shift
      ;;
    *)
      echo "Opción desconocida: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Ejecutar como root (sudo)." >&2
  exit 1
fi

mkdir -p "${OPS_ROOT}/logs"
chmod 755 "${OPS_ROOT}/logs"

chmod 755 "${OPS_ROOT}/scripts/vps-cleanup-robust.sh" "${OPS_ROOT}/scripts/disk-alert.sh"

cp "${OPS_ROOT}/infra/cron/opsly-cleanup" /etc/cron.d/opsly-cleanup
chmod 644 /etc/cron.d/opsly-cleanup

cp "${OPS_ROOT}/infra/cron/logrotate-opsly-cleanup.conf" /etc/logrotate.d/opsly-cleanup
chmod 644 /etc/logrotate.d/opsly-cleanup

echo "Instalado: /etc/cron.d/opsly-cleanup, logrotate, logs en ${OPS_ROOT}/logs"

if [[ "${INSTALL_TIMER}" == "true" ]]; then
  cp "${OPS_ROOT}/infra/systemd/opsly-cleanup.service" /etc/systemd/system/
  cp "${OPS_ROOT}/infra/systemd/opsly-cleanup.timer" /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable --now opsly-cleanup.timer
  echo "Timer opsly-cleanup.timer habilitado. Considera comentar la línea cron diaria 03:00 para no duplicar."
else
  echo "Timer systemd omitido. Usa --timer para instalarlo (o solo cron)."
fi

echo "OK"
