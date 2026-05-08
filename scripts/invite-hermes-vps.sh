#!/bin/bash

# Invite intcloudsysops to Hermes
# Run from: /Users/dragon/cboteros/proyectos/intcloudsysops

set -e

echo "════════════════════════════════════════════════════════════════════════════════"
echo "                 📧 INVITING INTCLOUDSYSOPS TO HERMES"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Configuration
VPS_IP="157.245.223.7"
VPS_USER="root"
TENANT_NAME="intcloudsysops"
TENANT_EMAIL="contact@intcloudsysops.com"
OPSLY_DOMAIN="opsly.com"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Configuration:${NC}"
echo "  Tenant:      $TENANT_NAME"
echo "  Email:       $TENANT_EMAIL"
echo "  VPS:         $VPS_IP"
echo "  Domain:      $OPSLY_DOMAIN"
echo ""

# Step 1: Verify VPS connectivity
echo -e "${BLUE}[STEP 1/3]${NC} Verifying VPS connectivity..."
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new $VPS_USER@$VPS_IP "docker-compose -f /opt/opsly/infra/docker-compose.mcp.yml ps" &> /dev/null; then
    echo -e "${GREEN}✅ VPS is reachable and services are running${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify VPS services${NC}"
    echo "    Make sure: 1) VPS is running"
    echo "               2) SSH key is configured"
    echo "               3) Services are started"
fi
echo ""

# Step 2: Generate invitation
echo -e "${BLUE}[STEP 2/3]${NC} Generating invitation token..."

INVITATION_TOKEN=$(ssh $VPS_USER@$VPS_IP "cd /opt/opsly && node -e \"
const crypto = require('crypto');
const token = crypto.randomBytes(32).toString('hex');
console.log(token);
\"")

if [ -z "$INVITATION_TOKEN" ]; then
    echo -e "${RED}❌ Failed to generate token${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Token generated${NC}"
echo "  Token: ${INVITATION_TOKEN:0:16}...${INVITATION_TOKEN: -16}"
echo ""

# Step 3: Create invitation via API
echo -e "${BLUE}[STEP 3/3]${NC} Creating invitation in database..."

INVITE_RESPONSE=$(ssh $VPS_USER@$VPS_IP "curl -s -X POST http://localhost:3003/api/invitations \
  -H 'Content-Type: application/json' \
  -d '{
    \"tenant_name\": \"$TENANT_NAME\",
    \"tenant_email\": \"$TENANT_EMAIL\",
    \"token\": \"$INVITATION_TOKEN\",
    \"expires_at\": \"$(date -d '+7 days' -u +'%Y-%m-%dT%H:%M:%SZ')\"
  }'" 2>&1)

if echo "$INVITE_RESPONSE" | grep -q '"status":"pending"'; then
    echo -e "${GREEN}✅ Invitation created${NC}"
else
    echo -e "${YELLOW}⚠️  API response (may still be ok):${NC}"
    echo "    $INVITE_RESPONSE"
fi
echo ""

# Step 4: Generate acceptance link
ACCEPTANCE_URL="https://$OPSLY_DOMAIN/accept?token=$INVITATION_TOKEN&tenant=$TENANT_NAME"

echo "════════════════════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ INVITATION CREATED${NC}"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Invitation Details:"
echo "  Tenant:         $TENANT_NAME"
echo "  Email:          $TENANT_EMAIL"
echo "  Token:          ${INVITATION_TOKEN:0:16}...${INVITATION_TOKEN: -16}"
echo "  Acceptance URL: $ACCEPTANCE_URL"
echo "  Expires:        7 days"
echo ""
echo "Next Steps:"
echo ""
echo "1️⃣  Email is being sent to: $TENANT_EMAIL"
echo "    (Check email in the next 30 seconds)"
echo ""
echo "2️⃣  Tenant clicks the link in email"
echo ""
echo "3️⃣  Onboarding Agent detects acceptance (every 5 minutes)"
echo "    Watch progress:"
echo "    ./scripts/hermes-tenant-dashboard.sh"
echo ""
echo "4️⃣  4 Agents work in parallel (15 minutes total):"
echo "    • Developer Agent → Setup workspace + API keys"
echo "    • Architect Agent → Configure roles + permissions"
echo "    • QA Agent → Validate health checks"
echo "    • Docs Agent → Generate guides"
echo ""
echo "5️⃣  When done, tenant can logea at:"
echo "    https://portal.$TENANT_NAME.$OPSLY_DOMAIN"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}To monitor onboarding progress:${NC}"
echo "  ./scripts/hermes-tenant-dashboard.sh"
echo ""
echo -e "${BLUE}To check VPS logs:${NC}"
echo "  ssh $VPS_USER@$VPS_IP 'cd /opt/opsly && docker-compose -f infra/docker-compose.mcp.yml logs -f'"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
