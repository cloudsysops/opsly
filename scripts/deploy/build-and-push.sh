#!/usr/bin/env bash
# Deploy de Opsly a staging en el VPS (Ubuntu + Docker).
# Uso (desde tu Mac, con SSH al VPS):
#   ./scripts/deploy-staging.sh [--dry-run] [--stop-smiletrip-nginx]
#
# Variables opcionales:
#   VPS_HOST   (default: 157.245.223.7)
#   VPS_USER   (default: vps-dragon)
#   OPSLY_GIT_URL (default: git@github.com:cloudsysops/opsly.git)
#   OPSLY_GIT_BRANCH (default: main)
#   PLATFORM_DOMAIN_STAGING (ej. staging.opsly.example.com) — requerido en .env del servidor

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

VPS_HOST="${VPS_HOST:-157.245.223.7}"
VPS_USER="${VPS_USER:-vps-dragon}"
VPS="${VPS_USER}@${VPS_HOST}"
OPSLY_GIT_URL="${OPSLY_GIT_URL:-git@github.com:cloudsysops/opsly.git}"
OPSLY_GIT_BRANCH="${OPSLY_GIT_BRANCH:-main}"
OPS_DEPLOY_ROOT="${OPS_DEPLOY_ROOT:-/opt/opsly}"
STOP_SMILETRIP_NGINX="${STOP_SMILETRIP_NGINX:-0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) export DRY_RUN=true ;;
    --stop-smiletrip-nginx) STOP_SMILETRIP_NGINX=1 ;;
    -h | --help)
      echo "Uso: $0 [--dry-run] [--stop-smiletrip-nginx]"
      exit 0
      ;;
    *)
      log_error "Argumento desconocido: $1"
      exit 1
      ;;
  esac
  shift
done

ssh_base=(ssh -o BatchMode=yes -o ConnectTimeout=15 "${VPS}")

remote_script() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: no se ejecuta SSH. Pasos que correrían en ${VPS}:"
    log_info "  - Opcional (--stop-smiletrip-nginx): docker stop smiletrip_nginx"
    log_info "  - mkdir -p ${OPS_DEPLOY_ROOT}/{tenants,letsencrypt,infra/templates}"
    log_info "  - git clone o git pull ${OPSLY_GIT_URL} (${OPSLY_GIT_BRANCH})"
    log_info "  - cp .env.example .env si no hay .env"
    log_info "  - docker network create traefik-public"
    log_info "  - docker compose -f ${OPS_DEPLOY_ROOT}/infra/docker-compose.platform.yml up -d"
    log_info "  - health vía docker exec al contenedor app"
    return 0
  fi
  run "${ssh_base[@]}" bash -s -- \
    "${OPS_DEPLOY_ROOT}" \
    "${OPSLY_GIT_URL}" \
    "${OPSLY_GIT_BRANCH}" \
    "${STOP_SMILETRIP_NGINX}" <<'REMOTE_EOF'
set -euo pipefail
OPS_ROOT="${1:?}"
GIT_URL="${2:?}"
GIT_BRANCH="${3:?}"
STOP_NGX="${4:-0}"

log() { echo "[remote] $*"; }

if [[ "${STOP_NGX}" == "1" ]]; then
  if docker ps --format '{{.Names}}' | grep -qx 'smiletrip_nginx'; then
    log "Deteniendo smiletrip_nginx para liberar 80/443 (Traefik Opsly)"
    docker stop smiletrip_nginx
  else
    log "smiletrip_nginx no está en ejecución"
  fi
else
  if docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E 'smiletrip_nginx|:80->|:443->'; then
    log "ADVERTENCIA: hay contenedor(es) usando 80/443. Relanza con --stop-smiletrip-nginx si Opsly debe tomar esos puertos."
  fi
fi

sudo mkdir -p "${OPS_ROOT}" || mkdir -p "${OPS_ROOT}"
sudo chown -R "$(whoami):$(whoami)" "${OPS_ROOT}" 2>/dev/null || true

mkdir -p "${OPS_ROOT}/runtime/tenants"
mkdir -p "${OPS_ROOT}/runtime/letsencrypt"
mkdir -p "${OPS_ROOT}/infra/templates"

if [[ ! -d "${OPS_ROOT}/.git" ]]; then
  log "Clonando ${GIT_URL} (${GIT_BRANCH}) → ${OPS_ROOT}"
  git clone --branch "${GIT_BRANCH}" --depth 1 "${GIT_URL}" "${OPS_ROOT}"
else
  log "Actualizando repo en ${OPS_ROOT}"
  cd "${OPS_ROOT}"
  git fetch origin "${GIT_BRANCH}"
  git reset --hard "origin/${GIT_BRANCH}"
fi

cd "${OPS_ROOT}"

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    log "Creando .env desde .env.example — EDITA valores de staging (PLATFORM_DOMAIN, tokens, Supabase, Stripe)"
    cp .env.example .env
    chmod 600 .env
  else
    echo "ERROR: falta .env y .env.example en ${OPS_ROOT}" >&2
    exit 1
  fi
else
  log ".env ya existe; no se sobrescribe"
fi

docker network create traefik-public 2>/dev/null || true

cd "${OPS_ROOT}/infra"
if ! docker compose --env-file "${OPS_ROOT}/.env" -f docker-compose.platform.yml config >/dev/null 2>&1; then
  echo "ERROR: docker compose config inválido. Revisa .env en ${OPS_ROOT}" >&2
  exit 1
fi

log "Levantando stack (docker-compose.platform.yml)"
docker compose --env-file "${OPS_ROOT}/.env" -f docker-compose.platform.yml pull 2>/dev/null || true
docker compose --env-file "${OPS_ROOT}/.env" -f docker-compose.platform.yml up -d

sleep 8

HEALTH_OK=0
APP_CID="$(docker ps -q --filter "label=com.docker.compose.service=app" | head -1)"
if [[ -n "${APP_CID}" ]]; then
  if docker exec "${APP_CID}" wget -qO- --timeout=5 http://127.0.0.1:3000/api/health 2>/dev/null | grep -q .; then
    log "Health OK (desde contenedor app :3000)"
    HEALTH_OK=1
  elif docker exec "${APP_CID}" sh -c 'command -v wget >/dev/null' 2>/dev/null; then
    log "wget en app no devolvió health"
  else
    if docker exec "${APP_CID}" node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(t=>{if(!t)process.exit(1)}).catch(()=>process.exit(1))" 2>/dev/null; then
      log "Health OK (node fetch dentro del contenedor)"
      HEALTH_OK=1
    fi
  fi
fi

if [[ "${HEALTH_OK}" -eq 0 ]]; then
  log "WARN: no se pudo verificar /api/health vía contenedor; revisa logs: docker compose --env-file ${OPS_ROOT}/.env -f ${OPS_ROOT}/infra/docker-compose.platform.yml logs app"
fi

log "Contenedores Opsly:"
docker compose --env-file "${OPS_ROOT}/.env" -f docker-compose.platform.yml ps

REMOTE_EOF
}

log_info "Deploy staging → ${VPS} (root ${OPS_DEPLOY_ROOT})"
log_info "Repo: ${OPSLY_GIT_URL} @ ${OPSLY_GIT_BRANCH}"

if [[ "${STOP_SMILETRIP_NGINX}" -eq 1 ]]; then
  log_warn "Se detendrá smiletrip_nginx si existe (libera 80/443 para Traefik)."
fi

remote_script

log_info "=== Resumen ==="
log_info "En el VPS: edita ${OPS_DEPLOY_ROOT}/.env (PLATFORM_DOMAIN, PLATFORM_TENANTS_HOST_PATH, secrets)."
log_info "API (tras DNS): https://api.<PLATFORM_DOMAIN>/api/health"
log_info "Si smiletrip necesita 80/443: reordena stacks o usa otro host."
