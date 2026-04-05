#!/usr/bin/env bash
# Deploy continuo en el VPS (post bootstrap / first-run).
# Uso: cd /opt/opsly && ./scripts/vps-deploy.sh
#      (GitHub Actions puede invocar el mismo comando por SSH.)
#
set -euo pipefail

OPS_ROOT="${OPS_ROOT:-/opt/opsly}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_cmd docker git curl doppler
require_cmd jq

if ! docker compose version >/dev/null 2>&1; then
  die "docker compose no disponible" 2
fi

if [[ "$(id -un)" != "vps-dragon" ]]; then
  log_warn "Usuario actual: $(id -un) (se esperaba vps-dragon)"
fi

COMPOSE_FILE="infra/docker-compose.platform.yml"
DOPPLER_PROJECT="${DOPPLER_PROJECT:-}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-}"
if [[ -z "${DOPPLER_PROJECT}" || -z "${DOPPLER_CONFIG}" ]] && [[ -f "${OPS_ROOT}/config/opsly.config.json" ]] && command -v jq >/dev/null 2>&1; then
  [[ -z "${DOPPLER_PROJECT}" ]] && DOPPLER_PROJECT="$(jq -r '.project.doppler_project // empty' "${OPS_ROOT}/config/opsly.config.json")"
  [[ -z "${DOPPLER_CONFIG}" ]] && DOPPLER_CONFIG="$(jq -r '.project.doppler_config // empty' "${OPS_ROOT}/config/opsly.config.json")"
fi
DOPPLER_PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-prd}"
ENV_FILE="${OPS_ROOT}/.env"

log_info "[a-d] Actualizar código y .env"
run cd "${OPS_ROOT}"

run git fetch origin main
run git reset --hard origin/main

log_info "Refrescar ${ENV_FILE} desde Doppler"
run doppler secrets download \
  --project "${DOPPLER_PROJECT}" \
  --config "${DOPPLER_CONFIG}" \
  --no-file \
  --format env >"${ENV_FILE}.tmp"
run mv "${ENV_FILE}.tmp" "${ENV_FILE}"
run chmod 600 "${ENV_FILE}"

log_info "[e] Imagen app: pull (registry) y build si el compose define build"
if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "DRY-RUN: omitiendo pull/build"
else
  run docker compose -f "${COMPOSE_FILE}" pull app || log_warn "pull app falló (¿imagen local o registry privado?)"
  run docker compose -f "${COMPOSE_FILE}" build app || log_info "sin build para app en compose o build omitido"
fi

log_info "[f] Recrear app (sin tocar dependencias declaradas en compose)"
run docker compose -f "${COMPOSE_FILE}" up -d --no-deps --remove-orphans app

log_info "[g] Esperando 15s"
if [[ "${DRY_RUN}" != "true" ]]; then
  sleep 15
fi

log_info "[h] Health check"
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a
require_env PLATFORM_DOMAIN

health_ok=0
if run curl -sf "https://api.${PLATFORM_DOMAIN}/api/health" >/dev/null; then
  health_ok=1
elif run curl -sf "http://127.0.0.1:3000/api/health" >/dev/null; then
  health_ok=1
  log_warn "Health OK solo vía localhost:3000 (revisa DNS/TLS/Traefik)"
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  health_ok=1
fi

if [[ "${health_ok}" -ne 1 ]]; then
  log_error "Health check falló"
  run docker compose -f "${COMPOSE_FILE}" logs --tail=120 app || true
  die "Deploy abortado tras health fallido" 1
fi

log_info "[i] Deploy completado"
rev="$(git -C "${OPS_ROOT}" rev-parse --short HEAD 2>/dev/null || echo "?")"
ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "  commit: ${rev}"
echo "  time:   ${ts}"
echo ""
log_info "Siguiente deploy:"
echo "  git push origin main   # o en el VPS: cd ${OPS_ROOT} && ./scripts/vps-deploy.sh"
