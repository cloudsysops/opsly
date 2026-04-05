#!/usr/bin/env bash
# Valida config/opsly.config.json, DNS hacia el VPS, secretos mínimos en Doppler y SSH.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

CONFIG="${REPO_ROOT}/config/opsly.config.json"

require_cmd jq dig

[[ -f "${CONFIG}" ]] || die "No existe ${CONFIG}" 1

PASS_JSON=0
PASS_FIELDS=0
PASS_DNS_API=0
PASS_DNS_BASE=0
PASS_DNS_ADMIN=0
PASS_DOPPLER=0
PASS_SSH=0

echo ""
echo "┌──────────────────────────────────────────┐"
echo "│  opsly — Config Validation               │"
echo "└──────────────────────────────────────────┘"

if jq empty "${CONFIG}" >/dev/null 2>&1; then
  echo "✅ JSON válido"
  PASS_JSON=1
else
  echo "❌ JSON inválido"
fi

read_cfg() {
  jq -r "$1" "${CONFIG}"
}

nonempty() {
  local v="$1"
  [[ -n "${v}" ]] && [[ "${v}" != "null" ]]
}

REQ=(
  .project.name
  .project.doppler_project
  .project.doppler_config
  .project.github_org
  .project.github_repo
  .infrastructure.vps_ip
  .infrastructure.vps_user
  .infrastructure.vps_path
  .infrastructure.traefik_network
  .domains.base
  .domains.api
  .domains.admin
  .domains.traefik
  .domains.wildcard
)

missing=()
for p in "${REQ[@]}"; do
  v="$(jq -r "${p} // empty" "${CONFIG}" 2>/dev/null || true)"
  if ! nonempty "${v}"; then
    missing+=("${p}")
  fi
done

if (( ${#missing[@]} == 0 )); then
  echo "✅ Campos requeridos en JSON"
  PASS_FIELDS=1
else
  echo "❌ Faltan o están vacíos: ${missing[*]}"
fi

VPS_IP="$(read_cfg '.infrastructure.vps_ip')"
API_DOM="$(read_cfg '.domains.api')"
BASE_DOM="$(read_cfg '.domains.base')"
ADMIN_DOM="$(read_cfg '.domains.admin')"
DOPPLER_PROJECT="$(read_cfg '.project.doppler_project')"
DOPPLER_CFG="$(read_cfg '.project.doppler_config')"
VPS_USER="$(read_cfg '.infrastructure.vps_user')"
VPS_PATH="$(read_cfg '.infrastructure.vps_path')"

dns_points_to_vps() {
  local host="$1"
  local out
  out="$(dig +short "${host}" 2>/dev/null || true)"
  if echo "${out}" | grep -Fq "${VPS_IP}"; then
    return 0
  fi
  return 1
}

if [[ "${PASS_JSON}" -eq 1 ]] && [[ "${PASS_FIELDS}" -eq 1 ]]; then
  if dns_points_to_vps "${API_DOM}"; then
    echo "✅ DNS ${API_DOM} → ${VPS_IP}"
    PASS_DNS_API=1
  else
    echo "⚠️  DNS ${API_DOM} no resuelve claramente a ${VPS_IP} (revisa dig +short)"
  fi
  if dns_points_to_vps "${BASE_DOM}"; then
    echo "✅ DNS ${BASE_DOM} → ${VPS_IP}"
    PASS_DNS_BASE=1
  else
    echo "⚠️  DNS ${BASE_DOM} no resuelve claramente a ${VPS_IP}"
  fi
  if dns_points_to_vps "${ADMIN_DOM}"; then
    echo "✅ DNS ${ADMIN_DOM} → ${VPS_IP}"
    PASS_DNS_ADMIN=1
  else
    echo "⚠️  DNS ${ADMIN_DOM} no resuelve claramente a ${VPS_IP}"
  fi
else
  echo "⚠️  Omitidas comprobaciones DNS (JSON inválido o incompleto)"
fi

if command -v doppler >/dev/null 2>&1 && doppler me >/dev/null 2>&1; then
  check_secret() {
    local k="$1"
    local v
    v="$(doppler secrets get "${k}" --project "${DOPPLER_PROJECT}" --config "${DOPPLER_CFG}" --plain 2>/dev/null || true)"
    if [[ -z "${v}" ]]; then
      echo "❌ Doppler falta o vacío: ${k}"
      return 1
    fi
    if [[ "${v}" == *"REEMPLAZAR"* ]] || [[ "${v}" == "change-me"* ]]; then
      echo "⚠️  Doppler ${k} parece placeholder"
      return 1
    fi
    return 0
  }
  fail=0
  for k in PLATFORM_DOMAIN ACME_EMAIL SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY STRIPE_SECRET_KEY PLATFORM_ADMIN_TOKEN REDIS_PASSWORD; do
    check_secret "${k}" || fail=1
  done
  if [[ "${fail}" -eq 0 ]]; then
    echo "✅ Doppler secrets críticos con valor (no placeholder obvio)"
    PASS_DOPPLER=1
  else
    echo "⚠️  Revisa Doppler: doppler secrets --project ${DOPPLER_PROJECT} --config ${DOPPLER_CFG}"
  fi
else
  echo "⚠️  Doppler CLI no autenticado — no se validaron secretos remotos"
fi

if ssh -o BatchMode=yes -o ConnectTimeout=5 "${VPS_USER}@${VPS_IP}" exit >/dev/null 2>&1; then
  echo "✅ VPS accesible (ssh ${VPS_USER}@${VPS_IP})"
  PASS_SSH=1
else
  echo "⚠️  SSH no disponible sin interacción (clave, known_hosts o timeout)"
fi

# DOCKER_GID en .env del VPS — Traefik (compose) usa group_add con este valor para el socket Docker.
if [[ "${PASS_SSH}" -eq 1 ]] && nonempty "${VPS_PATH}"; then
  if ssh -o BatchMode=yes -o ConnectTimeout=8 "${VPS_USER}@${VPS_IP}" \
    "test -f '${VPS_PATH}/.env' && grep -q '^DOCKER_GID=' '${VPS_PATH}/.env'" >/dev/null 2>&1; then
    echo "✅ VPS ${VPS_PATH}/.env incluye DOCKER_GID (Traefik → docker.sock)"
  else
    echo "⚠️  Falta DOCKER_GID en ${VPS_PATH}/.env del VPS — Traefik no podrá usar el socket bien."
    echo "    En el VPS: ejecuta ./scripts/vps-bootstrap.sh (añade DOCKER_GID con stat -c %g /var/run/docker.sock)"
    echo "    o añade manualmente: echo \"DOCKER_GID=\$(stat -c %g /var/run/docker.sock)\" >> ${VPS_PATH}/.env"
  fi
elif [[ "${PASS_SSH}" -eq 1 ]]; then
  echo "⚠️  infrastructure.vps_path vacío en JSON — no se comprobó DOCKER_GID en el VPS"
fi

# Terraform (opcional): si existe infra/terraform/, avisar si falta CLI o init
TERRAFORM_DIR="${REPO_ROOT}/infra/terraform"
if [[ -d "${TERRAFORM_DIR}" ]] && compgen -G "${TERRAFORM_DIR}/*.tf" >/dev/null 2>&1; then
  if command -v terraform >/dev/null 2>&1; then
    if [[ -d "${TERRAFORM_DIR}/.terraform" ]]; then
      echo "✅ Terraform: infra/terraform inicializado (.terraform presente)"
    else
      echo "⚠️  Terraform instalado pero sin init en infra/terraform — ejecuta: cd infra/terraform && terraform init"
    fi
  else
    echo "⚠️  Hay infra/terraform/ pero 'terraform' no está en PATH (instala Terraform >= 1.5 para gestionar DO)"
  fi
fi

echo "─────────────────────────────────────────"

ready=1
[[ "${PASS_JSON}" -eq 1 ]] || ready=0
[[ "${PASS_FIELDS}" -eq 1 ]] || ready=0
[[ "${PASS_DNS_API}" -eq 1 ]] || ready=0
[[ "${PASS_DNS_BASE}" -eq 1 ]] || ready=0
[[ "${PASS_DNS_ADMIN}" -eq 1 ]] || ready=0
[[ "${PASS_DOPPLER}" -eq 1 ]] || ready=0
[[ "${PASS_SSH}" -eq 1 ]] || ready=0

if [[ "${ready}" -eq 1 ]]; then
  echo "Resultado: LISTO PARA DEPLOY"
else
  echo "Resultado: REVISAR ítems ⚠️ o ❌ antes de producción"
fi
echo ""
