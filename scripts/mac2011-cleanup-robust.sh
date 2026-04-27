#!/usr/bin/env bash
# Limpieza robusta — pensado para worker (opsly-worker) o host Linux con Docker.
# Uso: ./scripts/mac2011-cleanup-robust.sh [--dry-run] [--aggressive]
#
# Logs: OPSLY_LOG_DIR (default: $HOME/opsly/logs). Crear con permisos de usuario;
#       para /var/log hace falta ejecutar con sudo y definir OPSLY_LOG_DIR=/var/log/opsly

set -euo pipefail

DRY_RUN=false
AGGRESSIVE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --aggressive) AGGRESSIVE=true ;;
    *) ;;
  esac
  shift
done

OPSLY_LOG_DIR="${OPSLY_LOG_DIR:-${HOME}/opsly/runtime/logs}"
mkdir -p "${OPSLY_LOG_DIR}"
LOG_FILE="${OPSLY_LOG_DIR}/opsly-mac2011-cleanup.log"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg" | tee -a "${LOG_FILE}"
}

run_cmd() {
  local cmd="$1"
  if [[ "${DRY_RUN}" == true ]]; then
    log "[DRY-RUN] ${cmd}"
  else
    log "Ejecutando: ${cmd}"
    # shellcheck disable=SC2086
    eval "${cmd}" 2>&1 | tee -a "${LOG_FILE}" || true
  fi
}

log "🧹 INICIANDO LIMPIEZA (host: $(uname -s))"
log "Dry run: ${DRY_RUN}"
log "Aggressive: ${AGGRESSIVE}"

log ""
log "📊 ESTADO INICIAL:"
df -h / | tail -1 | tee -a "${LOG_FILE}" || true
if command -v vm_stat >/dev/null 2>&1; then
  vm_stat | head -6 | tee -a "${LOG_FILE}" || true
elif command -v free >/dev/null 2>&1; then
  free -h | head -2 | tee -a "${LOG_FILE}" || true
fi
if command -v docker >/dev/null 2>&1; then
  docker system df 2>&1 | tee -a "${LOG_FILE}" || true
else
  log "Docker no instalado o no en PATH"
fi

log ""
log "🐳 LIMPIEZA DOCKER:"
if command -v docker >/dev/null 2>&1; then
  run_cmd "docker image prune -a --filter until=168h -f"
  run_cmd "docker container prune -f"
  run_cmd "docker builder prune -a -f"
  run_cmd "docker network prune -f"
  if [[ "${AGGRESSIVE}" == true ]]; then
    run_cmd "docker volume prune -f"
  fi
else
  log "Omitido: sin docker"
fi

log ""
log "📝 LOGS OPSLY / APP:"
if [[ -d "${HOME}/opsly/runtime/logs" ]]; then
  run_cmd "find \"${HOME}/opsly/runtime/logs\" -type f -name '*.log' -mtime +7 -delete"
fi
# macOS: logs del sistema suelen requerir sudo; no borrar /var/log por defecto
if [[ "${AGGRESSIVE}" == true ]] && [[ -w /var/log ]]; then
  run_cmd "find /var/log -type f -name '*.log' -mtime +7 -delete 2>/dev/null || true"
fi

# Docker Desktop (Linux VM): rutas varían; solo si existe
if [[ -d /var/lib/docker/containers ]]; then
  run_cmd "find /var/lib/docker/containers -type f -name '*.log' -size +100M -exec truncate -s 0 {} \\; 2>/dev/null || true"
fi

log ""
log "📦 CACHÉS (usuario actual):"
run_cmd "rm -rf \"${HOME}/.npm/_cacache\" 2>/dev/null || true"
run_cmd "rm -rf \"${HOME}/.cache/yarn\" 2>/dev/null || true"
run_cmd "rm -rf \"${HOME}/.cache/pip\" 2>/dev/null || true"

if command -v docker >/dev/null 2>&1; then
  while IFS= read -r cid; do
    [[ -z "${cid}" ]] && continue
    if docker exec "${cid}" which npm >/dev/null 2>&1; then
      run_cmd "docker exec \"${cid}\" npm cache clean --force 2>/dev/null || true"
    fi
  done < <(docker ps -q 2>/dev/null || true)
fi

log ""
log "🗂️ TEMPORALES:"
run_cmd "find /tmp -type f -mtime +7 -delete 2>/dev/null || true"
if [[ "${AGGRESSIVE}" == true ]]; then
  run_cmd "find \"${HOME}/Downloads\" -type f -mtime +30 -delete 2>/dev/null || true"
fi

log ""
log "🤖 OLLAMA / WORKERS (logs viejos):"
if [[ -d "${HOME}/.ollama/logs" ]]; then
  run_cmd "find \"${HOME}/.ollama/logs\" -type f -mtime +3 -delete 2>/dev/null || true"
fi
if [[ -d "${HOME}/opsly/workers/logs" ]]; then
  run_cmd "find \"${HOME}/opsly/workers/logs\" -type f -name '*.log' -mtime +3 -delete 2>/dev/null || true"
fi
if [[ -d "${HOME}/opsly" ]]; then
  run_cmd "find \"${HOME}/opsly\" -name '*.log' -size +50M -exec truncate -s 10M {} \\; 2>/dev/null || true"
fi

log ""
log "📊 ESTADO FINAL:"
df -h / | tail -1 | tee -a "${LOG_FILE}" || true
if command -v vm_stat >/dev/null 2>&1; then
  vm_stat | head -6 | tee -a "${LOG_FILE}" || true
fi
if command -v docker >/dev/null 2>&1; then
  docker system df 2>&1 | tee -a "${LOG_FILE}" || true
fi

log ""
log "✅ Limpieza completada — log: ${LOG_FILE}"
