#!/usr/bin/env bash
# Valida el flujo de invitaciones contra la API pública (no modifica el VPS).
# Uso:
#   export ADMIN_TOKEN="..."   # PLATFORM_ADMIN_TOKEN (nunca pegar en issues públicos)
#   export OWNER_EMAIL="owner@dominio-real-del-tenant"   # Debe coincidir con owner_email en Supabase
#   export TENANT_SLUG="smiletripcare"  # slug del tenant a probar (default smiletripcare)
#   bash scripts/test-e2e-invite-flow.sh [--api-url URL] [--dry-run]
#
# --dry-run: solo health check (no POST /api/invitations); no requiere ADMIN_TOKEN.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

API_URL="${API_URL:-https://api.ops.smiletripcare.com}"
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
    -h | --help)
      grep '^#' "$0" | head -25
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

if [[ "${DRY_RUN}" != "true" && -z "${ADMIN_TOKEN:-}" ]]; then
  die "ADMIN_TOKEN vacío. Exporta PLATFORM_ADMIN_TOKEN desde Doppler (no lo pegues en chat)." 1
fi

echo "🔍 E2E Invite flow (local runner)"
echo "  API: ${API_URL}"
echo "  Dry-run: ${DRY_RUN}"

echo "✓ Test 1: Health"
TMP_HEALTH="$(mktemp)"
trap 'rm -f "${TMP_HEALTH}"' EXIT
HTTP_HEALTH="$(
  curl -sk -o "${TMP_HEALTH}" -w "%{http_code}" --connect-timeout 20 --max-time 45 "${API_URL}/api/health"
)"
echo "  HTTP Test 1 (GET /api/health): ${HTTP_HEALTH}"
[[ "${HTTP_HEALTH}" == "200" ]] || die "Health check HTTP ${HTTP_HEALTH}" 1
jq . >/dev/null < "${TMP_HEALTH}"
rm -f "${TMP_HEALTH}"
trap - EXIT

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "✓ Dry-run: omitiendo POST /api/invitations"
  echo "✅ Completado (solo health)."
  exit 0
fi

if [[ -z "${OWNER_EMAIL:-}" ]]; then
  die "Para POST real define OWNER_EMAIL con el owner_email del tenant (debe coincidir con platform.tenants para TENANT_SLUG)." 1
fi

TENANT_SLUG="${TENANT_SLUG:-smiletripcare}"

echo "✓ Test 2: POST /api/invitations (tenant slug: ${TENANT_SLUG})"
# Authorization Bearer + x-admin-token (API acepta cualquiera; Bearer es el que suele usar el admin app).
TMP_BODY="$(mktemp)"
TMP_RES="$(mktemp)"
trap 'rm -f "${TMP_BODY}" "${TMP_RES}"' EXIT
jq -n \
  --arg email "${OWNER_EMAIL}" \
  --arg ts "$(date +%s)" \
  --arg tenant_slug "${TENANT_SLUG}" \
  '{ email: $email, tenantRef: $tenant_slug, mode: "developer", name: ("e2e-" + $ts) }' >"${TMP_BODY}"
HTTP_CODE="$(
  curl -sk -o "${TMP_RES}" -w "%{http_code}" --connect-timeout 30 --max-time 120 -X POST "${API_URL}/api/invitations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "x-admin-token: ${ADMIN_TOKEN}" \
    -d @"${TMP_BODY}"
)"
echo "  HTTP Test 2 (POST /api/invitations): ${HTTP_CODE}"
RESPONSE="$(cat "${TMP_RES}")"
# No imprimir token completo ni URL con token (el link suele incluir el invite en el path o query)
echo "${RESPONSE}" | jq '
  if (type == "object") and (.token | type) == "string" and (.token | length) > 0 then
    .token = ((.token | .[0:12]) + "…")
  else . end
  | if (type == "object") and (.link | type) == "string" and (.link | length) > 0 then
    .link_preview = ((.link | .[0:20]) + "…")
    | del(.link)
  else . end
' 2>/dev/null || echo "(respuesta no JSON o jq no disponible; omitiendo cuerpo por seguridad)"

if [[ "${HTTP_CODE}" != "200" ]]; then
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
HTTP_ME="$(
  curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 15 --max-time 30 "${API_URL}/api/portal/me" -H "Authorization: Bearer invalid"
)"
set -e
echo "  HTTP Test 4 (GET /api/portal/me inválido): ${HTTP_ME}"

echo "✅ E2E script completado"
