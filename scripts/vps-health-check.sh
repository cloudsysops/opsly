#!/bin/bash
# VPS Health Check via Tailscale
# Usage: ./scripts/vps-health-check.sh

set -e

VPS_HOST="${VPS_HOST:-vps-dragon@100.120.151.91}"

echo "🔍 Conectando a VPS: $VPS_HOST"
echo ""

# 1. DOCKER
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 DOCKER CONTAINERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh -o BatchMode=no "$VPS_HOST" "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# 2. SISTEMA
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SISTEMA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$VPS_HOST" "echo '⏱️  Uptime:' && uptime && echo '' && echo '💾 Memoria:' && free -h | head -2 && echo '' && echo '💿 Disco:' && df -h | grep -E '^/dev|Mounted|vda'"

# 3. REDIS
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 REDIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$VPS_HOST" "docker exec redis redis-cli ping 2>/dev/null && docker exec redis redis-cli dbsize 2>/dev/null || echo '❌ Redis no responde'"

# 4. API HEALTH
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 API HEALTH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$VPS_HOST" "curl -s http://localhost:3000/api/health | jq . 2>/dev/null || echo '❌ API no responde en :3000'"

# 5. LOGS RECIENTES
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 LOGS RECIENTES (API)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$VPS_HOST" "cd /opt/opsly && docker compose -f infra/docker-compose.platform.yml logs --tail=10 api 2>/dev/null || echo '❌ No logs disponibles'"

# 6. ORCHESTRATOR JOBS
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  ORCHESTRATOR QUEUES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$VPS_HOST" "docker exec redis redis-cli llen openclaw 2>/dev/null | awk '{print \"Jobs en cola openclaw: \" \$1}' || echo '❌ No se pudo verificar'"

# 7. UFW FIREWALL
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 FIREWALL (UFW)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$VPS_HOST" "sudo ufw status | head -20"

# 8. TAILSCALE
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛜 TAILSCALE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$VPS_HOST" "tailscale status | head -5"

echo ""
echo "✅ Health check completado"
