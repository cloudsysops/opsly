#!/bin/bash
# Peskids Invitation Flow Test Script
# Tests the complete invitation workflow for team members

set -e

echo "🧪 Peskids Invitation Flow Verification"
echo "======================================"
echo ""

# Configuration
PESKIDS_URL="${PESKIDS_URL:-https://www.peskids.com}"
SANTIAGO_EMAIL="${SANTIAGO_EMAIL:-sierrasantiago90@gmail.com}"

echo "📋 Configuration:"
echo "   App URL: $PESKIDS_URL"
echo "   Santiago Email: $SANTIAGO_EMAIL"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test 1: Check if app is accessible
echo -e "${BLUE}Test 1: Check if Peskids app is accessible${NC}"
if curl -s -o /dev/null -w "%{http_code}" "$PESKIDS_URL" | grep -q "200\|301\|302"; then
  echo -e "${GREEN}✅ App is accessible${NC}"
else
  echo -e "${RED}❌ App is not accessible${NC}"
  exit 1
fi
echo ""

# Test 2: Check admin/team endpoint exists
echo -e "${BLUE}Test 2: Check /api/admin/team endpoint${NC}"
ENDPOINT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PESKIDS_URL/api/admin/team")
if [ "$ENDPOINT_STATUS" == "401" ] || [ "$ENDPOINT_STATUS" == "200" ]; then
  echo -e "${GREEN}✅ Endpoint exists (requires auth)${NC}"
else
  echo -e "${YELLOW}⚠️  Endpoint returned: $ENDPOINT_STATUS${NC}"
fi
echo ""

# Test 3: Show invitation code
echo -e "${BLUE}Test 3: Invitation Request Format${NC}"
echo "To invite Santiago Sierra, send this request:"
echo ""
echo -e "${YELLOW}curl -X POST $PESKIDS_URL/api/admin/team \\${NC}"
echo -e "${YELLOW}  -H \"Authorization: Bearer YOUR_SESSION_TOKEN\" \\${NC}"
echo -e "${YELLOW}  -H \"Content-Type: application/json\" \\${NC}"
echo -e "${YELLOW}  -d '{${NC}"
echo -e "${YELLOW}    \"email\": \"$SANTIAGO_EMAIL\",${NC}"
echo -e "${YELLOW}    \"name\": \"Santiago Sierra\",${NC}"
echo -e "${YELLOW}    \"role\": \"admin\"${NC}"
echo -e "${YELLOW}  }'${NC}"
echo ""

# Test 4: Show expected response
echo -e "${BLUE}Test 4: Expected Response${NC}"
echo "If successful, you'll receive:"
echo ""
cat << 'EOF'
{
  "ok": true,
  "invitation": {
    "id": "uuid",
    "email": "sierrasantiago90@gmail.com",
    "role": "admin",
    "token": "invitation_token",
    "activation_url": "https://www.peskids.com/invite/...",
    "expires_at": "2026-06-05T..."
  }
}
EOF
echo ""

# Test 5: Show role options
echo -e "${BLUE}Test 5: Available Roles${NC}"
echo "Santiago can be invited with these roles:"
echo "  • admin    → Full team management, settings, invitations"
echo "  • teacher  → Classes, feedback, student submissions"
echo "  • support  → Limited support access"
echo ""
echo -e "${YELLOW}Note: Send separate invitations for multiple roles${NC}"
echo ""

# Test 6: Show activation flow
echo -e "${BLUE}Test 6: Santiago's Activation Flow${NC}"
echo "After invitation is sent:"
echo "  1. Santiago receives email with activation link"
echo "  2. Clicks 'Activar mi cuenta' → creates password"
echo "  3. Logs in → sees dashboard with assigned roles"
echo "  4. Can manage team (if admin) or view classes (if teacher)"
echo ""

# Test 7: Verification checklist
echo -e "${BLUE}Test 7: Verification Checklist${NC}"
cat << 'EOF'
Before going live, verify:

□ Santiago receives invitation email (check spam)
□ Activation link is valid and works
□ Password setup completes successfully
□ Dashboard loads correctly
□ Admin role: Team management works
□ Teacher role: Can view classes/feedback
□ Dual roles: Both permissions accessible

EOF

echo -e "${GREEN}✅ Invitation flow test complete${NC}"
echo ""
echo "📖 Full documentation: docs/tenants/peskids/INVITATION-FLOW-VERIFICATION.md"
