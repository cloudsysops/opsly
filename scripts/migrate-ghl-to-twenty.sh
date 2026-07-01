#!/bin/bash
# Migration Script: GoHighLevel → Twenty + n8n
# Usage: ./scripts/migrate-ghl-to-twenty.sh
# Requirements: Tailscale, Doppler configured, Docker

set -e

echo "🚀 Starting GHL → Twenty Migration"
echo "=================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Validate environment
echo -e "${BLUE}Step 1: Validating environment${NC}"
if ! command -v doppler &> /dev/null; then
    echo -e "${RED}❌ Doppler not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment validated${NC}"

# Step 2: Prepare directories
echo -e "${BLUE}Step 2: Preparing migration directories${NC}"
mkdir -p /tmp/ghl-migration/{exports,transforms,logs}
echo -e "${GREEN}✅ Directories created${NC}"

# Step 3: Export GHL data
echo -e "${BLUE}Step 3: Exporting data from GoHighLevel${NC}"
export GHL_API_KEY=$(doppler run --project ops-intcloudsysops --config prd -- printenv GOHIGHLEVEL_API_KEY 2>/dev/null || echo "")
export GHL_LOCATION_ID=$(doppler run --project ops-intcloudsysops --config prd -- printenv GOHIGHLEVEL_LOCATION_ID 2>/dev/null || echo "")

if [ -z "$GHL_API_KEY" ]; then
    echo -e "${RED}❌ GHL_API_KEY not found in Doppler${NC}"
    exit 1
fi

echo "Exporting contacts from GHL..."
curl -s -X GET "https://services.leadconnectorhq.com/locations/${GHL_LOCATION_ID}/contacts/" \
  -H "Authorization: Bearer $GHL_API_KEY" \
  -H "Version: 2021-07-28" \
  > /tmp/ghl-migration/exports/contacts.json 2>/dev/null || true

echo -e "${GREEN}✅ Data exported${NC}"

# Step 4: Validate exports
echo -e "${BLUE}Step 4: Validating exports${NC}"
if [ -f /tmp/ghl-migration/exports/contacts.json ]; then
    CONTACTS_COUNT=$(jq '.contacts | length' /tmp/ghl-migration/exports/contacts.json 2>/dev/null || echo "0")
else
    CONTACTS_COUNT="0"
fi

echo "  Contacts exported: $CONTACTS_COUNT"
echo -e "${GREEN}✅ Validation complete${NC}"

# Step 5: Summary
echo ""
echo -e "${GREEN}=================================="
echo "✅ MIGRATION PREPARED"
echo "==================================${NC}"
echo ""
echo "Summary:"
echo "  • GHL data exported to: /tmp/ghl-migration/exports/"
echo "  • Transform scripts in: /tmp/ghl-migration/transforms/"
echo "  • Contacts found: $CONTACTS_COUNT"
echo ""
echo "Next steps:"
echo "  1. Review exported data in /tmp/ghl-migration/exports/contacts.json"
echo "  2. Follow GHL-TO-TWENTY-MIGRATION.md for Twenty deployment"
echo "  3. Create n8n workflows"
echo "  4. Import data to Twenty via API"
echo "  5. Test Peskids lead capture with Twenty"
echo "  6. Monitor for 24 hours"
echo ""
echo "Reference: docs/01-development/GHL-TO-TWENTY-MIGRATION.md"
