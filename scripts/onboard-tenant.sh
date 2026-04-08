#!/usr/bin/env bash
# Onboard a tenant: render compose, insert Supabase, start stack, wait healthy, activate.
#
# Required env:
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PLATFORM_DOMAIN, TENANTS_PATH, TEMPLATE_PATH
# Optional env:
#   DISCORD_WEBHOOK_URL, TRAEFIK_NETWORK (default: traefik-public), N8N_BASIC_AUTH_USER (default: admin)
#
# Exit codes: 0 ok, 1 general error, 2 missing dependency, 3 missing env

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"
# shellcheck source=scripts/lib/docker-helpers.sh
source "${_SCRIPT_DIR}/lib/docker-helpers.sh"

show_onboard_help() {
  cat <<'EOF'
Onboard de tenant: inserta fila en Supabase, genera compose y levanta n8n + Uptime Kuma.

Uso:
  ./scripts/onboard-tenant.sh --slug <slug> --email <owner@domain> --plan startup|business|enterprise [opciones]

Opciones:
  --dry-run               Muestra el plan y sale sin Supabase, Docker ni secretos generados.
  --name "Nombre"         Nombre mostrado del tenant en Supabase (default: mismo que --slug).
  --stripe-customer-id X Opcional (Stripe customer id).
  --yes                   Confirmaciones no interactivas (si el script las usa).
  -h, --help              Esta ayuda.

Ejemplos:
  ./scripts/onboard-tenant.sh --slug demo --email owner@example.com --plan startup --dry-run
  export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... PLATFORM_DOMAIN=... TENANTS_PATH=... TEMPLATE_PATH=...
  ./scripts/onboard-tenant.sh --slug demo --email owner@example.com --plan startup

Variables obligatorias (solo si NO usas --dry-run):
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PLATFORM_DOMAIN, TENANTS_PATH, TEMPLATE_PATH

EOF
}

SLUG=""
EMAIL=""
PLAN=""
STRIPE_ID=""
TENANT_DISPLAY_NAME=""
export DRY_RUN="${DRY_RUN:-false}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)
      SLUG="${2:-}"
      shift 2
      ;;
    --email)
      EMAIL="${2:-}"
      shift 2
      ;;
    --plan)
      PLAN="${2:-}"
      shift 2
      ;;
    --name)
      TENANT_DISPLAY_NAME="${2:-}"
      shift 2
      ;;
    --stripe-customer-id)
      STRIPE_ID="${2:-}"
      shift 2
      ;;
    --dry-run)
      export DRY_RUN=true
      shift
      ;;
    --yes)
      export ASSUME_YES=true
      shift
      ;;
    -h | --help)
      show_onboard_help
      exit 0
      ;;
    *)
      die "Unknown argument: $1 (use --help)" 1
      ;;
  esac
done

if [[ -z "${SLUG}" || -z "${EMAIL}" || -z "${PLAN}" ]]; then
  die "Required: --slug, --email, --plan (startup|business|enterprise). Use --help." 1
fi

if [[ ! "${SLUG}" =~ ^[a-z0-9-]{3,30}$ ]]; then
  die "Invalid slug: use 3-30 chars [a-z0-9-]" 1
fi

case "${PLAN}" in
  startup | business | enterprise) ;;
  *) die "Invalid plan: ${PLAN} (expected startup|business|enterprise)" 1 ;;
esac

if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "========== DRY-RUN — resumen =========="
  log_info "Slug:           ${SLUG}"
  log_info "Nombre:         ${TENANT_DISPLAY_NAME:-$SLUG}"
  log_info "Owner email:    ${EMAIL}"
  log_info "Plan:           ${PLAN}"
  if [[ -n "${STRIPE_ID}" ]]; then
    log_info "Stripe customer id: (set)"
  fi
  log_info "Traefik network default: ${TRAEFIK_NETWORK:-traefik-public}"
  log_info ""
  log_info "Pasos que ejecutaría el script en modo real:"
  log_info "  1. Validar dependencias (curl, jq, openssl, sed, docker)"
  log_info "  2. Comprobar que el slug no exista ya en Supabase (GET tenants)"
  log_info "  3. Asignar puertos host para n8n y Uptime según plan y ${TENANTS_PATH:-\$TENANTS_PATH}/docker-compose.*.yml"
  log_info "  4. Generar N8N_BASIC_AUTH_PASSWORD y N8N_ENCRYPTION_KEY (openssl)"
  log_info "  5. Renderizar plantilla → \${TENANTS_PATH}/docker-compose.${SLUG}.yml"
  log_info "  6. POST tenant (status=provisioning) en schema platform"
  log_info "  7. docker compose --project-name tenant_${SLUG} -f … up -d (aislado por slug; no toca otros tenants)"
  log_info "  8. PATCH tenant active + JSON services (URLs n8n/uptime)"
  log_info "  9. Webhook Discord (si DISCORD_WEBHOOK_URL)"
  log_info "========================================="
  log_info "No se ha modificado Supabase ni disco. Ejecuta sin --dry-run cuando el entorno esté listo."
  exit 0
fi

TENANT_NAME_RESOLVED="${TENANT_DISPLAY_NAME:-$SLUG}"
if [[ -z "${TENANT_NAME_RESOLVED// /}" ]]; then
  TENANT_NAME_RESOLVED="${SLUG}"
fi

require_env SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY PLATFORM_DOMAIN TENANTS_PATH TEMPLATE_PATH
require_cmd curl jq openssl sed

TRAEFIK_NETWORK="${TRAEFIK_NETWORK:-traefik-public}"
N8N_BASIC_AUTH_USER="${N8N_BASIC_AUTH_USER:-admin}"

export TENANTS_PATH

plan_port_base() {
  case "$1" in
    startup) echo 8000 ;;
    business) echo 9000 ;;
    enterprise) echo 10000 ;;
  esac
}

used_ports_in_tenants() {
  local dir="${TENANTS_PATH}"
  local f
  shopt -s nullglob
  for f in "${dir}"/docker-compose.*.yml; do
    [[ -f "${f}" ]] || continue
    grep -h -oE '[0-9]{2,5}:5678' "${f}" 2>/dev/null | cut -d: -f1 || true
    grep -h -oE '[0-9]{2,5}:3001' "${f}" 2>/dev/null | cut -d: -f1 || true
  done
  shopt -u nullglob
}

allocate_two_ports() {
  local base
  base="$(plan_port_base "${PLAN}")"
  local -a used
  mapfile -t used < <(used_ports_in_tenants | sort -n | uniq)

  is_used() {
    local p="$1"
    local u
    for u in "${used[@]}"; do
      [[ "${u}" == "${p}" ]] && return 0
    done
    return 1
  }

  local p="${base}"
  while ((p < 65500)); do
    if ! is_used "${p}" && ! is_used "$((p + 1))"; then
      echo "${p} $((p + 1))"
      return 0
    fi
    p=$((p + 2))
  done
  die "No free port pair from base ${base}" 1
}

notify_discord() {
  local text="$1"
  [[ -z "${DISCORD_WEBHOOK_URL:-}" ]] && return 0
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: Discord notify (skipped)"
    return 0
  fi
  curl -sS -X POST "${DISCORD_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg c "${text}" '{content: $c}')" >/dev/null
}

tenant_exists_json() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[]"
    return 0
  fi
  curl -sS -G "${SUPABASE_URL}/rest/v1/tenants" \
    --data-urlencode "slug=eq.${SLUG}" \
    --data-urlencode "select=id,slug,status" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Accept-Profile: platform"
}

require_cmd docker

EXISTING_JSON="$(tenant_exists_json)"
if ! echo "${EXISTING_JSON}" | jq -e . >/dev/null 2>&1; then
  die "Failed to query Supabase: ${EXISTING_JSON}" 1
fi

if echo "${EXISTING_JSON}" | jq -e 'length > 0' >/dev/null 2>&1; then
  CUR_STATUS="$(echo "${EXISTING_JSON}" | jq -r '.[0].status')"
  if [[ "${CUR_STATUS}" == "active" ]] && stack_exists "${SLUG}"; then
    log_info "Tenant ${SLUG} already active with compose file; idempotent exit."
    exit 0
  fi
  die "Tenant slug already exists in Supabase (status=${CUR_STATUS})" 1
fi

[[ -f "${TEMPLATE_PATH}" ]] || die "TEMPLATE_PATH not a file: ${TEMPLATE_PATH}" 1
mkdir -p "${TENANTS_PATH}"

read -r PORT_N8N PORT_UPTIME < <(allocate_two_ports)
log_info "Allocated ports n8n=${PORT_N8N} uptime=${PORT_UPTIME}"

# hex-only secrets keep sed template substitution safe (no +/= from base64)
N8N_BASIC_AUTH_PASSWORD="$(openssl rand -hex 24)"
N8N_ENCRYPTION_KEY="$(openssl rand -hex 32)"

OUT_FILE="${TENANTS_PATH}/docker-compose.${SLUG}.yml"
sed \
  -e "s|{{SLUG}}|${SLUG}|g" \
  -e "s|{{PORT_N8N}}|${PORT_N8N}|g" \
  -e "s|{{PORT_UPTIME}}|${PORT_UPTIME}|g" \
  -e "s|{{N8N_BASIC_AUTH_USER}}|${N8N_BASIC_AUTH_USER}|g" \
  -e "s|{{N8N_BASIC_AUTH_PASSWORD}}|${N8N_BASIC_AUTH_PASSWORD}|g" \
  -e "s|{{N8N_ENCRYPTION_KEY}}|${N8N_ENCRYPTION_KEY}|g" \
  -e "s|{{DOMAIN}}|${PLATFORM_DOMAIN}|g" \
  -e "s|{{TRAEFIK_NETWORK}}|${TRAEFIK_NETWORK}|g" \
  "${TEMPLATE_PATH}" >"${OUT_FILE}"
log_info "Wrote ${OUT_FILE}"

INSERT_BODY="$(
  jq -n \
    --arg slug "${SLUG}" \
    --arg name "${TENANT_NAME_RESOLVED}" \
    --arg email "${EMAIL}" \
    --arg plan "${PLAN}" \
    --arg stripe_id "${STRIPE_ID}" \
    '{
      slug: $slug,
      name: $name,
      owner_email: $email,
      plan: $plan,
      status: "provisioning",
      progress: 0,
      stripe_customer_id: (if ($stripe_id | length) > 0 then $stripe_id else null end)
    }'
)"

INSERT_RESP="$(
  curl -sS -X POST "${SUPABASE_URL}/rest/v1/tenants" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Accept-Profile: platform" \
    -H "Content-Profile: platform" \
    -d "${INSERT_BODY}"
)"

if ! echo "${INSERT_RESP}" | jq -e '.[0].id' >/dev/null 2>&1; then
  log_error "Supabase insert failed: ${INSERT_RESP}"
  rm -f "${OUT_FILE}"
  exit 1
fi

TENANT_ID="$(echo "${INSERT_RESP}" | jq -r '.[0].id')"
log_info "Created tenant row id=${TENANT_ID}"

compose_up "${SLUG}" || {
  log_error "compose_up failed"
  exit 1
}

if ! wait_healthy "${SLUG}" 60; then
  log_error "Health wait failed for ${SLUG}"
  exit 1
fi

SERVICES_JSON="$(
  jq -n \
    --arg slug "${SLUG}" \
    --arg domain "${PLATFORM_DOMAIN}" \
    '{
      n8n: ("https://n8n-\($slug).\($domain)/"),
      uptime_kuma: ("https://uptime-\($slug).\($domain)/")
    }'
)"

PATCH_BODY="$(
  jq -n \
    --argjson services "${SERVICES_JSON}" \
    '{ status: "active", progress: 100, services: $services }'
)"

PATCH_RESP="$(
  curl -sS -X PATCH "${SUPABASE_URL}/rest/v1/tenants?id=eq.${TENANT_ID}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Accept-Profile: platform" \
    -H "Content-Profile: platform" \
    -d "${PATCH_BODY}"
)"

if [[ -n "${PATCH_RESP}" ]] && echo "${PATCH_RESP}" | jq -e . >/dev/null 2>&1; then
  if echo "${PATCH_RESP}" | jq -e '.code' >/dev/null 2>&1; then
    log_error "Supabase PATCH failed: ${PATCH_RESP}"
    exit 1
  fi
fi

SUMMARY="Onboarded tenant **${SLUG}** (${PLAN}) — n8n https://n8n-${SLUG}.${PLATFORM_DOMAIN}/ — uptime https://uptime-${SLUG}.${PLATFORM_DOMAIN}/"
notify_discord "${SUMMARY}"

log_info "========== Onboard complete =========="
log_info "Slug:     ${SLUG}"
log_info "Email:    ${EMAIL}"
log_info "n8n URL:  https://n8n-${SLUG}.${PLATFORM_DOMAIN}/"
log_info "Uptime:   https://uptime-${SLUG}.${PLATFORM_DOMAIN}/"
log_info "n8n user: ${N8N_BASIC_AUTH_USER}"
log_info "n8n pass: ${N8N_BASIC_AUTH_PASSWORD}"
log_info "Compose:  ${OUT_FILE}"
log_info "========================================"
