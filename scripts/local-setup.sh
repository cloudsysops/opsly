#!/usr/bin/env bash
# =============================================================================
# QUICK START:
#   Mac 2011: ./scripts/local-setup.sh
#   Mac 2011: ./scripts/tunnel-access.sh --mode server
#   Mac 2020: sudo ./scripts/tunnel-access.sh --mode client --mac2011-ip X.X.X.X
#
# URLs disponibles tras el setup:
#   http://admin.opsly.local           → Dashboard admin
#   http://api.opsly.local/api/health  → Health check
#   http://traefik.opsly.local:8080 o http://localhost:8080 → Traefik dashboard (API insecure)
#   http://localhost:54321           → Supabase Studio (solo Mac 2011)
#   http://localhost:8000            → n8n del primer tenant (tras onboard)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

cd "${REPO_ROOT}"

log_info "Activando git hooks (core.hooksPath=.githooks)…"
if git -C "${REPO_ROOT}" config core.hooksPath .githooks; then
  log_info "✅ Git hooks activados"
else
  log_warn "No se pudo configurar core.hooksPath (¿no es un repo git?)."
fi

require_cmd docker npm node

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  log_error "Necesitas Docker Compose: plugin 'docker compose' o binario docker-compose."
  exit 2
fi

if command -v colima >/dev/null 2>&1; then
  if ! colima status 2>/dev/null | grep -qi 'running'; then
    log_info "Iniciando Colima (cpu=4, memory=8)…"
    colima start --cpu 4 --memory 8
  else
    log_info "Colima ya está en ejecución."
  fi
else
  log_warn "colima no está en PATH; se asume Docker funcionando (Docker Desktop / otro)."
fi

if ! command -v supabase >/dev/null 2>&1; then
  log_error "supabase CLI no encontrado. Instálalo: https://supabase.com/docs/guides/cli"
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  log_error "jq no encontrado (brew install jq). Se usa para leer supabase status --output json."
  exit 2
fi

run mkdir -p /tmp/opsly/tenants

if docker network inspect traefik-local >/dev/null 2>&1; then
  log_info "Red Docker traefik-local ya existe."
else
  log_info "Creando red Docker traefik-local…"
  docker network create traefik-local
fi

if [[ ! -f "${REPO_ROOT}/.env.local" ]]; then
  if [[ -f "${REPO_ROOT}/.env.local.example" ]]; then
    log_info "Creando .env.local desde .env.local.example"
    cp "${REPO_ROOT}/.env.local.example" "${REPO_ROOT}/.env.local"
  else
    log_error "Falta .env.local.example en la raíz del repo."
    exit 1
  fi
else
  log_info ".env.local ya existe; no se sobrescribe."
fi

log_info "npm ci (raíz del monorepo)…"
run npm ci

log_info "supabase start (idempotente)…"
run supabase start

ANON_KEY=""
SERVICE_ROLE_KEY=""
SB_JSON="$(cd "${REPO_ROOT}" && supabase status --output json 2>/dev/null || true)"
if [[ -n "${SB_JSON}" ]] && command -v jq >/dev/null 2>&1; then
  ANON_KEY="$(echo "${SB_JSON}" | jq -r '.anon_key // .ANON_KEY // .API.anon_key // empty')"
  SERVICE_ROLE_KEY="$(echo "${SB_JSON}" | jq -r '.service_role_key // .SERVICE_ROLE_KEY // .API.service_role_key // empty')"
fi

_env_set_key() {
  local file="$1" key="$2" val="$3"
  python3 -c "
import pathlib, sys
path, key, val = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
text = path.read_text()
out = []
found = False
prefix = key + '='
for line in text.splitlines(keepends=True):
    if line.startswith(prefix):
        out.append(key + '=' + val + '\n')
        found = True
    else:
        out.append(line)
if not found:
    out.append(key + '=' + val + '\n')
path.write_text(''.join(out))
" "${file}" "${key}" "${val}"
}

if [[ -z "${ANON_KEY}" || -z "${SERVICE_ROLE_KEY}" ]]; then
  log_warn "No se pudieron leer claves (supabase status + jq). Edita .env.local a mano."
else
  log_info "Actualizando claves Supabase en .env.local"
  _env_set_key "${REPO_ROOT}/.env.local" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "${ANON_KEY}"
  _env_set_key "${REPO_ROOT}/.env.local" "SUPABASE_SERVICE_ROLE_KEY" "${SERVICE_ROLE_KEY}"
fi

LAN_IP=""
for _iface in en0 en1 en2; do
  if command -v ipconfig >/dev/null 2>&1; then
    LAN_IP="$(ipconfig getifaddr "${_iface}" 2>/dev/null || true)"
    [[ -n "${LAN_IP}" ]] && break
  fi
done
LAN_IP="${LAN_IP:-127.0.0.1}"

if [[ "${LAN_IP}" != "127.0.0.1" ]] && [[ -n "${LAN_IP}" ]]; then
  log_info "NEXT_PUBLIC_SUPABASE_URL → http://${LAN_IP}:54321 (navegadores en la LAN / Mac 2020)"
  _env_set_key "${REPO_ROOT}/.env.local" "NEXT_PUBLIC_SUPABASE_URL" "http://${LAN_IP}:54321"
else
  log_info "NEXT_PUBLIC_SUPABASE_URL → http://127.0.0.1:54321 (solo esta máquina)"
  _env_set_key "${REPO_ROOT}/.env.local" "NEXT_PUBLIC_SUPABASE_URL" "http://127.0.0.1:54321"
fi

log_info "supabase db push…"
run supabase db push

log_info "docker compose build (local)…"
run "${COMPOSE[@]}" -f infra/docker-compose.local.yml build

log_info "docker compose up -d…"
run "${COMPOSE[@]}" -f infra/docker-compose.local.yml up -d

log_info "Esperando 15s…"
sleep 15

if curl -sf "http://api.opsly.local/api/health" >/dev/null; then
  log_info "Health OK: http://api.opsly.local/api/health"
else
  log_warn "curl a api.opsly.local falló. Añade a /etc/hosts en esta Mac:"
  log_warn "  127.0.0.1 api.opsly.local admin.opsly.local traefik.opsly.local"
fi

log_info "=== Resumen ==="
log_info "Admin:     http://admin.opsly.local"
log_info "API:       http://api.opsly.local/api/health"
log_info "Traefik:   http://localhost:8080 o http://traefik.opsly.local:8080"
log_info "Supabase:  http://127.0.0.1:54321 (Studio; desde Mac 2020 usa http://${LAN_IP}:54321)"
log_info "Tenants:   ${TENANTS_PATH:-/tmp/opsly/tenants}"
