#!/usr/bin/env bash
# LEGACY — ICSO GoHighLevel status (agency location).
# Operational lead capture uses Twenty + Supabase; see docs/tenants/intcloudsysops/TWENTY-CRM.md
# Requires INTCLOUDSYSOPS_GHL_ENABLED=true for app-sidecar; this script only audits GHL API resources.

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== ICSO GoHighLevel Status ===${NC}\n"

# Check environment configuration
echo -e "${BLUE}1. Checking GHL Configuration${NC}"

if [ -z "$GOHIGHLEVEL_API_KEY" ]; then
  echo -e "${RED}✗ GOHIGHLEVEL_API_KEY not set${NC}"
  echo "  Run: doppler run --project ops-intcloudsysops --config prd -- bash"
  exit 1
fi

if [ -z "$GOHIGHLEVEL_LOCATION_ID" ]; then
  echo -e "${RED}✗ GOHIGHLEVEL_LOCATION_ID not set${NC}"
  echo "  Expected: qD7Z9jt3owk0LMtKElow"
  exit 1
fi

echo -e "${GREEN}✓ GHL credentials configured${NC}"
echo "  Location ID: $GOHIGHLEVEL_LOCATION_ID"

# Check required resources
echo -e "\n${BLUE}2. Checking Required GHL Resources${NC}"

# Create a temporary script to query GHL
cat > /tmp/check-ghl.ts << 'EOF'
import { GoHighLevelClient, resolveGoHighLevelEnv } from '@intcloudsysops/services/gohighlevel';

const ghlEnv = resolveGoHighLevelEnv();
const client = new GoHighLevelClient(ghlEnv.apiKey, ghlEnv.baseUrl, {
  locationId: ghlEnv.locationId,
  apiVersion: ghlEnv.apiVersion,
});

async function checkResources() {
  console.log('Checking pipelines...');
  const pipelines = await client.listPipelines();
  const salesPipeline = pipelines.find(p => p.name.includes('Opsly Agency Sales'));
  console.log(JSON.stringify({ salesPipeline: !!salesPipeline, pipelines: pipelines.map(p => p.name) }, null, 2));

  console.log('Checking calendars...');
  const calendars = await client.listCalendars();
  const discoveryCal = calendars.find(c => c.name.includes('Discovery Call'));
  console.log(JSON.stringify({ discoveryCal: !!discoveryCal, calendars: calendars.map(c => c.name) }, null, 2));

  console.log('Checking forms...');
  const forms = await client.listForms();
  const leadForm = forms.find(f => f.name.includes('Opsly Agency Lead Capture'));
  console.log(JSON.stringify({ leadForm: !!leadForm, forms: forms.map(f => f.name) }, null, 2));
}

checkResources().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
EOF

# Use npx to run the TypeScript check
echo "Querying GHL API..."
npx tsx /tmp/check-ghl.ts 2>/dev/null || true

echo -e "\n${BLUE}3. ICSO Configuration Summary${NC}"
echo "Contact Form Endpoint: /api/leads (POST) — Supabase + Twenty primary"
echo "Legacy GHL sidecar: INTCLOUDSYSOPS_GHL_ENABLED (default false)"
echo "Source Tag: 'lead-web' (legacy GHL provisioning docs)"
echo "Target Pipeline: Opsly Agency Sales → New Lead (legacy)"
echo "Discovery Calendar: NEXT_PUBLIC_ICSO_DISCOVERY_BOOKING_URL or legacy GHL calendar"

echo -e "\n${BLUE}4. Testing Lead Creation${NC}"
echo "To test: POST /api/leads with { name, email, message } (requires Supabase env)"
echo "Example: curl -X POST http://localhost:3015/api/leads \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"name\":\"Test User\",\"email\":\"test@example.com\",\"message\":\"Test lead\"}'"

echo -e "\n${GREEN}✓ ICSO GHL legacy audit complete (not required for Twenty primary path)${NC}"

# Cleanup
rm -f /tmp/check-ghl.ts
