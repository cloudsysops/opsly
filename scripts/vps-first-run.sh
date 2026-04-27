#!/usr/bin/env bash
# Primer arranque completo: Traefik, Redis, app, admin.
# Requiere: ./scripts/vps-bootstrap.sh ya ejecutado.
#
set -euo pipefail

OPS_ROOT="${OPS_ROOT:-/opt/opsly}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_cmd docker curl

# Comprobar que el daemon Docker responde (socket y permisos del usuario actual).
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker no accesible. Verificar permisos (grupo docker o root)." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  die "docker compose no disponible" 2
fi

ENV_FILE="${OPS_ROOT}/.env"
COMPOSE_FILE="infra/docker-compose.platform.yml"

[[ -f "${ENV_FILE}" ]] || die "No existe ${ENV_FILE}; ejecuta primero scripts/vps-bootstrap.sh" 1

log_info "[a] Cargar ${ENV_FILE}"
# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a
require_env PLATFORM_DOMAIN

log_info "[b] acme.json en host (permisos)"
run mkdir -p "${OPS_ROOT}/runtime/letsencrypt"
if [[ ! -f "${OPS_ROOT}/runtime/letsencrypt/acme.json" ]]; then
  run touch "${OPS_ROOT}/runtime/letsencrypt/acme.json"
fi
run chmod 600 "${OPS_ROOT}/runtime/letsencrypt/acme.json"

log_info "[c] Levantar stack completo (traefik, redis, app, admin)"
run cd "${OPS_ROOT}"
run docker compose -f "${COMPOSE_FILE}" up -d

log_info "[d] Esperando 30s (certificados / arranque)"
if [[ "${DRY_RUN}" != "true" ]]; then
  sleep 30
fi

log_info "[e] Health check API"
health_ok=0
if run curl -sf "https://api.${PLATFORM_DOMAIN}/api/health" >/dev/null; then
  health_ok=1
elif run curl -sf "http://127.0.0.1:3000/api/health" >/dev/null; then
  health_ok=1
  log_warn "Health OK solo vía localhost (revisa DNS/TLS)"
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  health_ok=1
fi

if [[ "${health_ok}" -ne 1 ]]; then
  log_error "Health check falló"
  run docker compose -f "${COMPOSE_FILE}" logs --tail=120 traefik app || true
  die "first-run abortado" 1
fi

log_info "[f] Migraciones Supabase"
DB_URL="${DB_CONNECTION_STRING:-${DATABASE_URL:-}}"
if [[ -z "${DB_URL}" ]]; then
  log_warn "Sin DB_CONNECTION_STRING ni DATABASE_URL en .env; omite db push automático."
  log_warn "Manual: desde tu máquina con CLI — supabase db push --db-url 'postgresql://…'"
elif command -v supabase >/dev/null 2>&1; then
  run cd "${OPS_ROOT}"
  run supabase db push --db-url "${DB_URL}" || log_warn "supabase db push falló; revisa migraciones y URL"
elif command -v npx >/dev/null 2>&1; then
  run cd "${OPS_ROOT}"
  run npx --yes supabase db push --db-url "${DB_URL}" || log_warn "npx supabase db push falló; revisa logs"
else
  log_warn "No hay supabase CLI ni npx; instala Node o supabase, o aplica migraciones desde local:"
  echo "  cd repo && supabase db push --db-url \"\$DB_CONNECTION_STRING\""
fi

log_info "[g] URLs (sustituye por tu PLATFORM_DOMAIN actual: ${PLATFORM_DOMAIN})"
echo "  API health:    https://api.${PLATFORM_DOMAIN}/api/health"
echo "  Opsly Admin:   https://admin.${PLATFORM_DOMAIN}"
echo "  Traefik UI:    https://traefik.${PLATFORM_DOMAIN}  (BasicAuth; no confundir con Admin)"
echo ""
log_info "Siguientes deploys (solo app, más rápido):"
echo "  cd ${OPS_ROOT} && ./scripts/vps-deploy.sh"
echo "  # o: git push origin main (si CI/SSH llama vps-deploy.sh)"
