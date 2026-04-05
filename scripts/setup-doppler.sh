#!/usr/bin/env bash
# Configura el proyecto Doppler (por defecto ops-intcloudsysops; configs prd/stg), secrets base
# y opcionalmente instala el CLI en el VPS y deja /etc/doppler.env + snippet en .bashrc.
#
# Requisitos: Doppler CLI instalado y autenticado en esta máquina (`doppler login`).
# No imprime valores de secretos en consola.
#
# Uso típico (solo Doppler en la nube):
#   ./scripts/setup-doppler.sh
#
# Incluir aprovisionamiento remoto del VPS (una vez; crea un nuevo service token):
#   PROVISION_VPS=1 VPS_HOST=157.245.223.7 VPS_USER=vps-dragon ./scripts/setup-doppler.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

DOPPLER_PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG_PRD="${DOPPLER_CONFIG_PRD:-prd}"
CONFIG_STG="${DOPPLER_CONFIG_STG:-stg}"

require_cmd doppler openssl

if ! doppler me >/dev/null 2>&1; then
  die "Doppler CLI no autenticado. Ejecuta: doppler login  (https://docs.doppler.com/docs/install-cli)" 1
fi

log_info "[1] Proyecto y configs"
run doppler projects create "${DOPPLER_PROJECT}" 2>/dev/null || true
run doppler configs create "${CONFIG_PRD}" --project "${DOPPLER_PROJECT}" 2>/dev/null || true
run doppler configs create "${CONFIG_STG}" --project "${DOPPLER_PROJECT}" 2>/dev/null || true

get_plain() {
  local key="$1"
  doppler secrets get "${key}" --project "${DOPPLER_PROJECT}" --config "${CONFIG_PRD}" --plain 2>/dev/null || true
}

# set_secret KEY VALUE — value must not be logged
set_secret() {
  local k="$1"
  local v="$2"
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: doppler secrets set ${k}=*** --project ${DOPPLER_PROJECT} --config ${CONFIG_PRD}"
    return 0
  fi
  # No redirigir stderr para no ocultar errores de la API; el valor no se repite en stdout típico.
  doppler secrets set "${k}=${v}" --project "${DOPPLER_PROJECT}" --config "${CONFIG_PRD}" >/dev/null
}

is_unset_or_empty() {
  local cur="$1"
  [[ -z "${cur}" ]]
}

log_info "[2] Secrets aleatorios (solo si aún no existen en ${CONFIG_PRD})"
AUTO_OK=()
if is_unset_or_empty "$(get_plain PLATFORM_ADMIN_TOKEN)"; then
  _pat="$(openssl rand -hex 32)"
  set_secret "PLATFORM_ADMIN_TOKEN" "${_pat}"
  set_secret "NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN" "${_pat}"
  AUTO_OK+=("PLATFORM_ADMIN_TOKEN" "NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN")
  unset _pat
else
  log_info "PLATFORM_ADMIN_TOKEN ya definido; no se regenera"
fi

if is_unset_or_empty "$(get_plain REDIS_PASSWORD)"; then
  _rp="$(openssl rand -hex 16)"
  set_secret "REDIS_PASSWORD" "${_rp}"
  AUTO_OK+=("REDIS_PASSWORD")
  unset _rp
else
  log_info "REDIS_PASSWORD ya definido; no se regenera"
fi

if is_unset_or_empty "$(get_plain N8N_ENCRYPTION_KEY)"; then
  _n8="$(openssl rand -hex 32)"
  set_secret "N8N_ENCRYPTION_KEY" "${_n8}"
  AUTO_OK+=("N8N_ENCRYPTION_KEY")
  unset _n8
else
  log_info "N8N_ENCRYPTION_KEY ya definido; no se regenera"
fi

log_info "[3] Placeholders (solo si la clave no existe aún)"
declare -a PLACEHOLDER_KEYS=()
set_placeholder() {
  local k="$1"
  local v="$2"
  if is_unset_or_empty "$(get_plain "${k}")"; then
    set_secret "${k}" "${v}"
    PLACEHOLDER_KEYS+=("${k}")
  fi
}

set_placeholder "PLATFORM_DOMAIN" "REEMPLAZAR_CON_TU_DOMINIO"
set_placeholder "PLATFORM_BASE_DOMAIN" "REEMPLAZAR_CON_TU_DOMINIO"
set_placeholder "ACME_EMAIL" "REEMPLAZAR_CON_TU_EMAIL"
set_placeholder "NEXT_PUBLIC_SUPABASE_URL" "REEMPLAZAR"
set_placeholder "NEXT_PUBLIC_SUPABASE_ANON_KEY" "REEMPLAZAR"
set_placeholder "SUPABASE_URL" "REEMPLAZAR"
set_placeholder "SUPABASE_SERVICE_ROLE_KEY" "REEMPLAZAR"
set_placeholder "STRIPE_SECRET_KEY" "sk_test_REEMPLAZAR"
set_placeholder "STRIPE_WEBHOOK_SECRET" "whsec_REEMPLAZAR"
set_placeholder "STRIPE_PRICE_STARTUP" "price_REEMPLAZAR"
set_placeholder "STRIPE_PRICE_BUSINESS" "price_REEMPLAZAR"
set_placeholder "STRIPE_PRICE_ENTERPRISE" "price_REEMPLAZAR"
set_placeholder "RESEND_API_KEY" "REEMPLAZAR"
set_placeholder "NEXT_PUBLIC_API_URL" "https://api.REEMPLAZAR_CON_TU_DOMINIO"
set_placeholder "NEXT_PUBLIC_PLATFORM_DOMAIN" "REEMPLAZAR_CON_TU_DOMINIO"
set_placeholder "TRAEFIK_DASHBOARD_BASIC_AUTH_USERS" "REEMPLAZAR_htpasswd_escapa_en_compose"

log_info "[4] Infra fija (solo si la clave no existe)"
declare -a FIXED_KEYS=()
set_fixed() {
  local k="$1"
  local v="$2"
  if is_unset_or_empty "$(get_plain "${k}")"; then
    set_secret "${k}" "${v}"
    FIXED_KEYS+=("${k}")
  fi
}

set_fixed "PLATFORM_TENANTS_HOST_PATH" "/opt/opsly/tenants"
set_fixed "TENANTS_PATH" "/opt/opsly/tenants"
set_fixed "PLATFORM_TENANTS_DIR" "/opt/opsly/tenants"
set_fixed "TEMPLATE_PATH" "/opt/opsly/infra/templates/docker-compose.tenant.yml.tpl"
set_fixed "NODE_ENV" "production"
set_fixed "PORT" "3000"
set_fixed "TRAEFIK_NETWORK" "traefik-public"
set_fixed "OPSLY_VERSION" "0.1.0"

if is_unset_or_empty "$(get_plain DISCORD_WEBHOOK_URL)"; then
  set_secret "DISCORD_WEBHOOK_URL" "opcional_dejar_vacio_en_ui"
  PLACEHOLDER_KEYS+=("DISCORD_WEBHOOK_URL")
fi

echo ""
log_info "Resumen"
echo "  ✅ Generadas / actualizadas automáticamente (nombres): ${AUTO_OK[*]:-(ninguna en esta pasada)}"
echo "  ✅ Claves de infra fijadas ahora (si estaban vacías): ${FIXED_KEYS[*]:-(ninguna)}"
echo "  ⚠️  Revisar en la UI (placeholders o opcionales): ${PLACEHOLDER_KEYS[*]:-(ninguna nueva)}"
echo ""
echo "  Lista estática de variables que suelen necesitar valor real antes de producción:"
echo "    PLATFORM_DOMAIN, PLATFORM_BASE_DOMAIN, ACME_EMAIL"
echo "    NEXT_PUBLIC_*, SUPABASE_*, STRIPE_*, RESEND_API_KEY"
echo "    TRAEFIK_DASHBOARD_BASIC_AUTH_USERS (htpasswd; en Compose escapa \$)"
echo "    DISCORD_WEBHOOK_URL (opcional)"
echo "    APP_IMAGE, ADMIN_APP_IMAGE (si usas imágenes GHCR propias)"
echo ""
log_info "Verificar (no muestra valores por defecto en CLI sin --plain):"
echo "    doppler secrets --project ${DOPPLER_PROJECT} --config ${CONFIG_PRD}"
echo ""
log_info "UI Doppler:"
echo "    https://dashboard.doppler.com  → tu workplace → proyecto ${DOPPLER_PROJECT}"
echo ""

if [[ "${PROVISION_VPS:-0}" == "1" ]]; then
  require_cmd ssh
  VPS_HOST="${VPS_HOST:?PROVISION_VPS=1 requiere VPS_HOST}"
  VPS_USER="${VPS_USER:-vps-dragon}"
  SSH_TARGET="${VPS_USER}@${VPS_HOST}"

  log_info "[5] Instalar Doppler CLI en ${SSH_TARGET}"
  run ssh -o BatchMode=yes "${SSH_TARGET}" 'curl -Ls --max-time 120 https://cli.doppler.com/install.sh | sudo sh && doppler --version'

  log_info "[6] Service token → /etc/doppler.env (permisos 600, propietario ${VPS_USER})"
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: crear token y pipe a VPS omitidos"
  else
    _tmp="$(mktemp)"
    chmod 600 "${_tmp}"
    # Orden recomendado por la CLI: nombre del token, luego --project / --config
    doppler configs tokens create deploy \
      --project "${DOPPLER_PROJECT}" \
      --config "${CONFIG_PRD}" \
      --plain >"${_tmp}"
    {
      echo -n "DOPPLER_TOKEN="
      cat "${_tmp}"
    } | ssh -o BatchMode=yes "${SSH_TARGET}" "sudo tee /etc/doppler.env >/dev/null && sudo chmod 600 /etc/doppler.env && sudo chown ${VPS_USER}:${VPS_USER} /etc/doppler.env"
    shred -u "${_tmp}" 2>/dev/null || rm -f "${_tmp}"
  fi

  MARKER="# intcloudsysops-doppler-env (opsly)"
  log_info "[7] Snippet en ~/.bashrc de ${VPS_USER}"
  run ssh -o BatchMode=yes "${SSH_TARGET}" "bash -lc 'grep -qF \"${MARKER}\" ~/.bashrc 2>/dev/null || { echo \"\" >> ~/.bashrc; echo \"${MARKER}\" >> ~/.bashrc; echo \"set -a\" >> ~/.bashrc; echo \"[ -f /etc/doppler.env ] && . /etc/doppler.env\" >> ~/.bashrc; echo \"set +a\" >> ~/.bashrc; }'"
else
  log_info "VPS: omite (PROVISION_VPS distinto de 1). Para instalar CLI + token en el servidor:"
  echo "    PROVISION_VPS=1 VPS_HOST=157.245.223.7 VPS_USER=vps-dragon $0"
fi

echo ""
log_info "Siguiente paso (cuando DNS y secrets reales estén listos en Doppler):"
echo "    ssh vps-dragon@157.245.223.7 'cd /opt/opsly && ./scripts/vps-bootstrap.sh'"
