#!/usr/bin/env bash
set -euo pipefail

# Deploy Hermes to production candidate on VPS
# Run this: ssh vps-dragon@100.120.151.91 'bash -s' < scripts/deploy-hermes-production.sh

echo "════════════════════════════════════════════════════════════════════════════════"
echo "                    🚀 HERMES PRODUCTION DEPLOYMENT"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color
DRY_RUN=0
COMPOSE_FILE="${COMPOSE_FILE:-infra/docker-compose.mcp.yml}"

run() {
    if [ "$DRY_RUN" -eq 1 ]; then
        echo "[dry-run] $*"
    else
        "$@"
    fi
}

usage() {
    cat <<'EOF'
Usage: deploy-hermes-production.sh [--dry-run]

Options:
  --dry-run   Print commands without executing them
EOF
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
done

# Step 1: Navigate to repo
echo -e "${BLUE}[STEP 1/6]${NC} Navigating to /opt/opsly..."
cd /opt/opsly || exit 1
echo -e "${GREEN}✅ In /opt/opsly${NC}"
echo ""

# Step 2: Git pull
echo -e "${BLUE}[STEP 2/6]${NC} Pulling latest code from main..."
run git pull origin main --ff-only || {
    echo -e "${RED}❌ Git pull failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# Step 3: Check Docker Compose
echo -e "${BLUE}[STEP 3/6]${NC} Checking Docker Compose..."
if ! command -v docker compose >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose ready${NC}"
echo ""

# Step 4: Validate .env.mcp
echo -e "${BLUE}[STEP 4/6]${NC} Checking .env.mcp configuration..."
if [ ! -f .env.mcp ]; then
    echo -e "${RED}❌ .env.mcp not found${NC}"
    echo "Bootstrap env with Doppler/secrets process before deploy."
    exit 1
fi
echo -e "${GREEN}✅ .env.mcp configured${NC}"
echo ""

# Step 5: Start services
echo -e "${BLUE}[STEP 5/6]${NC} Starting 9 services (docker-compose)..."
echo "  Services: MCP Gateway, Agent Manager, Tenant Invitations, Onboarding Agent,"
echo "            Rendering Engine, Rendering Server, PostgreSQL, Redis, Prometheus"
echo ""

run docker compose -f "$COMPOSE_FILE" up -d || {
    echo -e "${RED}❌ Docker Compose failed${NC}"
    docker compose -f "$COMPOSE_FILE" logs --tail=50
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
    if [ "$DRY_RUN" -eq 1 ]; then
        HEALTHY=1
        break
    fi
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
echo "     docker compose -f $COMPOSE_FILE ps"
echo ""
echo "  2. Check service logs:"
echo "     docker compose -f $COMPOSE_FILE logs -f"
echo ""
echo "  3. Invite intcloudsysops tenant:"
echo "     ./scripts/invite-intcloudsysops.sh"
echo ""
echo "  4. Monitor onboarding progress (from your local machine):"
echo "     ./scripts/hermes-tenant-dashboard.sh"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
