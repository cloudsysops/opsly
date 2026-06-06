#!/bin/bash
# Peskids Production Deployment Script
# Run from your local machine with SSH access to VPS
# Usage: ./scripts/peskids-production-deploy.sh

set -e

echo "🚀 Peskids Production Deployment"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="${VPS_HOST:-100.120.151.91}"
VPS_USER="${VPS_USER:-vps-dragon}"
TENANT="peskids"

echo -e "${BLUE}Step 1: Verify SSH connectivity${NC}"
if ssh -o ConnectTimeout=5 "$VPS_USER@$VPS_HOST" "echo 'SSH OK'" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ SSH connection successful${NC}"
else
  echo -e "${RED}❌ Cannot connect to VPS at $VPS_USER@$VPS_HOST${NC}"
  echo "Make sure:"
  echo "1. You have Tailscale installed and connected"
  echo "2. You're on the same Tailscale network"
  echo "3. VPS IP is reachable: ping $VPS_HOST"
  exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Deploy N8N container${NC}"
./scripts/setup-n8n-tenant.sh --vps-host "$VPS_HOST" --tenant "$TENANT"

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ N8N deployment failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ N8N container deployed${NC}"

echo ""
echo -e "${BLUE}Step 3: Verify N8N is running${NC}"
sleep 5  # Wait for container to start

if ssh "$VPS_USER@$VPS_HOST" "docker ps | grep tenant_peskids" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ N8N container is running${NC}"
else
  echo -e "${RED}❌ N8N container failed to start${NC}"
  echo "Check logs: ssh $VPS_USER@$VPS_HOST 'docker logs tenant_peskids'"
  exit 1
fi

echo ""
echo -e "${BLUE}Step 4: Test N8N webhook access${NC}"
for i in {1..5}; do
  if curl -s https://peskids.op-sly.com/n8n/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ N8N dashboard accessible${NC}"
    break
  fi
  echo "Waiting for N8N to be ready... ($i/5)"
  sleep 3
done

echo ""
echo -e "${YELLOW}📋 NEXT STEPS (Manual, ~60 minutes):${NC}"
echo ""
echo "1. Create lead-capture workflow:"
echo "   - Go to: https://peskids.op-sly.com/n8n/"
echo "   - Create new workflow"
echo "   - Trigger: HTTP Webhook (POST)"
echo "   - Action: Insert to Supabase 'peskids.leads'"
echo "   - Save webhook URL → add to .env.local as NEXT_PUBLIC_N8N_LEAD_WEBHOOK"
echo ""
echo "2. Create hot-lead-alert workflow (optional):"
echo "   - Trigger: Database polling (every 5 min)"
echo "   - Query: SELECT new leads from last 5 minutes"
echo "   - Action: Send Slack message"
echo ""
echo "3. Apply RLS policies:"
echo "   - Go to: https://app.supabase.com/project/jkwykpldnitavhmtuzmo/sql"
echo "   - Paste contents of: docs/tenants/peskids/PHASE-2-WEEK-1-RLS-POLICIES.sql"
echo "   - Click Run"
echo ""
echo "See full guide: docs/tenants/peskids/PHASE-2-WEEK-1-HANDOFF-FOR-VPS-EXECUTION.md"
echo ""
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo "Infrastructure is ready. Complete manual steps above for 100% production ready."
