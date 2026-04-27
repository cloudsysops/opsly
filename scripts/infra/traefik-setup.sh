#!/usr/bin/env bash
# Migración: edge nginx (SmileTrip) → Traefik v3 compartido + Opsly.
# Ejecutar EN EL VPS desde el repo clonado:
#   cd ~/opsly && ./scripts/migrate-to-traefik.sh [--dry-run] [--yes]
#
# Primera vez sin repo: git clone git@github.com:cloudsysops/opsly.git ~/opsly && cd ~/opsly && ./scripts/migrate-to-traefik.sh

set -euo pipefail

for _arg in "$@"; do
  case "${_arg}" in
    --dry-run) export DRY_RUN=true ;;
    --yes) export ASSUME_YES=true ;;
    -h | --help)
      echo "Uso: $0 [--dry-run] [--yes]"
      exit 0
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_cmd docker git

# Repo Opsly: por defecto el padre de este script (tras `git clone … ~/opsly`).
OPS_HOME="${OPS_HOME:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
SMILETRIP_COMPOSE_DIR="${SMILETRIP_COMPOSE_DIR:-/home/vps-dragon/smiletrip/docker}"
SMILETRIP_N8N_CONTAINER="${SMILETRIP_N8N_CONTAINER:-smiletrip_n8n}"
SMILETRIP_NGINX_CONTAINER="${SMILETRIP_NGINX_CONTAINER:-smiletrip_nginx}"
SMILETRIP_HOST="${SMILETRIP_HOST:-smiletripcare.com}"
OPS_GIT_URL="${OPS_GIT_URL:-git@github.com:cloudsysops/opsly.git}"
OPS_GIT_BRANCH="${OPS_GIT_BRANCH:-main}"
TRAEFIK_HOME="${TRAEFIK_HOME:-/home/vps-dragon/traefik}"

INFRA_DIR="${OPS_HOME}/infra"
COMPOSE_PLATFORM="${INFRA_DIR}/docker-compose.platform.yml"
OVERRIDE_FILE="${SMILETRIP_COMPOSE_DIR}/docker-compose.traefik.generated.yml"

disk_mb() {
  df -BM / 2>/dev/null | tail -1 | awk '{gsub(/M/,"",$4); print $4}'
}

# --- a. Limpieza disco ---
log_info "[a] Limpieza Docker (imágenes y build cache)"
BEFORE="$(disk_mb || echo "?")"
log_info "Espacio libre en / (~MB disponible según df): ${BEFORE}"
run docker image prune -a --force
run docker builder prune --force
AFTER="$(disk_mb || echo "?")"
log_info "Tras prune, espacio libre (~MB): ${AFTER}"

# --- b. Red traefik-public ---
log_info "[b] Red traefik-public"
if docker network inspect traefik-public >/dev/null 2>&1; then
  log_info "traefik-public ya existe"
else
  run docker network create traefik-public
fi
run docker network inspect traefik-public --format '{{.Name}} driver={{.Driver}}'

# --- e. Clonar / actualizar Opsly (necesario antes de Traefik: infra/traefik) ---
log_info "[e] Repo Opsly en ${OPS_HOME}"
if [[ ! -d "${OPS_HOME}/.git" ]]; then
  if [[ -d "${OPS_HOME}" ]] && [[ -n "$(ls -A "${OPS_HOME}" 2>/dev/null)" ]]; then
    die "OPS_HOME existe pero no es un repo git (vacía ${OPS_HOME} o exporta OPS_HOME al clone): ${OPS_HOME}" 1
  fi
  parent="$(dirname "${OPS_HOME}")"
  run mkdir -p "${parent}"
  run git clone --branch "${OPS_GIT_BRANCH}" --depth 1 "${OPS_GIT_URL}" "${OPS_HOME}"
else
  run git -C "${OPS_HOME}" fetch origin "${OPS_GIT_BRANCH}" || true
  run git -C "${OPS_HOME}" merge --ff-only "origin/${OPS_GIT_BRANCH}" 2>/dev/null || run git -C "${OPS_HOME}" pull --no-rebase origin "${OPS_GIT_BRANCH}"
fi

if [[ ! -f "${COMPOSE_PLATFORM}" ]]; then
  die "No se encuentra ${COMPOSE_PLATFORM} tras el clone" 1
fi

# --- c (preparación). Copia espejo de Traefik en ${TRAEFIK_HOME} (compose sigue leyendo ${INFRA_DIR}/traefik) ---
log_info "[c] Copiar configuración Traefik a ${TRAEFIK_HOME}"
run mkdir -p "${TRAEFIK_HOME}"
if [[ -d "${INFRA_DIR}/traefik" ]]; then
  run cp -a "${INFRA_DIR}/traefik/." "${TRAEFIK_HOME}/"
fi
run mkdir -p "${TRAEFIK_HOME}/dynamic"

# --- f. .env mínimo ---
log_info "[f] Fichero .env"
if [[ ! -f "${OPS_HOME}/.env" ]]; then
  if [[ -f "${OPS_HOME}/.env.example" ]]; then
    run cp "${OPS_HOME}/.env.example" "${OPS_HOME}/.env"
    run chmod 600 "${OPS_HOME}/.env"
  else
    die "Falta .env.example en ${OPS_HOME}" 1
  fi
fi

log_warn "Variables que DEBES revisar en ${OPS_HOME}/.env antes de producción:"
cat <<'VARS'
  PLATFORM_DOMAIN          (ej. opsly.cloudsysops.com → api./admin./traefik.)
  ACME_EMAIL
  TRAEFIK_DASHBOARD_BASIC_AUTH_USERS  (htpasswd, escapa $ en Compose)
  REDIS_PASSWORD
  APP_IMAGE / ADMIN_APP_IMAGE
  PLATFORM_TENANTS_HOST_PATH=/home/vps-dragon/opsly/runtime/tenants
  NEXT_PUBLIC_* (admin), SUPABASE_*, STRIPE_*, PLATFORM_ADMIN_TOKEN, etc.
VARS

if ! confirm "¿Continuar con parada de nginx, Traefik y migración SmileTrip?"; then
  log_info "Abortado por el usuario."
  exit 0
fi

# --- g (parcial). letsencrypt en host (documentación / backups); el runtime usa volumen Compose ---
log_info "[g] Directorios letsencrypt en ${OPS_HOME}"
run mkdir -p "${OPS_HOME}/runtime/letsencrypt"
if [[ ! -f "${OPS_HOME}/runtime/letsencrypt/acme.json" ]]; then
  run touch "${OPS_HOME}/runtime/letsencrypt/acme.json"
  run chmod 600 "${OPS_HOME}/runtime/letsencrypt/acme.json"
fi

# --- c (runtime): Traefik necesita puertos 80/443 libres ---
log_info "[c] Parar ${SMILETRIP_NGINX_CONTAINER} para liberar :80/:443 (downtime breve del edge nginx)"
if docker ps --format '{{.Names}}' | grep -qx "${SMILETRIP_NGINX_CONTAINER}"; then
  run docker stop "${SMILETRIP_NGINX_CONTAINER}"
else
  log_info "${SMILETRIP_NGINX_CONTAINER} ya estaba parado o no existe"
fi

log_info "[c] Levantar solo Traefik (compose)"
cd "${INFRA_DIR}"
run docker compose -f docker-compose.platform.yml up -d traefik

# --- d. SmileTrip n8n detrás de Traefik ---
log_info "[d] SmileTrip → Traefik (override generado, sin editar docker-compose.yml original)"

if ! docker ps -a --format '{{.Names}}' | grep -qx "${SMILETRIP_N8N_CONTAINER}"; then
  log_warn "Contenedor ${SMILETRIP_N8N_CONTAINER} no encontrado; omite labels/recreate"
else
  N8N_SVC="$(docker inspect "${SMILETRIP_N8N_CONTAINER}" --format '{{index .Config.Labels "com.docker.compose.service"}}' 2>/dev/null || echo n8n)"
  [[ -z "${N8N_SVC}" ]] && N8N_SVC="n8n"
  log_info "Servicio compose detectado para n8n: ${N8N_SVC}"

  run mkdir -p "${SMILETRIP_COMPOSE_DIR}"
  if [[ "${DRY_RUN}" != "true" ]]; then
    cat >"${OVERRIDE_FILE}" <<EOF
# Generado por migrate-to-traefik.sh — no editar a mano (regenerar con el script)
services:
  ${N8N_SVC}:
    labels:
      - traefik.enable=true
      - traefik.docker.network=traefik-public
      - traefik.http.routers.smiletrip-n8n.rule=Host(\`${SMILETRIP_HOST}\`)
      - traefik.http.routers.smiletrip-n8n.entrypoints=websecure
      - traefik.http.routers.smiletrip-n8n.tls.certresolver=letsencrypt
      - traefik.http.services.smiletrip-n8n.loadbalancer.server.port=5678
    networks:
      - default
      - traefik-public

networks:
  traefik-public:
    external: true
EOF
  else
    log_info "DRY-RUN: escribiría ${OVERRIDE_FILE}"
  fi

  COMPOSE_MAIN=""
  if [[ -f "${SMILETRIP_COMPOSE_DIR}/docker-compose.yml" ]]; then
    COMPOSE_MAIN="${SMILETRIP_COMPOSE_DIR}/docker-compose.yml"
  elif [[ -f "${SMILETRIP_COMPOSE_DIR}/docker-compose.yaml" ]]; then
    COMPOSE_MAIN="${SMILETRIP_COMPOSE_DIR}/docker-compose.yaml"
  fi

  if [[ -n "${COMPOSE_MAIN}" ]]; then
    cd "${SMILETRIP_COMPOSE_DIR}"
    PROJ="$(docker inspect "${SMILETRIP_N8N_CONTAINER}" --format '{{index .Config.Labels "com.docker.compose.project"}}' 2>/dev/null || true)"
    COMPOSE_ARGS=(-f "${COMPOSE_MAIN}" -f docker-compose.traefik.generated.yml)
    if [[ -n "${PROJ}" ]]; then
      COMPOSE_ARGS=(-p "${PROJ}" "${COMPOSE_ARGS[@]}")
    fi
    if docker inspect "${SMILETRIP_N8N_CONTAINER}" --format '{{json .Config.Labels}}' 2>/dev/null | grep -q 'traefik\.http\.routers\.smiletrip-n8n'; then
      log_info "Labels Traefik smiletrip-n8n ya aplicados; omitiendo --force-recreate"
      run docker compose "${COMPOSE_ARGS[@]}" up -d "${N8N_SVC}"
    else
      run docker compose "${COMPOSE_ARGS[@]}" up -d --force-recreate "${N8N_SVC}"
    fi
  else
    log_warn "No existe ${SMILETRIP_COMPOSE_DIR}/docker-compose.yml; conectando solo la red al contenedor existente"
    if docker network inspect traefik-public >/dev/null 2>&1; then
      if docker inspect "${SMILETRIP_N8N_CONTAINER}" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | grep -q traefik-public; then
        log_info "${SMILETRIP_N8N_CONTAINER} ya está en traefik-public"
      else
        run docker network connect traefik-public "${SMILETRIP_N8N_CONTAINER}"
      fi
    fi
    log_warn "Sin compose.yml no se aplican labels Traefik; añade override o recrea el servicio con labels manualmente."
  fi
fi

# --- g (tenants) ---
log_info "[g] Directorio tenants Opsly"
run mkdir -p "${OPS_HOME}/runtime/tenants"

# --- h. Redis + app (+ admin) Opsly ---
log_info "[h] Levantar Redis, API y Admin Opsly"
cd "${INFRA_DIR}"
run docker compose -f docker-compose.platform.yml up -d redis app admin

log_info "Esperando 30s arranque…"
sleep 30

APP_CID="$(docker ps -q --filter "label=com.docker.compose.service=app" | head -1)"
if [[ -n "${APP_CID}" ]]; then
  if run docker exec "${APP_CID}" sh -c \
    'wget -qO- --timeout=10 http://127.0.0.1:3000/api/health 2>/dev/null || curl -fsS --max-time 10 http://127.0.0.1:3000/api/health'; then
    log_info "Health API OK (wget/curl en contenedor app)"
  else
    log_warn "Health interno falló; revisa logs: docker compose -f ${COMPOSE_PLATFORM} logs app"
  fi
else
  log_warn "No se encontró contenedor app"
fi

# --- i. Reporte ---
log_info "[i] Resumen"
echo ""
echo "┌────────────────────────────────────────────────────────────┐"
echo "│  Opsly — migración Traefik (estado actual)                 │"
echo "└────────────────────────────────────────────────────────────┘"
printf "%-20s %-10s %s\n" "Traefik" "$(docker ps --filter name=^traefik$ --format '{{.Status}}' 2>/dev/null || echo n/a)" ":80 :443"
printf "%-20s %-10s %s\n" "SmileTrip n8n" "$(docker ps --filter name="${SMILETRIP_N8N_CONTAINER}" --format '{{.Status}}' 2>/dev/null || echo n/a)" "https://${SMILETRIP_HOST}/"
printf "%-20s %-10s %s\n" "SmileTrip nginx" "$(docker ps -a --filter name="${SMILETRIP_NGINX_CONTAINER}" --format '{{.Status}}' 2>/dev/null || echo stopped)" "STOP (rollback: docker start ${SMILETRIP_NGINX_CONTAINER})"
printf "%-20s %-10s %s\n" "Opsly API" "$(docker ps --filter label=com.docker.compose.service=app --format '{{.Status}}' | head -1)" "https://api.\${PLATFORM_DOMAIN}/api/health"
printf "%-20s %-10s %s\n" "Opsly Admin" "$(docker ps --filter name=opsly_admin --format '{{.Status}}' 2>/dev/null || echo n/a)" "https://admin.\${PLATFORM_DOMAIN}/"
echo ""
log_info "Rollback rápido: docker stop traefik && docker start ${SMILETRIP_NGINX_CONTAINER}"
log_info "Logs Traefik: cd ${INFRA_DIR} && docker compose -f docker-compose.platform.yml logs -f traefik"
