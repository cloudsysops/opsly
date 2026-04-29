#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/../lib/common.sh"

TENANT_SLUG=""
API_URL="${API_URL:-https://api.ops.smiletripcare.com}"
PORTAL_DOMAIN="${PORTAL_DOMAIN:-portal.ops.smiletripcare.com}"
N8N_DOMAIN_BASE="${N8N_DOMAIN_BASE:-ops.smiletripcare.com}"
UPTIME_DOMAIN_BASE="${UPTIME_DOMAIN_BASE:-ops.smiletripcare.com}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant-slug)
      TENANT_SLUG="${2:-}"
      shift 2
      ;;
    --api-url)
      API_URL="${2:-}"
      shift 2
      ;;
    -h|--help)
      echo "Uso: $0 --tenant-slug <slug> [--api-url <url>]"
      exit 0
      ;;
    *)
      die "Argumento desconocido: $1" 1
      ;;
  esac
done

if [[ -z "${TENANT_SLUG}" ]]; then
  die "Falta --tenant-slug" 1
fi

if [[ ! "${TENANT_SLUG}" =~ ^[a-z0-9-]{3,30}$ ]]; then
  die "tenant-slug inválido" 1
fi

echo "==> Readiness tenant ${TENANT_SLUG}"

echo "1) API health"
curl -sfk "${API_URL}/api/health" >/dev/null

echo "2) Portal health endpoint"
curl -sfk "${API_URL}/api/portal/health?slug=${TENANT_SLUG}" >/dev/null

echo "3) Invite E2E dry-run"
API_URL="${API_URL}" bash scripts/test-e2e-invite-flow.sh --dry-run --tenant-ref "${TENANT_SLUG}"

echo "4) Public endpoints"
curl -sfk "https://${PORTAL_DOMAIN}/login" >/dev/null
curl -sfk "https://n8n-${TENANT_SLUG}.${N8N_DOMAIN_BASE}" >/dev/null
curl -sfk "https://uptime-${TENANT_SLUG}.${UPTIME_DOMAIN_BASE}" >/dev/null

echo "✅ Tenant onboarding readiness OK: ${TENANT_SLUG}"
