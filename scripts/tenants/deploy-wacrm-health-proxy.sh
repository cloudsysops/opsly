#!/usr/bin/env bash
# Deploy nginx health proxy for wa-<slug>.<PLATFORM_DOMAIN> (idempotent).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SLUG=""
PLATFORM_DOMAIN="${PLATFORM_DOMAIN:-op-sly.com}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/deploy-wacrm-health-proxy.sh --slug peskids [--dry-run]

Creates wacrm_<slug> nginx container with Traefik TLS at https://wa-<slug>.<PLATFORM_DOMAIN>.
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

[[ -n "$SLUG" ]] || { echo "Missing --slug" >&2; exit 1; }

DEPLOY_DIR="${ROOT}/runtime/tenants/wacrm-${SLUG}"
TEMPLATE_DIR="${ROOT}/infra/templates/wacrm"
CONTAINER="wacrm_${SLUG}"

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

mkdir -p "$DEPLOY_DIR"
cp "${TEMPLATE_DIR}/wacrm-health-proxy.conf" "${DEPLOY_DIR}/wacrm-health-proxy.conf"
cp "${TEMPLATE_DIR}/docker-compose.wacrm-health-proxy.yml" "${DEPLOY_DIR}/docker-compose.yml"

export TENANT_SLUG="$SLUG"
export PLATFORM_DOMAIN

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Recreating $CONTAINER..."
  run docker rm -f "$CONTAINER" 2>/dev/null || true
fi

run docker compose -f "${DEPLOY_DIR}/docker-compose.yml" --project-name "wacrm_${SLUG}" up -d

echo "Health proxy deployed: https://wa-${SLUG}.${PLATFORM_DOMAIN}/api/health"
