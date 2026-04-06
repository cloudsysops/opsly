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

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  die "ADMIN_TOKEN vacío. Exporta PLATFORM_ADMIN_TOKEN desde Doppler (no lo pegues en chat)." 1
fi

echo "🔍 E2E Invite flow (local runner)"
echo "  API: ${API_URL}"
echo "  Dry-run: ${DRY_RUN}"

echo "✓ Test 1: Health"
curl -sfk "${API_URL}/api/health" | jq . >/dev/null

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "✓ Dry-run: omitiendo POST /api/invitations"
  echo "✅ Completado (solo health)."
  exit 0
fi

if [[ -z "${OWNER_EMAIL:-}" ]]; then
  die "Para POST real define OWNER_EMAIL con el owner_email del tenant (ej. smiletripcare)." 1
fi

echo "✓ Test 2: POST /api/invitations"
RESPONSE="$(
  curl -sfk -X POST "${API_URL}/api/invitations" \
    -H "Content-Type: application/json" \
    -H "x-admin-token: ${ADMIN_TOKEN}" \
    -d "$(jq -n \
      --arg email "${OWNER_EMAIL}" \
      --arg ts "$(date +%s)" \
      '{ email: $email, tenantRef: "smiletripcare", mode: "developer", name: ("e2e-" + $ts) }')"
)"

echo "${RESPONSE}" | jq .
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
