#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "${ROOT_DIR}/scripts/lib/common.sh" ]]; then
  # shellcheck source=scripts/lib/common.sh
  source "${ROOT_DIR}/scripts/lib/common.sh"
else
  log_info() { echo "[INFO] $*"; }
  log_warn() { echo "[WARN] $*" >&2; }
  log_error() { echo "[ERROR] $*" >&2; }
fi

require_cmd docker

if ! docker info >/dev/null 2>&1; then
  log_error "Docker no esta disponible"
  exit 1
fi

if command -v redis-cli >/dev/null 2>&1; then
  if ! redis-cli -h 127.0.0.1 -p 6379 ping 2>/dev/null | grep -q "^PONG$"; then
    log_warn "Redis local no responde; intentando levantar servicio redis"
    docker compose -f "${ROOT_DIR}/infra/docker-compose.platform.yml" up -d redis
    sleep 5
  fi
else
  log_warn "redis-cli no instalado; se omite ping directo"
fi

if [[ -n "${SUPABASE_URL:-}" ]] && [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  if ! curl -fsS \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    "${SUPABASE_URL%/}/rest/v1/" >/dev/null; then
    log_warn "Supabase no responde al health check; el arranque sigue en modo degradado"
  fi
else
  log_warn "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY no definidos; check omitido"
fi

log_info "Chequeos de pre-arranque completados"
