#!/usr/bin/env bash
# Emergency manual deploy when GitHub Actions fails
# Usage: bash scripts/peskids-emergency-deploy.sh <GITHUB_TOKEN> [IMAGE_TAG]

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: bash scripts/peskids-emergency-deploy.sh <GITHUB_TOKEN> [IMAGE_TAG]"
  echo ""
  echo "GITHUB_TOKEN: GitHub personal access token with packages:read scope"
  echo "IMAGE_TAG:    Optional git commit SHA or 'latest' (default: latest)"
  exit 1
fi

GITHUB_TOKEN="$1"
IMAGE_TAG="${2:-latest}"
VPS_HOST="vps-dragon@100.120.151.91"
IMAGE="ghcr.io/cloudsysops/peskids:${IMAGE_TAG}"
REPO_PATH="/opt/opsly"

echo "🚀 Emergency Peskids Deploy"
echo "  Image:      $IMAGE"
echo "  VPS:        $VPS_HOST"
echo "  Token:      ${GITHUB_TOKEN:0:10}..."
echo ""

# Deploy function
deploy() {
  local github_token="$1"
  local image="$2"
  local repo_path="$3"

  set -euo pipefail

  echo "📦 Step 1: Docker login to GHCR..."
  echo "$github_token" | docker login ghcr.io -u oauth2accesstoken --password-stdin

  echo "📥 Step 2: Pull image: $image"
  docker pull "$image"

  echo "🛑 Step 3: Stop existing container..."
  docker stop peskids 2>/dev/null || true
  docker rm peskids 2>/dev/null || true

  echo "📝 Step 4: Download environment from Doppler..."
  ENV_FILE="/tmp/peskids.env"
  doppler secrets download --no-file --format docker --project ops-intcloudsysops --config prd > "$ENV_FILE"

  # Filter platform-wide NEXT_PUBLIC_* vars
  source "${repo_path}/scripts/lib/peskids-docker-env-filter.sh"
  filter_peskids_docker_env "$ENV_FILE"

  echo "🐳 Step 5: Run container..."
  docker run -d --name peskids --restart unless-stopped \
    --network traefik-public \
    -p 127.0.0.1:3004:3004 \
    --env-file "$ENV_FILE" \
    "$image"

  echo "✅ Step 6: Health check..."
  sleep 3
  if curl -sf http://127.0.0.1:3004/api/health > /dev/null; then
    echo "✅ Peskids is healthy!"
    return 0
  else
    echo "⚠️  Health check failed, but container started"
    docker logs peskids | tail -10
    return 1
  fi
}

# Run on VPS via SSH
echo "🔌 Connecting to VPS..."
if ssh -o ConnectTimeout=5 "$VPS_HOST" \
  "GITHUB_TOKEN=$(printf '%q' "$GITHUB_TOKEN") IMAGE=$(printf '%q' "$IMAGE") REPO_PATH=$(printf '%q' "$REPO_PATH") bash -s" <<'REMOTE'
set -euo pipefail

# Deploy inline function
echo "$GITHUB_TOKEN" | docker login ghcr.io -u oauth2accesstoken --password-stdin
docker pull "$IMAGE"
docker stop peskids 2>/dev/null || true
docker rm peskids 2>/dev/null || true

ENV_FILE="/tmp/peskids.env"
doppler secrets download --no-file --format docker --project ops-intcloudsysops --config prd > "$ENV_FILE"
source "${REPO_PATH}/scripts/lib/peskids-docker-env-filter.sh"
filter_peskids_docker_env "$ENV_FILE"

docker run -d --name peskids --restart unless-stopped \
  --network traefik-public \
  -p 127.0.0.1:3004:3004 \
  --env-file "$ENV_FILE" \
  "$IMAGE"

echo "Waiting 3 seconds for startup..."
sleep 3
curl -sf http://127.0.0.1:3004/api/health && echo "✅ Health OK" || echo "⚠️  Health check failed"
docker logs peskids | tail -5
REMOTE
then
  echo ""
  echo "✅ DEPLOY SUCCESSFUL!"
  echo ""
  echo "🔗 Check it out:"
  echo "   - Local:  http://127.0.0.1:3004"
  echo "   - Public: https://peskids.op-sly.com"
else
  echo ""
  echo "❌ DEPLOY FAILED"
  echo "Troubleshoot with: bash scripts/peskids-deploy-vps-diagnose.sh"
  exit 1
fi
