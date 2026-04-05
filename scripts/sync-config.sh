#!/usr/bin/env bash
# Lee config/opsly.config.json y sincroniza valores públicos a Doppler, .env.local.example,
# .github/workflows/deploy.yml y README (bloque URLS_*).
#
# Requiere: jq, doppler autenticado (para el paso Doppler).
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

CONFIG="${REPO_ROOT}/config/opsly.config.json"

require_cmd jq

[[ -f "${CONFIG}" ]] || die "No existe ${CONFIG}" 1

jq empty "${CONFIG}" >/dev/null || die "JSON inválido: ${CONFIG}" 1

read_config() {
  jq -r "$1" "${CONFIG}"
}

DOPPLER_PROJECT="$(read_config '.project.doppler_project')"
DOPPLER_CFG="$(read_config '.project.doppler_config')"
VPS_PATH="$(read_config '.infrastructure.vps_path')"
TRAEFIK_NET="$(read_config '.infrastructure.traefik_network')"
BASE_DOM="$(read_config '.domains.base')"
API_DOM="$(read_config '.domains.api')"
GITHUB_ORG="$(read_config '.project.github_org')"
GITHUB_REPO="$(read_config '.project.github_repo')"
S3_PREFIX="$(read_config '.backups.s3_prefix')"
TENANTS_HOST="${VPS_PATH}/tenants"
TEMPLATE_PATH="${VPS_PATH}/infra/templates/docker-compose.tenant.yml.tpl"
NEXT_PUBLIC_API="https://${API_DOM}"
GIT_REMOTE="git@github.com:${GITHUB_ORG}/${GITHUB_REPO}.git"
HEALTH_URL="https://${API_DOM}/api/health"

log_info "Sincronizando desde ${CONFIG}"

log_info "[1] Doppler (${DOPPLER_PROJECT} / ${DOPPLER_CFG})"
if ! doppler me >/dev/null 2>&1; then
  log_warn "Doppler no autenticado; omite doppler secrets set. Ejecuta: doppler login"
else
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: doppler secrets set (varias claves públicas)"
  else
    # Salida tabular de Doppler puede ir a stdout; no volcar valores en logs compartidos.
    doppler secrets set \
      "PLATFORM_DOMAIN=${BASE_DOM}" \
      "PLATFORM_BASE_DOMAIN=${BASE_DOM}" \
      "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API}" \
      "NEXT_PUBLIC_PLATFORM_DOMAIN=${BASE_DOM}" \
      "TRAEFIK_NETWORK=${TRAEFIK_NET}" \
      "PLATFORM_TENANTS_HOST_PATH=${TENANTS_HOST}" \
      "TENANTS_PATH=${TENANTS_HOST}" \
      "PLATFORM_TENANTS_DIR=${TENANTS_HOST}" \
      "TEMPLATE_PATH=${TEMPLATE_PATH}" \
      "S3_PREFIX=${S3_PREFIX}" \
      --project "${DOPPLER_PROJECT}" \
      --config "${DOPPLER_CFG}" >/dev/null
  fi
  log_info "Doppler: claves públicas de infra/dominio actualizadas (sin secretos)."
fi

log_info "[2] .env.local.example"
OUT="${REPO_ROOT}/.env.local.example"
if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "DRY-RUN: regeneraría ${OUT}"
else
  cat >"${OUT}" <<EOF
# Generado por scripts/sync-config.sh desde config/opsly.config.json
# Copia: cp .env.local.example .env.local y completa REEMPLAZAR / secretos.

# ── Dominios (público, desde opsly.config.json) ──
PLATFORM_DOMAIN=${BASE_DOM}
PLATFORM_BASE_DOMAIN=${BASE_DOM}
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API}
NEXT_PUBLIC_PLATFORM_DOMAIN=${BASE_DOM}
NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_API}

# ── Supabase (secretos) ──
NEXT_PUBLIC_SUPABASE_URL=REEMPLAZAR
NEXT_PUBLIC_SUPABASE_ANON_KEY=REEMPLAZAR
SUPABASE_SERVICE_ROLE_KEY=REEMPLAZAR
SUPABASE_URL=REEMPLAZAR

# ── Plataforma ──
OPSLY_VERSION=0.1.0
PLATFORM_ADMIN_TOKEN=REEMPLAZAR
NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN=REEMPLAZAR
APP_IMAGE=ghcr.io/${GITHUB_ORG}/intcloudsysops-api:latest
ADMIN_APP_IMAGE=ghcr.io/${GITHUB_ORG}/intcloudsysops-admin:latest

# ── Stripe ──
STRIPE_SECRET_KEY=REEMPLAZAR
STRIPE_WEBHOOK_SECRET=REEMPLAZAR
STRIPE_PRICE_STARTUP=REEMPLAZAR
STRIPE_PRICE_BUSINESS=REEMPLAZAR
STRIPE_PRICE_ENTERPRISE=REEMPLAZAR
STRIPE_PRICE_ID_STARTUP=REEMPLAZAR
STRIPE_PRICE_ID_BUSINESS=REEMPLAZAR
STRIPE_PRICE_ID_ENTERPRISE=REEMPLAZAR
STRIPE_PRICE_ID_DEMO=REEMPLAZAR

# ── Redis ──
REDIS_PASSWORD=REEMPLAZAR
REDIS_URL=redis://:REEMPLAZAR@redis:6379/0

# ── Docker / Tenants / Traefik ──
PLATFORM_TENANTS_HOST_PATH=${TENANTS_HOST}
PLATFORM_TENANTS_DIR=/opt/opsly/tenants
TENANTS_PATH=${TENANTS_HOST}
TEMPLATE_PATH=${TEMPLATE_PATH}
TRAEFIK_NETWORK=${TRAEFIK_NET}
N8N_BASIC_AUTH_USER=admin
ACME_EMAIL=REEMPLAZAR
TRAEFIK_DASHBOARD_BASIC_AUTH_USERS=REEMPLAZAR

# ── Doppler (opcional local) ──
DOPPLER_TOKEN=
DOPPLER_PROJECT=${DOPPLER_PROJECT}
DOPPLER_CONFIG=${DOPPLER_CFG}
DOPPLER_ENVIRONMENT=${DOPPLER_CFG}
DOPPLER_TEMPLATE_PROJECT=tenant-template

# ── Email / notificaciones ──
RESEND_API_KEY=REEMPLAZAR
RESEND_FROM_EMAIL=noreply@${BASE_DOM}
RESEND_FROM_ADDRESS=noreply@${BASE_DOM}
DISCORD_WEBHOOK_URL=
DISCORD_BOT_AVATAR_URL=

# ── Backups ──
DB_CONNECTION_STRING=REEMPLAZAR
S3_BUCKET=REEMPLAZAR
S3_PREFIX=${S3_PREFIX}
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=REEMPLAZAR
AWS_SECRET_ACCESS_KEY=REEMPLAZAR

NEXT_PUBLIC_APP_VERSION=0.1.0
NEXT_PUBLIC_DISCORD_WEBHOOK_URL=
NEXT_PUBLIC_STRIPE_WEBHOOK_CONFIGURED=false
EOF
fi

log_info "[3] .github/workflows/deploy.yml"
DEPLOY_YML="${REPO_ROOT}/.github/workflows/deploy.yml"
if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "DRY-RUN: actualizaría rutas y health en ${DEPLOY_YML}"
else
  sed -i.bak \
    -e "s#^            DEPLOY_PATH=.*#            DEPLOY_PATH=${VPS_PATH}#" \
    -e "s#^            REPO_URL=.*#            REPO_URL=${GIT_REMOTE}#" \
    -e "s#^            cd .*/infra\$#            cd ${VPS_PATH}/infra#" \
    -e "s#^            curl -sf \"https://[^\"]*\"#            curl -sf \"${HEALTH_URL}\"#" \
    "${DEPLOY_YML}"
  rm -f "${DEPLOY_YML}.bak"
fi

log_info "[4] README.md (<!-- URLS_START --> … <!-- URLS_END -->)"
README="${REPO_ROOT}/README.md"
WILDCARD="$(read_config '.domains.wildcard')"
ADMIN_DOM="$(read_config '.domains.admin')"
TR_DOM="$(read_config '.domains.traefik')"

URL_TABLE="### URLs de producción (\`config/opsly.config.json\`)

| Entorno | URL |
|---------|-----|
| Dominio base | \`https://${BASE_DOM}\` |
| API | \`https://${API_DOM}\` |
| Admin | \`https://${ADMIN_DOM}\` |
| Traefik dashboard | \`https://${TR_DOM}\` |
| Wildcard tenants | \`${WILDCARD}\` |"

if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "DRY-RUN: actualizaría bloque URL en README"
elif command -v python3 >/dev/null 2>&1; then
  export OPSLY_URL_TABLE="${URL_TABLE}"
  export OPSLY_README_PATH="${README}"
  python3 <<'PY'
import os
import re

path = os.environ["OPSLY_README_PATH"]
table = os.environ["OPSLY_URL_TABLE"]
with open(path, encoding="utf-8") as f:
    c = f.read()
block = "<!-- URLS_START -->\n" + table + "\n<!-- URLS_END -->"
if "<!-- URLS_START -->" in c and "<!-- URLS_END -->" in c:
    c = re.sub(
        r"<!-- URLS_START -->.*?<!-- URLS_END -->",
        block,
        c,
        count=1,
        flags=re.DOTALL,
    )
else:
    c = c.replace("## Deployment", block + "\n\n## Deployment", 1)
with open(path, "w", encoding="utf-8") as f:
    f.write(c)
PY
else
  die "python3 es necesario para actualizar README.md de forma segura" 1
fi

echo ""
echo "  ✅ Doppler prd sincronizado (si estabas autenticado con doppler login)"
echo "  ✅ .env.local.example regenerado"
echo "  ✅ GitHub workflow deploy.yml actualizado"
echo "  ✅ README URLs actualizadas"
echo ""
log_info "Siguiente paso sugerido:"
echo "  ./scripts/validate-config.sh"
