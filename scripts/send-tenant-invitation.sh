#!/usr/bin/env bash
# Envía invitación al portal vía POST /api/invitations (mismo contrato que INVITATIONS_RUNBOOK.md).
#
# Uso:
#   export PLATFORM_ADMIN_TOKEN="..."   # desde Doppler prd (no pegar en tickets públicos)
#   ./scripts/send-tenant-invitation.sh --slug localrank --email owner@dominio.com --name "Nombre"
#
# Opciones:
#   --slug SLUG       Tenant (alternativa: --tenant-ref)
#   --tenant-ref SLUG Igual que slug en la API (tenantRef)
#   --email EMAIL     Debe coincidir con owner_email del tenant en platform.tenants
#   --name NAME       Opcional; nombre mostrado en el email
#   --mode MODE       developer | managed (default: developer)
#   --api-url URL     Default: https://api.ops.smiletripcare.com
#   --dry-run         Solo muestra el cuerpo del template manual (no llama a la API)
#   -h, --help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

SLUG=""
TENANT_REF=""
EMAIL=""
NAME=""
MODE="developer"
API_URL="${API_URL:-https://api.ops.smiletripcare.com}"
DRY_RUN="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)
      SLUG="${2:-}"
      shift 2
      ;;
    --tenant-ref)
      TENANT_REF="${2:-}"
      shift 2
      ;;
    --email)
      EMAIL="${2:-}"
      shift 2
      ;;
    --name)
      NAME="${2:-}"
      shift 2
      ;;
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --api-url)
      API_URL="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h | --help)
      grep '^#' "$0" | head -22
      exit 0
      ;;
    *)
      die "Opción desconocida: $1 (usa --help)" 1
      ;;
  esac
done

REF="${TENANT_REF:-$SLUG}"
if [[ -z "$REF" ]]; then
  die "Indica --slug o --tenant-ref" 1
fi
if [[ -z "${EMAIL:-}" ]]; then
  die "Indica --email (debe ser owner_email del tenant)" 1
fi

TEMPLATE="${REPO_ROOT}/docs/emails/tenant-welcome-email.md"
if [[ "$DRY_RUN" == "true" ]]; then
  if [[ ! -f "$TEMPLATE" ]]; then
    log_warn "No existe ${TEMPLATE}; omitiendo vista previa del template manual."
  else
    echo "📄 Vista previa (template manual docs/emails; el envío real usa HTML Resend desde la API):"
    echo ""
    sed \
      -e "s/{NOMBRE_CLIENTE}/${NAME:-Cliente}/g" \
      -e "s/{TU_SLUG}/$REF/g" \
      "$TEMPLATE" | head -80
    echo ""
  fi
  echo "[DRY-RUN] No se ha llamado a la API. Para enviar de verdad, quita --dry-run y define PLATFORM_ADMIN_TOKEN."
  exit 0
fi

ADMIN_TOKEN="${PLATFORM_ADMIN_TOKEN:-}"
if [[ -z "$ADMIN_TOKEN" ]]; then
  die "PLATFORM_ADMIN_TOKEN vacío. Ej.: doppler secrets get PLATFORM_ADMIN_TOKEN --plain --project ops-intcloudsysops --config prd" 1
fi

if [[ "$MODE" != "developer" && "$MODE" != "managed" ]]; then
  die "--mode debe ser developer o managed" 1
fi

require_cmd curl
require_cmd jq

log_info "Enviando invitación (API)…"
log_info "  API: ${API_URL}"
log_info "  tenantRef/slug: ${REF}"
log_info "  email: ${EMAIL}"

TMP_BODY="$(mktemp)"
TMP_RES="$(mktemp)"
trap 'rm -f "${TMP_BODY}" "${TMP_RES}"' EXIT

if [[ -n "${NAME:-}" ]]; then
  jq -n \
    --arg email "$EMAIL" \
    --arg tenant_ref "$REF" \
    --arg mode "$MODE" \
    --arg name "$NAME" \
    '{ email: $email, tenantRef: $tenant_ref, mode: $mode, name: $name }' >"$TMP_BODY"
else
  jq -n \
    --arg email "$EMAIL" \
    --arg tenant_ref "$REF" \
    --arg mode "$MODE" \
    '{ email: $email, tenantRef: $tenant_ref, mode: $mode }' >"$TMP_BODY"
fi

HTTP_CODE="$(
  curl -sk -o "${TMP_RES}" -w "%{http_code}" --connect-timeout 30 --max-time 120 \
    -X POST "${API_URL}/api/invitations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "x-admin-token: ${ADMIN_TOKEN}" \
    -d @"${TMP_BODY}"
)"

RESPONSE="$(cat "${TMP_RES}" 2>/dev/null || echo '{}')"

echo "HTTP: ${HTTP_CODE}"
# Redactar token/link en salida
echo "$RESPONSE" | jq '
  if (type == "object") and (.token | type) == "string" then .token = ((.token | .[0:10]) + "…") else . end
  | if (type == "object") and (.link | type) == "string" then .link = ((.link | .[0:40]) + "…") else . end
' 2>/dev/null || echo "$RESPONSE"

if [[ "$HTTP_CODE" != "200" ]]; then
  log_error "Fallo al enviar invitación (HTTP ${HTTP_CODE}). Revisa owner_email vs email, Resend y token admin."
  exit 1
fi

OK="$(echo "$RESPONSE" | jq -r '.ok // false')"
if [[ "$OK" != "true" ]]; then
  log_error "Respuesta sin ok:true"
  exit 1
fi

log_info "Invitación enviada (ok). Revisa bandeja del destinatario y Resend dashboard."
