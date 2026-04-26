#!/usr/bin/env bash
# Smoke: POST /api/tenants persiste (post-check API) y aparece en GET /api/tenants; opcional DELETE.
# Uso (prod/staging bajo tu responsabilidad):
#   export ADMIN_TOKEN="..."   # PLATFORM_ADMIN_TOKEN
#   export API_URL="https://api.<dominio>"
#   bash scripts/smoke-tenant-provision-api.sh [--dry-run] [--cleanup]
#
# --dry-run: solo GET /api/health
# --cleanup: tras verificar lista, DELETE /api/tenants/<id> (soft-delete vía API)
#
# Sin --dry-run exige SMOKE_ALLOW_PROD=1 para no crear tenants por accidente.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

API_URL="${API_URL:-https://api.ops.smiletripcare.com}"
DRY_RUN="false"
CLEANUP="false"
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
    --cleanup)
      CLEANUP="true"
      shift
      ;;
    -h | --help)
      grep '^#' "$0" | head -22
      exit 0
      ;;
    *)
      die "Argumento desconocido: $1" 1
      ;;
  esac
done

if [[ -z "${API_URL}" ]]; then
  die "API_URL vacío" 1
fi

echo "Smoke tenant provision"
echo "  API: ${API_URL}"

echo "✓ Health"
curl -sfk "${API_URL}/api/health" | jq . >/dev/null

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "✅ Dry-run OK"
  exit 0
fi

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  die "ADMIN_TOKEN vacío (PLATFORM_ADMIN_TOKEN)." 1
fi

if [[ "${SMOKE_ALLOW_PROD:-}" != "1" ]]; then
  die "Sin --dry-run debes exportar SMOKE_ALLOW_PROD=1 para confirmar creación de tenant." 1
fi

SLUG="smoke$(date +%s)"
SLUG="${SLUG:0:30}"
OWNER_EMAIL="${SMOKE_OWNER_EMAIL:-smoke-owner@example.com}"

echo "✓ POST /api/tenants slug=${SLUG}"
TMP_RES="$(mktemp)"
trap 'rm -f "${TMP_RES}"' EXIT
HTTP_CODE="$(
  curl -sk -o "${TMP_RES}" -w "%{http_code}" -X POST "${API_URL}/api/tenants" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "x-admin-token: ${ADMIN_TOKEN}" \
    -d "$(jq -n --arg slug "$SLUG" --arg email "$OWNER_EMAIL" '{slug:$slug, owner_email:$email, plan:"demo"}')"
)"
BODY="$(cat "${TMP_RES}")"
if [[ "${HTTP_CODE}" != "202" ]]; then
  echo "${BODY}" >&2
  die "POST /api/tenants esperaba 202, obtuvo ${HTTP_CODE}" 1
fi

TENANT_ID="$(echo "${BODY}" | jq -r '.id')"
if [[ -z "${TENANT_ID}" || "${TENANT_ID}" == "null" ]]; then
  die "Respuesta sin id JSON" 1
fi

echo "✓ GET /api/tenants (buscar id ${TENANT_ID})"
LIST_JSON="$(curl -sfk "${API_URL}/api/tenants?page=1&limit=50" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "x-admin-token: ${ADMIN_TOKEN}")"
if ! echo "${LIST_JSON}" | jq -e --arg id "${TENANT_ID}" '.data[] | select(.id == $id)' >/dev/null; then
  echo "${LIST_JSON}" | jq . >&2
  die "Tenant no aparece en GET /api/tenants (persistencia fallida)" 1
fi

echo "✅ Persistencia OK (slug=${SLUG}, id=${TENANT_ID})"

if [[ "${CLEANUP}" == "true" ]]; then
  echo "✓ DELETE /api/tenants/${TENANT_ID}"
  HTTP_DEL="$(
    curl -sk -o /dev/null -w "%{http_code}" -X DELETE "${API_URL}/api/tenants/${TENANT_ID}" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "x-admin-token: ${ADMIN_TOKEN}"
  )"
  if [[ "${HTTP_DEL}" != "204" ]]; then
    die "DELETE esperaba 204, obtuvo ${HTTP_DEL}" 1
  fi
  echo "✅ Cleanup OK"
else
  echo "Nota: sin --cleanup el tenant sigue en DB (slug=${SLUG})."
fi
