#!/usr/bin/env bash
# Provision wacrm sidecar hints for a tenant (idempotent; does not vendor wacrm into monorepo).
# Usage: ./scripts/tenants/setup-wacrm-tenant.sh --slug peskids [--dry-run]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SLUG=""
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/setup-wacrm-tenant.sh --slug <tenant-slug> [--dry-run]

Prints / applies VPS steps for an external wacrm deployment (MIT upstream image or client build).
Does NOT enable WACRM_*_ENABLED — run wacrm-smoke.sh first, then set flag in Doppler.

Suggested public URL: https://wa-<slug>.<PLATFORM_DOMAIN>
Webhook target: n8n tenant workflow (see docs/examples/n8n/wacrm-inbound-twenty-note.json)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)
      shift
      SLUG="${1:-}"
      ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

[[ -n "$SLUG" ]] || { echo "Missing --slug" >&2; usage; exit 1; }

ENV_PREFIX="$(echo "$SLUG" | tr '[:lower:]-' '[:upper:]_')"
if [[ "$SLUG" == "intcloudsysops" ]]; then
  ENV_PREFIX="INTCLOUDSYSOPS"
fi

PLATFORM_DOMAIN="${PLATFORM_DOMAIN:-op-sly.com}"
PUBLIC_URL="https://wa-${SLUG}.${PLATFORM_DOMAIN}"
CONTAINER="wacrm_${SLUG}"
COMPOSE_HINT="${ROOT}/infra/templates/wacrm/docker-compose.wacrm-tenant.yml.example"

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

echo "=== wacrm setup (slug=${SLUG}) ==="
echo "Public URL (suggested): ${PUBLIC_URL}"
echo "Doppler keys:"
echo "  WACRM_${ENV_PREFIX}_SERVER_URL=${PUBLIC_URL}"
echo "  WACRM_${ENV_PREFIX}_WEBHOOK_SECRET=<generate>"
echo "  WACRM_${ENV_PREFIX}_SYNC_TWENTY=notes-only"
echo "  WACRM_${ENV_PREFIX}_ENABLED=false  # until smoke"
echo ""
echo "Compose template: ${COMPOSE_HINT}"
echo ""

if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"; then
  echo "Container $CONTAINER exists — ensuring running"
  run docker start "$CONTAINER" 2>/dev/null || true
else
  echo "No container $CONTAINER on this host."
  echo "On VPS: copy compose template, set WACRM_IMAGE + Meta tokens, docker compose up -d"
  echo "  project: tenant_${SLUG}"
fi

echo ""
echo "n8n: import docs/examples/n8n/wacrm-inbound-twenty-note.json into n8n_${SLUG}"
echo "Smoke: ./scripts/tenants/wacrm-smoke.sh --slug ${SLUG}"
