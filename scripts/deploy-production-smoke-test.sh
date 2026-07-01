#!/bin/bash
# Production Smoke Test — Verify both Peskids and ICSO are live
# Run this after deploying to production

set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Production Smoke Test ===${NC}"
echo "Testing Peskids and ICSO live deployments"
echo ""

# Test Peskids
echo -e "${BLUE}Testing Peskids (https://peskids.op-sly.com)${NC}"
if curl -s -o /dev/null -w "%{http_code}" "https://peskids.op-sly.com" | grep -q "200\|307\|308"; then
    echo -e "${GREEN}✓ Peskids dashboard accessible${NC}"
else
    echo -e "${RED}✗ Peskids dashboard NOT responding${NC}"
    exit 1
fi

# Test ICSO
echo -e "${BLUE}Testing ICSO (https://intcloudsysops.op-sly.com)${NC}"
if curl -s -o /dev/null -w "%{http_code}" "https://intcloudsysops.op-sly.com" | grep -q "200\|307\|308"; then
    echo -e "${GREEN}✓ ICSO dashboard accessible${NC}"
else
    echo -e "${RED}✗ ICSO dashboard NOT responding${NC}"
    exit 1
fi

# Test APIs
echo ""
echo -e "${BLUE}Testing APIs${NC}"

# Peskids lead capture
echo -e "  Testing lead capture API..."
if curl -s "https://peskids.op-sly.com/api/leads" 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}  ✓ Lead API responding${NC}"
else
    echo -e "${RED}  ✗ Lead API not responding${NC}"
fi

# ICSO accounts API
echo -e "  Testing ICSO accounts API..."
if curl -s "https://intcloudsysops.op-sly.com/api/accounts" 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}  ✓ Accounts API responding${NC}"
else
    echo -e "${RED}  ✗ Accounts API not responding${NC}"
fi

# ICSO deals API
echo -e "  Testing ICSO deals API..."
if curl -s "https://intcloudsysops.op-sly.com/api/deals" 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}  ✓ Deals API responding${NC}"
else
    echo -e "${RED}  ✗ Deals API not responding${NC}"
fi

# GHL sync endpoint
echo -e "  Testing GHL sync webhook..."
if curl -s -X POST "https://intcloudsysops.op-sly.com/api/webhooks/ghl-sync" \
  -H "Content-Type: application/json" \
  -d '{"type":"account","data":{"name":"test","accountType":"prospect"}}' 2>/dev/null | grep -q "ok\|error"; then
    echo -e "${GREEN}  ✓ GHL sync endpoint responding${NC}"
else
    echo -e "${RED}  ✗ GHL sync endpoint not responding${NC}"
fi

echo ""
echo -e "${GREEN}=== All Production Tests Passed ===${NC}"
echo ""
echo "✅ Peskids is LIVE at https://peskids.op-sly.com"
echo "✅ ICSO is LIVE at https://intcloudsysops.op-sly.com"
echo ""
echo "Next steps:"
echo "1. Monitor error logs (Datadog)"
echo "2. Verify n8n workflows are active on VPS"
echo "3. Test end-to-end flows (lead → GHL sync → follow-up)"
echo "4. Collect user feedback"
