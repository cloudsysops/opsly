#!/usr/bin/env bash
# Start a tenant stack from an existing compose file.
# Idempotent: if stack is already healthy/running, exits 0.

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/../lib/common.sh"
# shellcheck source=scripts/lib/docker-helpers.sh
source "${_SCRIPT_DIR}/../lib/docker-helpers.sh"

show_help() {
  cat <<'EOF'
Inicia stack Docker Compose de un tenant existente.

Uso:
  ./scripts/start-tenant.sh --slug <slug> [--wait] [--wait-seconds <n>] [--dry-run]

Opciones:
  --slug <slug>         Slug del tenant (requerido).
  --wait                Espera salud de servicios tras "up".
  --wait-seconds <n>    Timeout para --wait (default: 60).
  --dry-run             No ejecuta comandos; solo imprime.
  -h, --help            Muestra esta ayuda.

Variables:
  TENANTS_PATH          Carpeta de compose por tenant (default: <repo>/tenants).

EOF
}

SLUG=""
WAIT_HEALTH=false
WAIT_SECONDS=60
export DRY_RUN="${DRY_RUN:-false}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)
      SLUG="${2:-}"
      shift 2
      ;;
    --wait)
      WAIT_HEALTH=true
      shift
      ;;
    --wait-seconds)
      WAIT_SECONDS="${2:-}"
      shift 2
      ;;
    --dry-run)
      export DRY_RUN=true
      shift
      ;;
    -h | --help)
      show_help
      exit 0
      ;;
    *)
      die "Unknown argument: $1 (use --help)" 1
      ;;
  esac
done

if [[ -z "${SLUG}" ]]; then
  die "Missing required --slug" 1
fi

if [[ ! "${SLUG}" =~ ^[a-z0-9-]{3,30}$ ]]; then
  die "Invalid slug: use 3-30 chars [a-z0-9-]" 1
fi

if [[ ! "${WAIT_SECONDS}" =~ ^[0-9]+$ ]]; then
  die "--wait-seconds must be a positive integer" 1
fi

if [[ -z "${TENANTS_PATH:-}" ]]; then
  TENANTS_PATH="$(cd "${_SCRIPT_DIR}/.." && pwd)/tenants"
fi
export TENANTS_PATH

require_cmd docker

if ! stack_exists "${SLUG}"; then
  die "Compose file not found for slug=${SLUG} in TENANTS_PATH=${TENANTS_PATH}" 1
fi

if stack_running "${SLUG}"; then
  log_info "Tenant ${SLUG} already running/healthy. Idempotent exit."
  exit 0
fi

compose_up "${SLUG}"

if [[ "${WAIT_HEALTH}" == "true" ]]; then
  wait_healthy "${SLUG}" "${WAIT_SECONDS}"
fi

log_info "Tenant ${SLUG} started."
