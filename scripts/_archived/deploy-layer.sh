#!/usr/bin/env bash
# deploy-layer.sh - Deploy to specific layer
# Usage: ./scripts/deploy-layer.sh [sandbox|qa|prod] [--dry-run]
#
# Environment variables required:
#   LAYER_VPS_HOST - VPS SSH host for the layer
#   LAYER_VPS_USER - VPS SSH user (default: vps-dragon)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
LAYER="${1:-}"
DRY_RUN="${2:-}"
VPS_USER="${VPS_USER:-vps-dragon}"
VPS_PATH="${VPS_PATH:-/opt/opsly}"
DOPPLER_PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"

if [ -z "$LAYER" ]; then
  echo "Usage: $0 [sandbox|qa|prod] [--dry-run]"
  exit 1
fi

# Validate layer
case "$LAYER" in
  sandbox|qa|prod) ;;
  *)
    echo "Invalid layer: $LAYER"
    echo "Valid layers: sandbox, qa, prod"
    exit 1
    ;;
esac

echo "┌─────────────────────────────────────────────"
echo "│  Deploying to layer: $LAYER"
echo "└─────────────────────────────────────────────"

# Get layer-specific VPS host
case "$LAYER" in
  sandbox)
    VPS_HOST="${SANDBOX_VPS_HOST:-100.120.151.91}"
    COMPOSE_FILE="infra/docker-compose.platform.yml"
    DOPPLER_CONFIG="${DOPPLER_CONFIG_SANDBOX:-dev_sandbox}"
    DOPPLER_CONFIG_FALLBACK="${DOPPLER_CONFIG_SANDBOX_FALLBACK:-dev}"
    DEPLOY_SERVICES="${DEPLOY_SERVICES_SANDBOX:-app admin}"
    ;;
  qa)
    VPS_HOST="${QA_VPS_HOST:-100.120.151.91}"
    COMPOSE_FILE="infra/docker-compose.platform.yml"
    DOPPLER_CONFIG="${DOPPLER_CONFIG_QA:-stg_qa}"
    DOPPLER_CONFIG_FALLBACK="${DOPPLER_CONFIG_QA_FALLBACK:-stg}"
    DEPLOY_SERVICES="${DEPLOY_SERVICES_QA:-app admin}"
    ;;
  prod)
    VPS_HOST="${PROD_VPS_HOST:-100.120.151.91}"
    COMPOSE_FILE="infra/docker-compose.platform.yml"
    DOPPLER_CONFIG="${DOPPLER_CONFIG_PROD:-prd}"
    DOPPLER_CONFIG_FALLBACK="${DOPPLER_CONFIG_PROD_FALLBACK:-prd}"
    DEPLOY_SERVICES="${DEPLOY_SERVICES_PROD:-app admin portal}"
    ;;
esac

echo "  Layer: $LAYER"
echo "  VPS: $VPS_USER@$VPS_HOST"
echo "  Compose: $COMPOSE_FILE"
echo "  Doppler: $DOPPLER_PROJECT/$DOPPLER_CONFIG"
echo "  Doppler fallback: $DOPPLER_PROJECT/$DOPPLER_CONFIG_FALLBACK"
echo "  Services: $DEPLOY_SERVICES"

if [ "$DRY_RUN" = "--dry-run" ]; then
  echo ""
  echo "[DRY-RUN] Would deploy to layer: $LAYER"
  echo "  - Sync code from git"
  echo "  - Download .env from Doppler ($DOPPLER_PROJECT/$DOPPLER_CONFIG)"
  echo "  - Retry with fallback config ($DOPPLER_PROJECT/$DOPPLER_CONFIG_FALLBACK)"
  echo "  - Pull Docker images for $LAYER"
  echo "  - Run docker compose up -d"
  exit 0
fi

# Production requires approval
if [ "$LAYER" = "prod" ]; then
  if [ -z "${APPROVED:-}" ]; then
    echo ""
    echo "❌ Production deployment requires APPROVAL"
    echo "   Set APPROVED=1 environment variable to proceed"
    echo "   Or use GitHub Actions workflow for approval gate"
    exit 1
  fi
  echo ""
  echo "⚠️  Deploying to PRODUCTION"
  echo "   Approved by: ${APPROVED_BY:-automated}"
fi

echo ""
echo "🚀 Starting deployment..."

LAYER_URL="$("$SCRIPT_DIR/get-layer-url.sh" "$LAYER")"

# Deploy via SSH
ssh "$VPS_USER@$VPS_HOST" << EOF
  set -euo pipefail
  
  echo "Pulling latest code..."
  cd "$VPS_PATH"
  git pull --ff-only origin main

  if command -v doppler >/dev/null 2>&1; then
    echo "Downloading environment from Doppler..."
    if ! doppler secrets download --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" --format env --no-file > .env; then
      echo "Primary Doppler config failed. Trying fallback..."
      doppler secrets download --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG_FALLBACK" --format env --no-file > .env
    fi
  else
    echo "WARNING: Doppler CLI not found on VPS. Reusing existing .env"
  fi

  if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
  fi

  if [ -n "\${GHCR_USER:-}" ] && [ -n "\${GHCR_TOKEN:-}" ]; then
    echo "Logging in to GHCR..."
    printf "%s" "\$GHCR_TOKEN" | docker login ghcr.io -u "\$GHCR_USER" --password-stdin >/dev/null
  else
    echo "WARNING: GHCR_USER/GHCR_TOKEN not found in environment; relying on existing docker login"
  fi
  
  echo "Pulling Docker images..."
  PULL_OK=1
  if ! docker compose --env-file .env -f $COMPOSE_FILE pull $DEPLOY_SERVICES; then
    PULL_OK=0
    echo "WARNING: GHCR pull failed. Falling back to local build on VPS."
  fi
  
  echo "Starting containers..."
  if [ "\$PULL_OK" -eq 1 ]; then
    docker compose --env-file .env -f $COMPOSE_FILE up -d $DEPLOY_SERVICES
  else
    docker compose --env-file .env -f $COMPOSE_FILE up -d --build $DEPLOY_SERVICES
  fi
  
  echo "Checking health..."
  sleep 10
  if curl -sf "$LAYER_URL/api/health" >/dev/null; then
    echo "OK"
  else
    echo "FAILED"
    exit 1
  fi
  
  echo "Done!"
EOF

echo ""
echo "✅ Layer $LAYER deployed successfully"