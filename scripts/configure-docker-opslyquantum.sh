#!/usr/bin/env bash
# Ajustes sugeridos para Docker en el worker Linux **opslyquantum** (Docker Engine).
# Opcional: escribir ~/.docker/daemon.json con backup (útil con Docker rootless).
# Para daemon en root: edita /etc/docker/daemon.json (sudo), no lo automatizamos aquí.
#
# Uso:
#   ./scripts/configure-docker-opslyquantum.sh
#   ./scripts/configure-docker-opslyquantum.sh --write-daemon
#   ./scripts/configure-docker-opslyquantum.sh --dry-run

set -euo pipefail

DRY_RUN=false
WRITE_DAEMON=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --write-daemon) WRITE_DAEMON=true ;;
    -h|--help)
      echo "Uso: $0 [--dry-run] [--write-daemon]"
      exit 0
      ;;
    *)
      echo "Opción desconocida: $1" >&2
      exit 1
      ;;
  esac
  shift
done

DAEMON_PATH="${HOME}/.docker/daemon.json"
BACKUP_PATH="${HOME}/.docker/daemon.json.bak.$(date +%Y%m%d%H%M%S)"

write_daemon_json() {
  if [[ "${DRY_RUN}" == true ]]; then
    echo "[dry-run] escribiría ${DAEMON_PATH} (backup en ${BACKUP_PATH})"
    return 0
  fi
  mkdir -p "${HOME}/.docker"
  if [[ -f "${DAEMON_PATH}" ]]; then
    cp -a "${DAEMON_PATH}" "${BACKUP_PATH}"
    echo "Backup: ${BACKUP_PATH}"
  fi
  cat > "${DAEMON_PATH}" << 'EOF'
{
  "debug": false,
  "experimental": false,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    }
  }
}
EOF
  echo "Escrito ${DAEMON_PATH}. Reinicia Docker (rootless: systemctl --user restart docker; root: sudo systemctl restart docker)."
}

if ! command -v docker >/dev/null 2>&1; then
  echo "docker no está en PATH." >&2
  exit 1
fi

echo "Docker: $(docker --version)"

if [[ "${WRITE_DAEMON}" == true ]]; then
  write_daemon_json
fi

if [[ "$(uname -s)" == "Darwin" ]]; then
  echo ""
  echo "Aviso: estás en macOS; este script está pensado para el worker Linux opslyquantum."
  if [[ -d "/Applications/Docker.app" ]]; then
    echo "Docker Desktop: revisa Settings > Resources (RAM/CPU según el host)."
  fi
fi

if [[ "${DRY_RUN}" != true ]]; then
  echo ""
  echo "Limpieza ligera (prune -f)..."
  docker system prune -f
fi

echo ""
echo "Resumen:"
docker info 2>/dev/null | grep -E "^( Operating System| CPUs| Total Memory| Docker Root Dir)" || docker info | head -30

echo ""
docker system df

echo ""
echo "Hecho."
