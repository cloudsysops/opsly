#!/usr/bin/env bash
# Instala el cron de snapshot BI de Peskids en el VPS.
# Ejecutar EN EL VPS como root: sudo bash /opt/opsly/scripts/install-peskids-bi.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Ejecutar como root (sudo)." >&2
  exit 1
fi

mkdir -p "${OPS_ROOT}/logs" "${OPS_ROOT}/apps/peskids/runtime/analytics"
chmod 755 "${OPS_ROOT}/logs" "${OPS_ROOT}/apps/peskids/runtime/analytics"

chmod 755 "${OPS_ROOT}/scripts/peskids-bi-snapshot.sh"

cp "${OPS_ROOT}/infra/cron/peskids-bi-snapshot" /etc/cron.d/peskids-bi-snapshot
chmod 644 /etc/cron.d/peskids-bi-snapshot

echo "Instalado: /etc/cron.d/peskids-bi-snapshot, logs en ${OPS_ROOT}/logs"
echo "OK"

