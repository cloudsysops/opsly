#!/usr/bin/env bash
# Limpieza robusta en el VPS (ejecutar en el host con Docker: root o usuario en grupo docker).
# Uso en servidor:
#   sudo /opt/opsly/scripts/vps-cleanup-robust.sh [--dry-run] [--aggressive] [--light]
#
# --dry-run    Solo muestra qué haría (no modifica estado).
# --light      Solo Docker: imágenes (unused >7d), contenedores parados, build cache, networks.
# --aggressive Además: docker volume prune (¡volúmenes huérfanos!).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

DRY_RUN="${DRY_RUN:-false}"
AGGRESSIVE="${AGGRESSIVE:-false}"
LIGHT="${LIGHT:-false}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --aggressive)
      AGGRESSIVE="true"
      shift
      ;;
    --light)
      LIGHT="true"
      shift
      ;;
    -h | --help)
      grep '^#' "$0" | head -20
      exit 0
      ;;
    *)
      die "Opción desconocida: $1" 1
      ;;
  esac
done

SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  SUDO="sudo"
fi

docker_safe() {
  if ! command -v docker >/dev/null 2>&1; then
    log_error "docker no está en PATH"
    exit 2
  fi
}

run_docker() {
  local args=("$@")
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: docker ${args[*]}"
    return 0
  fi
  docker "${args[@]}"
}

echo "🧹 LIMPIEZA ROBUSTA VPS (Opsly)"
echo "=============================="
echo "  dry-run=${DRY_RUN}  light=${LIGHT}  aggressive=${AGGRESSIVE}"
echo ""

docker_safe

echo "📊 Estado inicial:"
df -h / | tail -1
echo ""

echo "🐳 Docker"
run_docker image prune -a --filter "until=168h" -f
run_docker container prune -f
run_docker builder prune -a -f
run_docker network prune -f

if [[ "${AGGRESSIVE}" == "true" ]]; then
  log_warn "Modo agresivo: docker volume prune (volúmenes no referenciados)."
  run_docker volume prune -f
fi

if [[ "${LIGHT}" == "true" ]]; then
  echo ""
  echo "📊 Estado final (--light, sin logs ni tmp):"
  df -h / | tail -1
  echo ""
  echo "✅ Limpieza ligera completada"
  exit 0
fi

echo ""
echo "📝 Logs del sistema (${SUDO} puede aplicar)"
if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "DRY-RUN: ${SUDO} find /var/log … ; journalctl --vacuum-time=3d"
else
  ${SUDO} find /var/log -type f -name '*.log' -mtime +7 -delete 2>/dev/null || true
  ${SUDO} find /var/log -type f -name '*.gz' -mtime +3 -delete 2>/dev/null || true
  if command -v journalctl >/dev/null 2>&1; then
    ${SUDO} journalctl --vacuum-time=3d 2>/dev/null || true
  fi
fi

echo ""
echo "📦 Cachés npm (contenedores app)"
for c in infra-app-1 infra-app-2 opsly_portal opsly_admin; do
  if docker ps --format '{{.Names}}' | grep -qx "${c}" 2>/dev/null; then
    if [[ "${DRY_RUN}" == "true" ]]; then
      log_info "DRY-RUN: docker exec ${c} npm cache clean --force"
    else
      docker exec "${c}" npm cache clean --force 2>/dev/null || true
    fi
  fi
done

echo ""
echo "📦 Cachés pip/apt (root)"
if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "DRY-RUN: rm pip cache ; apt-get clean"
else
  rm -rf /root/.cache/pip/* 2>/dev/null || true
  ${SUDO} apt-get clean -y 2>/dev/null || true
fi

echo ""
echo "🗂️ Temporales (>7 días)"
if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "DRY-RUN: find /tmp /var/tmp -type f -mtime +7 -delete"
else
  ${SUDO} find /tmp -type f -mtime +7 -delete 2>/dev/null || true
  ${SUDO} find /var/tmp -type f -mtime +7 -delete 2>/dev/null || true
fi

echo ""
echo "📊 Estado final:"
df -h / | tail -1
echo ""
echo "✅ Limpieza completada"
