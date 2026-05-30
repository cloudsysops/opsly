#!/usr/bin/env bash
# Deploy OpenWA sidecar for a tenant/app stack (idempotent).
# Usage: ./scripts/setup-openwa-tenant.sh --slug peskids [--dry-run]
# Requires: ghcr.io/cloudsysops/openwa image (workflow build-openwa.yml)
set -euo pipefail

SLUG=""
DRY_RUN=false

usage() {
  echo "Usage: $0 --slug <tenant-slug> [--dry-run]"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug) SLUG="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
done

[[ -n "$SLUG" ]] || usage

CONTAINER="openwa-${SLUG}"
ENV_PREFIX="$(echo "$SLUG" | tr '[:lower:]-' '[:upper:]_')"
API_KEY_VAR="OPENWA_${ENV_PREFIX}_API_KEY"
IMAGE="${OPENWA_IMAGE:-ghcr.io/cloudsysops/openwa:latest}"

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

if [[ -z "${!API_KEY_VAR:-}" && -z "${OPENWA_API_KEY:-}" ]]; then
  echo "WARN: set ${API_KEY_VAR} or OPENWA_API_KEY in Doppler before production" >&2
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container $CONTAINER exists — ensuring running"
  run docker start "$CONTAINER" 2>/dev/null || true
else
  echo "Creating $CONTAINER from $IMAGE"
  run docker run -d \
    --name "$CONTAINER" \
    --restart unless-stopped \
    -e "API_KEY=${!API_KEY_VAR:-${OPENWA_API_KEY:-change-me}}" \
    -e DATABASE_PATH=/app/data/openwa.sqlite \
    -v "${CONTAINER}_data:/app/data" \
    -p "127.0.0.1:2785:2785" \
    "$IMAGE"
fi

echo "OpenWA sidecar ready: $CONTAINER (http://127.0.0.1:2785/api)"
echo "Set in tenant app env:"
echo "  OPENWA_${ENV_PREFIX}_API_URL=http://${CONTAINER}:2785"
echo "  OPENWA_${ENV_PREFIX}_SESSION_ID=${SLUG}"
