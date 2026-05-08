#!/bin/bash
set -e

# Deploy Hermes to Production on VPS
# Run this: ssh user@157.245.223.7 'bash -s' < scripts/deploy-hermes-production.sh

echo "════════════════════════════════════════════════════════════════════════════════"
echo "                    🚀 HERMES PRODUCTION DEPLOYMENT"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Navigate to repo
echo -e "${BLUE}[STEP 1/6]${NC} Navigating to /opt/opsly..."
cd /opt/opsly || exit 1
echo -e "${GREEN}✅ In /opt/opsly${NC}"
echo ""

# Step 2: Git pull
echo -e "${BLUE}[STEP 2/6]${NC} Pulling latest code from main..."
git pull origin main --ff-only || {
    echo -e "${RED}❌ Git pull failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# Step 3: Check Docker Compose
echo -e "${BLUE}[STEP 3/6]${NC} Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose ready${NC}"
echo ""

# Step 4: Create .env.mcp if needed
echo -e "${BLUE}[STEP 4/6]${NC} Checking .env.mcp configuration..."
if [ ! -f .env.mcp ]; then
    echo -e "${RED}⚠️  .env.mcp not found. Creating template...${NC}"
    cat > .env.mcp << 'ENVEOF'
# Hermes MCP Configuration
NODE_ENV=production
LOG_LEVEL=info

# Email Configuration (required for invitations)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_SECURE=true
EMAIL_FROM=Hermes <hermes@opsly.com>

# Discord Webhook (required for approvals)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# Database
DATABASE_URL=postgresql://postgres:postgres@infra-postgres:5432/hermes_db

# Redis
REDIS_URL=redis://infra-redis-1:6379/0

# Services
OPSLY_API_URL=http://infra-app-1:3000
OPSLY_ORCHESTRATOR_URL=http://opsly_orchestrator:3002

# Rendering
RENDER_TIMEOUT=300
RENDER_MAX_SIZE_MB=500
RENDER_CACHE_DIR=/tmp/hermes-renders

# Agent Configuration
AGENT_ARCHITECT_ENABLED=true
AGENT_DEVELOPER_ENABLED=true
AGENT_QA_ENABLED=true
AGENT_SECURITY_ENABLED=true
AGENT_DOCS_ENABLED=true
AGENT_ONBOARDING_ENABLED=true

# Onboarding Agent Cron
ONBOARDING_CRON_SCHEDULE=*/5 * * * *

ENVEOF
    echo -e "${BLUE}⚠️  Please update .env.mcp with your email and Discord webhook:${NC}"
    echo "    nano .env.mcp"
    echo ""
    echo -e "${BLUE}Then re-run this script.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ .env.mcp configured${NC}"
echo ""

# Step 5: Start services
echo -e "${BLUE}[STEP 5/6]${NC} Starting 9 services (docker-compose)..."
echo "  Services: MCP Gateway, Agent Manager, Tenant Invitations, Onboarding Agent,"
echo "            Rendering Engine, Rendering Server, PostgreSQL, Redis, Prometheus"
echo ""

docker-compose -f infra/docker-compose.mcp.yml up -d || {
    echo -e "${RED}❌ Docker Compose failed${NC}"
    docker-compose -f infra/docker-compose.mcp.yml logs --tail=50
    exit 1
}

echo -e "${GREEN}✅ Services started${NC}"
echo ""

# Step 6: Verify health
echo -e "${BLUE}[STEP 6/6]${NC} Verifying service health..."
echo "  (Waiting 5 seconds for services to stabilize...)"
sleep 5

HEALTHY=0
for i in {1..10}; do
    if curl -s http://localhost:3001/health | grep -q '"status":"ok"'; then
        HEALTHY=1
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
if [ $HEALTHY -eq 1 ]; then
    echo -e "${GREEN}✅ MCP Gateway responding${NC}"
else
    echo -e "${RED}⚠️  Gateway not responding yet. Services may still be starting.${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ HERMES DEPLOYMENT COMPLETE${NC}"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Verify all services are running:"
echo "     docker-compose -f infra/docker-compose.mcp.yml ps"
echo ""
echo "  2. Check service logs:"
echo "     docker-compose -f infra/docker-compose.mcp.yml logs -f"
echo ""
echo "  3. Invite intcloudsysops tenant:"
echo "     ./scripts/invite-intcloudsysops.sh"
echo ""
echo "  4. Monitor onboarding progress (from your local machine):"
echo "     ./scripts/hermes-tenant-dashboard.sh"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
