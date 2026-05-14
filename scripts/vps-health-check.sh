#!/bin/bash
# VPS Health Check via Tailscale
# Requires: SSH access via Tailscale, VPS_SSH env var or Doppler REDIS_PASSWORD
# Usage: VPS_SSH=vps-dragon@100.120.151.91 ./scripts/vps-health-check.sh
# Or:    doppler run --project ops-intcloudsysops --config prd -- ./scripts/vps-health-check.sh

set -e

# Required: VPS_SSH must be set (no hardcoded IP per AGENTS.md)
if [[ -z "${VPS_SSH:-}" ]]; then
  echo "❌ Error: VPS_SSH environment variable not set"
  echo "Usage: VPS_SSH=vps-dragon@100.120.151.91 $0"
  exit 1
fi

REDIS_CONTAINER="${REDIS_CONTAINER:-infra-redis-1}"
QUEUE_NAME="${QUEUE_NAME:-openclaw}"

echo "🔍 Conectando a VPS: $VPS_SSH"
echo ""

# Helper: redis-cli with password auth via Doppler
rcli() {
  local cmd="$*"
  if [[ -n "${REDIS_PASSWORD:-}" ]]; then
    local pw_b64
    pw_b64=$(printf '%s' "${REDIS_PASSWORD}" | base64 | tr -d '\n')
    # shellcheck disable=SC2029
    ssh -o BatchMode=yes -o ConnectTimeout=20 "${VPS_SSH}" \
      "docker exec -e REDISCLI_AUTH=\$(echo '${pw_b64}' | base64 -d) ${REDIS_CONTAINER} redis-cli --no-auth-warning ${cmd}"
  else
    ssh -o BatchMode=yes -o ConnectTimeout=20 "${VPS_SSH}" \
      "docker exec ${REDIS_CONTAINER} redis-cli ${cmd}"
  fi
}

# 1. DOCKER
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 DOCKER CONTAINERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh -o BatchMode=yes -o ConnectTimeout=20 "$VPS_SSH" "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# 2. SISTEMA
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SISTEMA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh -o BatchMode=yes -o ConnectTimeout=20 "$VPS_SSH" "echo '⏱️  Uptime:' && uptime && echo '' && echo '💾 Memoria:' && free -h | head -2 && echo '' && echo '💿 Disco:' && df -h | grep -E '^/dev|Mounted|vda'"

# 3. REDIS (with password auth)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 REDIS (${REDIS_CONTAINER})"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if rcli PING &>/dev/null; then
  echo "✅ Redis PING OK"
  rcli DBSIZE 2>/dev/null || echo "⚠️  Could not get DBSIZE"
else
  echo "❌ Redis not responding"
fi

# 4. API HEALTH
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 API HEALTH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh -o BatchMode=yes -o ConnectTimeout=20 "$VPS_SSH" "curl -s http://localhost:3000/api/health | jq . 2>/dev/null || echo '❌ API no responde en :3000'"

# 5. LOGS RECIENTES
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 LOGS RECIENTES (API)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh -o BatchMode=yes -o ConnectTimeout=20 "$VPS_SSH" "cd /opt/opsly && docker compose -f infra/docker-compose.platform.yml logs --tail=10 api 2>/dev/null || echo '❌ No logs disponibles'"

# 6. BULLMQ QUEUE STATUS (correct Redis keys)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  ORCHESTRATOR QUEUES (${QUEUE_NAME})"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PREFIX="bull:${QUEUE_NAME}"
if WAIT=$(rcli LLEN "${PREFIX}:wait" 2>/dev/null); then
  ACTIVE=$(rcli LLEN "${PREFIX}:active" 2>/dev/null)
  echo "Waiting: ${WAIT}"
  echo "Active:  ${ACTIVE}"
else
  echo "❌ Could not query BullMQ queue status"
fi

# 7. UFW FIREWALL
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 FIREWALL (UFW)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh -o BatchMode=yes -o ConnectTimeout=20 "$VPS_SSH" "sudo ufw status | head -20"

# 8. TAILSCALE
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛜 TAILSCALE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh -o BatchMode=yes -o ConnectTimeout=20 "$VPS_SSH" "tailscale status | head -5"

echo ""
echo "✅ Health check completado"
