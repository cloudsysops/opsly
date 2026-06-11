#!/usr/bin/env bash
# Emergency VPS deployment diagnostic + fix
# Ejecutar: bash scripts/peskids-deploy-vps-diagnose.sh

set -euo pipefail

VPS_HOST="vps-dragon@100.120.151.91"
IMAGE="${PESKIDS_IMAGE:-ghcr.io/cloudsysops/peskids:latest}"
REPO_PATH="/opt/opsly"

echo "🔍 Diagnosticando deploy de Peskids..."
echo ""

# Test 1: SSH connectivity
echo "1️⃣  SSH Connectivity..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes "$VPS_HOST" "echo ok" &>/dev/null; then
  echo "   ✅ SSH OK"
else
  echo "   ❌ SSH FAILED — Check Tailscale / VPS_SSH_KEY"
  exit 1
fi

# Test 2: Docker service
echo "2️⃣  Docker Service..."
if ssh "$VPS_HOST" "docker ps > /dev/null 2>&1" &>/dev/null; then
  echo "   ✅ Docker daemon running"
else
  echo "   ❌ Docker FAILED — Docker daemon not running"
  echo "   Fix: ssh $VPS_HOST 'systemctl start docker'"
  exit 1
fi

# Test 3: GHCR access (without credentials)
echo "3️⃣  GHCR Registry Access..."
GHCR_TEST=$(ssh "$VPS_HOST" "curl -sf https://ghcr.io/v2/ > /dev/null 2>&1 && echo ok || echo fail")
if [ "$GHCR_TEST" = "ok" ]; then
  echo "   ✅ GHCR reachable"
else
  echo "   ⚠️  GHCR not reachable (network issue?)"
fi

# Test 4: Current image status
echo "4️⃣  Image Status..."
IMAGE_EXISTS=$(ssh "$VPS_HOST" "docker images | grep peskids | wc -l")
if [ "$IMAGE_EXISTS" -gt 0 ]; then
  echo "   ℹ️  Local image exists ($IMAGE_EXISTS versions found)"
  ssh "$VPS_HOST" "docker images | grep peskids"
else
  echo "   ℹ️  No local image — will need to pull"
fi

# Test 5: Doppler availability
echo "5️⃣  Doppler CLI..."
if ssh "$VPS_HOST" "which doppler" &>/dev/null; then
  echo "   ✅ doppler installed"
else
  echo "   ❌ doppler NOT installed"
  echo "   Fix: ssh $VPS_HOST 'curl -Ls https://cli.doppler.com/install.sh | sudo bash'"
  exit 1
fi

# Test 6: Docker login to GHCR
echo "6️⃣  GHCR Docker Login..."
read -sp "GitHub token with packages:read scope: " GITHUB_TOKEN
echo ""
if ssh "$VPS_HOST" "echo '$GITHUB_TOKEN' | docker login ghcr.io -u oauth2accesstoken --password-stdin" &>/dev/null; then
  echo "   ✅ GHCR login successful"
else
  echo "   ❌ GHCR login FAILED"
  echo "   Possible fixes:"
  echo "     - Token expired: regenerate in GitHub"
  echo "     - Wrong token: must have 'read:packages' scope"
  exit 1
fi

# Test 7: Docker pull
echo "7️⃣  Docker Pull $IMAGE..."
if ssh "$VPS_HOST" "docker pull $IMAGE" 2>&1 | tail -5; then
  echo "   ✅ Pull successful"
else
  echo "   ❌ Pull FAILED"
  exit 1
fi

echo ""
echo "✅ All checks passed. Ready to deploy."
echo ""
echo "Deploy Peskids:"
echo "  cd /opt/opsly"
echo "  docker stop peskids 2>/dev/null || true"
echo "  docker rm peskids 2>/dev/null || true"
echo "  PESKIDS_IMAGE=$IMAGE bash scripts/peskids-deploy-vps.sh"
