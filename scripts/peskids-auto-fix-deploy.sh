#!/usr/bin/env bash
# Automated VPS deploy fix - handles GHCR login and docker issues
# No interactive input required

set -euo pipefail

VPS_HOST="vps-dragon@100.120.151.91"
IMAGE="${PESKIDS_IMAGE:-ghcr.io/cloudsysops/peskids:latest}"
REPO_PATH="/opt/opsly"

echo "🔧 Automated Peskids VPS Deploy Fix"
echo "   Image: $IMAGE"
echo "   VPS:   $VPS_HOST"
echo ""

# Step 1: Verify SSH access
echo "1️⃣ Checking SSH connectivity..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$VPS_HOST" "echo ok" &>/dev/null; then
  echo "❌ SSH failed - Check Tailscale/VPS_SSH_KEY"
  exit 1
fi
echo "   ✅ SSH OK"

# Step 2: Check Docker
echo "2️⃣ Checking Docker daemon..."
if ! ssh "$VPS_HOST" "docker ps > /dev/null 2>&1"; then
  echo "   ⚠️  Docker daemon may not be running"
  echo "   Attempting restart..."
  ssh "$VPS_HOST" "sudo systemctl restart docker" || true
  sleep 5
fi
echo "   ✅ Docker OK"

# Step 3: Logout and re-login (clear cache)
echo "3️⃣ Clearing Docker credentials cache..."
ssh "$VPS_HOST" "docker logout ghcr.io 2>/dev/null || true" || true
echo "   ✅ Cache cleared"

# Step 4: Check image exists locally
echo "4️⃣ Checking for local image..."
LOCAL_IMAGE=$(ssh "$VPS_HOST" "docker images --filter 'reference=ghcr.io/cloudsysops/peskids*' -q | head -1" || echo "")
if [ -n "$LOCAL_IMAGE" ]; then
  echo "   ℹ️  Found local image: $LOCAL_IMAGE"
  echo "   Will use local image (skip pull)"
  USE_LOCAL=1
else
  echo "   ℹ️  No local image, will pull from GHCR"
  USE_LOCAL=0
fi

# Step 5: Deploy (with or without pull)
echo "5️⃣ Deploying container..."

if [ "$USE_LOCAL" -eq 1 ]; then
  echo "   Using local image (faster)"
  DEPLOY_IMAGE="$LOCAL_IMAGE"
else
  echo "   Pulling from GHCR (with retry)..."
  # Try pull with exponential backoff
  DEPLOY_IMAGE="$IMAGE"
  for attempt in 1 2 3; do
    if ssh "$VPS_HOST" "docker pull '$DEPLOY_IMAGE'" 2>&1 | tail -3; then
      echo "   ✅ Pull successful on attempt $attempt"
      break
    fi
    if [ $attempt -lt 3 ]; then
      wait_time=$((2 ** attempt))
      echo "   ⚠️  Pull failed, retrying in ${wait_time}s..."
      sleep "$wait_time"
    else
      echo "   ❌ Pull failed after 3 attempts"
      exit 1
    fi
  done
fi

# Step 6: Stop old container
echo "6️⃣ Stopping old container..."
ssh "$VPS_HOST" "docker stop peskids 2>/dev/null || true" || true
ssh "$VPS_HOST" "docker rm peskids 2>/dev/null || true" || true
echo "   ✅ Old container removed"

# Step 7: Get environment from Doppler
echo "7️⃣ Downloading environment..."
ENV_FILE=$(ssh "$VPS_HOST" "mktemp" || echo "/tmp/peskids.env")
ssh "$VPS_HOST" "doppler secrets download --no-file --format docker --project ops-intcloudsysops --config prd > '$ENV_FILE' && source '$REPO_PATH/scripts/lib/peskids-docker-env-filter.sh' && filter_peskids_docker_env '$ENV_FILE'" || {
  echo "   ❌ Doppler failed"
  exit 1
}
echo "   ✅ Environment ready"

# Step 8: Start container
echo "8️⃣ Starting container..."
ssh "$VPS_HOST" "docker run -d --name peskids --restart unless-stopped \
  --network traefik-public \
  -p 127.0.0.1:3004:3004 \
  --env-file '$ENV_FILE' \
  '$DEPLOY_IMAGE'" || {
  echo "   ❌ Container start failed"
  exit 1
}
echo "   ✅ Container started"

# Step 9: Health check
echo "9️⃣ Health check..."
sleep 3
for attempt in 1 2 3 4 5; do
  if ssh "$VPS_HOST" "curl -sf http://127.0.0.1:3004/api/health > /dev/null" 2>/dev/null; then
    echo "   ✅ Container healthy (attempt $attempt)"
    break
  fi
  if [ $attempt -lt 5 ]; then
    echo "   ⏳ Waiting for container... (attempt $attempt/5)"
    sleep 3
  else
    echo "   ⚠️  Health check failed after 5 attempts"
    echo "   Checking logs..."
    ssh "$VPS_HOST" "docker logs peskids 2>&1 | tail -10" || true
  fi
done

echo ""
echo "✅ DEPLOY COMPLETE!"
echo ""
echo "🔗 Verify:"
echo "   Local:  http://127.0.0.1:3004"
echo "   Public: https://peskids.op-sly.com"
echo ""
echo "📊 Status:"
ssh "$VPS_HOST" "docker ps --filter name=peskids --format 'table {{.Names}}\t{{.Status}}'"
