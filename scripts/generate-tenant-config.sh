#!/usr/bin/env bash
# Genera un fragmento JSON para copiar en config/opsly.config.json → array "tenants".
# Uso interactivo:
#   bash scripts/generate-tenant-config.sh
# Solo valida y muestra JSON (sin preguntar):
#   bash scripts/generate-tenant-config.sh --dry-run --slug demo --email o@e.com --plan startup

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

SLUG=""
EMAIL=""
PLAN=""
DRY_RUN="false"

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
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h | --help)
      echo "Uso: $0 [--slug S] [--email E] [--plan P] [--dry-run]  (sin flags: modo interactivo)"
      exit 0
      ;;
    *)
      die "Argumento desconocido: $1" 1
      ;;
  esac
done

if [[ "${DRY_RUN}" == "true" ]]; then
  if [[ -z "${SLUG}" || -z "${EMAIL}" || -z "${PLAN}" ]]; then
    die "Con --dry-run debes pasar --slug, --email y --plan (sin prompts)." 1
  fi
else
  if [[ -z "${SLUG}" ]]; then
    read -r -p "Tenant slug [a-z0-9-]: " SLUG
  fi
  if [[ -z "${EMAIL}" ]]; then
    read -r -p "Owner email: " EMAIL
  fi
  if [[ -z "${PLAN}" ]]; then
    read -r -p "Plan (startup|business|enterprise): " PLAN
  fi
fi

[[ -n "${SLUG}" ]] || die "slug requerido" 1
[[ -n "${EMAIL}" ]] || die "email requerido" 1
[[ -n "${PLAN}" ]] || die "plan requerido" 1

if [[ ! "${SLUG}" =~ ^[a-z0-9-]{3,30}$ ]]; then
  die "slug inválido (3-30, [a-z0-9-])" 1
fi

case "${PLAN}" in
  startup | business | enterprise) ;;
  *) die "plan debe ser startup|business|enterprise" 1 ;;
esac

if [[ "${EMAIL}" != *"@"* ]]; then
  die "email debe contener @" 1
fi

CREATED="$(date -u +%Y-%m-%d)"

jq -n \
  --arg slug "${SLUG}" \
  --arg email "${EMAIL}" \
  --arg plan "${PLAN}" \
  --arg created "${CREATED}" \
  '{
    slug: $slug,
    plan: $plan,
    ownerEmail: $email,
    status: "provisioning",
    createdAt: $created
  }'
