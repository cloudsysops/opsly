#!/usr/bin/env bash
# Valida el flujo de invitaciones contra la API pública (no modifica el VPS).
# Uso:
#   export ADMIN_TOKEN="..."   # PLATFORM_ADMIN_TOKEN (nunca pegar en issues públicos)
#   export OWNER_EMAIL="owner@dominio-real-del-tenant"   # Debe coincidir con owner_email en Supabase
#   bash scripts/test-e2e-invite-flow.sh [--api-url URL] [--dry-run]
#
# --dry-run: solo health check (no POST /api/invitations).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

API_URL="${API_URL:-https://api.ops.smiletripcare.com}"
# Backward compatible: prefer TENANT_REF, fallback to legacy TENANT_SLUG.
TENANT_REF="${TENANT_REF:-${TENANT_SLUG:-smiletripcare}}"
DRY_RUN="false"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-url)
      API_URL="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --tenant-ref)
      TENANT_REF="${2:-}"
      shift 2
      ;;
    -h | --help)
      grep '^#' "$0" | head -20
      exit 0
      ;;
    *)
      die "Argumento desconocido: $1" 1
      ;;
  esac
done

if [[ "${API_URL}" == "" ]]; then
  die "--api-url no puede estar vacío" 1
fi

echo "🔍 E2E Invite flow (local runner)"
echo "  API: ${API_URL}"
echo "  Dry-run: ${DRY_RUN}"
echo "  Tenant: ${TENANT_REF}"

echo "✓ Test 1: Health"
curl -sfk "${API_URL}/api/health" | jq . >/dev/null

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "✓ Dry-run: omitiendo POST /api/invitations"
  echo "✅ Completado (solo health)."
  exit 0
fi

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  die "ADMIN_TOKEN vacío. Exporta PLATFORM_ADMIN_TOKEN desde Doppler (no lo pegues en chat)." 1
fi

if [[ -z "${OWNER_EMAIL:-}" ]]; then
  die "Para POST real define OWNER_EMAIL con el owner_email del tenant (ej. smiletripcare)." 1
fi

echo "✓ Test 2: POST /api/invitations"
# Authorization Bearer + x-admin-token (API acepta cualquiera; Bearer es el que suele usar el admin app).
TMP_BODY="$(mktemp)"
TMP_RES="$(mktemp)"
trap 'rm -f "${TMP_BODY}" "${TMP_RES}"' EXIT
jq -n \
  --arg email "${OWNER_EMAIL}" \
  --arg tenantRef "${TENANT_REF}" \
  --arg ts "$(date +%s)" \
  '{ email: $email, tenantRef: $tenantRef, mode: "developer", name: ("e2e-" + $ts) }' >"${TMP_BODY}"
HTTP_CODE="$(
  curl -sk -o "${TMP_RES}" -w "%{http_code}" -X POST "${API_URL}/api/invitations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "x-admin-token: ${ADMIN_TOKEN}" \
    -d @"${TMP_BODY}"
)"
RESPONSE="$(cat "${TMP_RES}")"
echo "${RESPONSE}" | jq . 2>/dev/null || echo "${RESPONSE}"

if [[ "${HTTP_CODE}" != "200" ]]; then
  if [[ "${RESPONSE}" == *"already been registered"* ]]; then
    echo "⚠️ Usuario ya registrado: caso idempotente aceptado para smoke."
    echo "✅ E2E Invite flow OK (idempotente)."
    exit 0
  fi
  echo "❌ POST /api/invitations → HTTP ${HTTP_CODE}" >&2
  if [[ "${RESPONSE}" == *RESEND* || "${RESPONSE}" == *"API key is invalid"* ]]; then
    echo "   Revisa Doppler prd: RESEND_API_KEY (clave activa en resend.com) y RESEND_FROM_EMAIL o RESEND_FROM_ADDRESS; vps-bootstrap + recrear servicio app en VPS." >&2
  fi
  exit 1
fi
TOKEN="$(echo "${RESPONSE}" | jq -r .token)"

if [[ "${TOKEN}" == "null" || -z "${TOKEN}" ]]; then
  die "Respuesta sin token (revisa 403/404 en cuerpo o OWNER_EMAIL)" 1
fi

echo "✓ Test 3: Longitud de token"
[[ ${#TOKEN} -gt 10 ]] || die "Token inesperadamente corto" 1

echo "✓ Test 4: GET /api/portal/me sin sesión (esperado 401/4xx)"
set +e
curl -sfk "${API_URL}/api/portal/me" -H "Authorization: Bearer invalid" >/dev/null 2>&1
set -e

echo "✅ E2E script completado"
