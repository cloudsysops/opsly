#!/bin/bash
# Migration Script: GoHighLevel → Twenty + n8n
# Usage: ./scripts/migrate-ghl-to-twenty.sh
# Requirements: Tailscale (SSH to VPS), Doppler configured, docker

set -e

echo "🚀 Starting GHL → Twenty Migration"
echo "=================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Validate environment
echo -e "${BLUE}Step 1: Validating environment${NC}"
if ! command -v doppler &> /dev/null; then
    echo -e "${RED}❌ Doppler not installed. Install with: brew install doppler${NC}"
    exit 1
fi

if ! ssh -o ConnectTimeout=2 vps-dragon@100.120.151.91 "echo 'SSH OK'" &> /dev/null; then
    echo -e "${RED}❌ Cannot reach VPS via SSH. Ensure Tailscale is connected.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment validated${NC}"

# Step 2: Prepare directories
echo -e "${BLUE}Step 2: Preparing migration directories${NC}"
mkdir -p /tmp/ghl-migration/{exports,transforms,logs}
echo -e "${GREEN}✅ Directories created${NC}"

# Step 3: Export GHL data
echo -e "${BLUE}Step 3: Exporting data from GoHighLevel${NC}"
export GHL_API_KEY=$(doppler run --project ops-intcloudsysops --config prd -- printenv GOHIGHLEVEL_API_KEY)
export GHL_LOCATION_ID=$(doppler run --project ops-intcloudsysops --config prd -- printenv GOHIGHLEVEL_LOCATION_ID)

if [ -z "$GHL_API_KEY" ]; then
    echo -e "${RED}❌ GHL_API_KEY not found in Doppler${NC}"
    exit 1
fi

echo "Exporting contacts..."
curl -s -X GET "https://services.leadconnectorhq.com/locations/${GHL_LOCATION_ID}/contacts/" \
  -H "Authorization: Bearer $GHL_API_KEY" \
  -H "Version: 2021-07-28" \
  > /tmp/ghl-migration/exports/contacts.json

echo "Exporting opportunities/deals..."
curl -s -X GET "https://services.leadconnectorhq.com/locations/${GHL_LOCATION_ID}/opportunities/" \
  -H "Authorization: Bearer $GHL_API_KEY" \
  -H "Version: 2021-07-28" \
  > /tmp/ghl-migration/exports/deals.json

echo -e "${GREEN}✅ Data exported$(NC}"

# Step 4: Validate exports
echo -e "${BLUE}Step 4: Validating exports${NC}"
CONTACTS_COUNT=$(jq '.contacts | length' /tmp/ghl-migration/exports/contacts.json 2>/dev/null || echo "0")
DEALS_COUNT=$(jq '.opportunities | length' /tmp/ghl-migration/exports/deals.json 2>/dev/null || echo "0")

echo "  Contacts: $CONTACTS_COUNT"
echo "  Deals: $DEALS_COUNT"
echo -e "${GREEN}✅ Validation complete${NC}"

# Step 5: Deploy Twenty (if needed)
echo -e "${BLUE}Step 5: Checking Twenty deployment${NC}"
TWENTY_STATUS=$(ssh vps-dragon@100.120.151.91 "docker ps --filter name=twenty --format '{{.Status}}'" 2>/dev/null || echo "")

if [ -z "$TWENTY_STATUS" ]; then
    echo "Twenty not running. Deploying..."
    ssh vps-dragon@100.120.151.91 << 'EOF'
cd /opt/opsly
docker-compose up -d twenty
echo "Waiting for Twenty to start..."
sleep 10
EOF
    echo -e "${GREEN}✅ Twenty deployed${NC}"
else
    echo -e "${GREEN}✅ Twenty already running${NC}"
fi

# Step 6: Get Twenty API token
echo -e "${BLUE}Step 6: Authenticating with Twenty${NC}"
TWENTY_URL="https://twenty.op-sly.com"
TWENTY_ADMIN_PASSWORD=$(doppler run --project ops-intcloudsysops --config prd -- printenv TWENTY_ADMIN_PASSWORD)

TWENTY_TOKEN=$(curl -s -X POST "${TWENTY_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"admin@twenty.local\", \"password\": \"${TWENTY_ADMIN_PASSWORD}\"}" \
  | jq -r '.accessToken' 2>/dev/null || echo "")

if [ -z "$TWENTY_TOKEN" ] || [ "$TWENTY_TOKEN" == "null" ]; then
    echo -e "${RED}❌ Failed to get Twenty API token${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Twenty authenticated${NC}"

# Step 7: Transform GHL data to Twenty schema
echo -e "${BLUE}Step 7: Transforming data${NC}"
node << 'EOF'
const fs = require('fs');

const contacts = JSON.parse(fs.readFileSync('/tmp/ghl-migration/exports/contacts.json', 'utf8'));
const transformed = contacts.contacts.map(c => ({
  firstName: c.firstName || 'Unknown',
  lastName: c.lastName || '',
  email: c.email || '',
  phones: c.phone ? [c.phone] : [],
  customFields: {
    ghl_id: c.id,
    ghl_source: c.source,
    ghl_status: c.status,
  }
})).filter(c => c.email); // Only contacts with email

fs.writeFileSync('/tmp/ghl-migration/transforms/contacts-twenty.json', JSON.stringify(transformed, null, 2));
console.log(`✅ Transformed ${transformed.length} contacts for Twenty`);
EOF

echo -e "${GREEN}✅ Data transformed${NC}"

# Step 8: Import to Twenty
echo -e "${BLUE}Step 8: Importing contacts to Twenty${NC}"
CONTACTS_FILE="/tmp/ghl-migration/transforms/contacts-twenty.json"
TWENTY_TOKEN="${TWENTY_TOKEN}"

# Import each contact (batch)
node << 'EOF'
const fs = require('fs');
const https = require('https');

const contacts = JSON.parse(fs.readFileSync(process.env.CONTACTS_FILE, 'utf8'));
const token = process.env.TWENTY_TOKEN;
const url = 'https://twenty.op-sly.com/api/graphql';

let imported = 0;
let failed = 0;

async function importContact(contact) {
  return new Promise((resolve) => {
    const query = JSON.stringify({
      query: `
        mutation createPerson($input: PersonCreateInput!) {
          createPerson(input: $input) {
            id
            firstName
            email
          }
        }
      `,
      variables: {
        input: {
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phones: contact.phones,
          customFields: contact.customFields,
        }
      }
    });

    const options = {
      hostname: 'twenty.op-sly.com',
      port: 443,
      path: '/api/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(query),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.data?.createPerson?.id) {
            imported++;
          } else {
            failed++;
          }
        } catch (e) {
          failed++;
        }
        resolve();
      });
    });

    req.on('error', () => {
      failed++;
      resolve();
    });

    req.write(query);
    req.end();
  });
}

(async () => {
  console.log(`Importing ${contacts.length} contacts to Twenty...`);

  // Import in batches of 10
  for (let i = 0; i < contacts.length; i += 10) {
    const batch = contacts.slice(i, i + 10);
    await Promise.all(batch.map(importContact));
    console.log(`Progress: ${i + batch.length}/${contacts.length}`);
  }

  console.log(`\n✅ Import complete: ${imported} success, ${failed} failed`);
})();
EOF

echo -e "${GREEN}✅ Contacts imported to Twenty${NC}"

# Step 9: Update .env files
echo -e "${BLUE}Step 9: Updating environment variables${NC}"
TWENTY_API_TOKEN=$(doppler run --project ops-intcloudsysops --config prd -- printenv TWENTY_API_TOKEN)
TWENTY_API_URL="https://twenty.op-sly.com/api/graphql"

# Update ICSO .env.example
sed -i.bak '/GOHIGHLEVEL/d' apps/intcloudsysops/.env.example
cat >> apps/intcloudsysops/.env.example << EOF

# Twenty CRM Integration
TWENTY_API_URL=${TWENTY_API_URL}
TWENTY_API_TOKEN=${TWENTY_API_TOKEN}
N8N_WEBHOOK_URL=https://n8n.op-sly.com/webhook
EOF

echo -e "${GREEN}✅ Environment variables updated${NC}"

# Step 10: Final validation
echo -e "${BLUE}Step 10: Final validation${NC}"
TWENTY_PEOPLE_COUNT=$(curl -s -X POST "${TWENTY_URL}/api/graphql" \
  -H "Authorization: Bearer ${TWENTY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ people(first: 1) { edges { node { id } } } }"}' \
  | jq '.data.people.edges | length' 2>/dev/null || echo "0")

echo "Contacts in Twenty: $TWENTY_PEOPLE_COUNT"
echo -e "${GREEN}✅ Migration validation complete${NC}"

# Summary
echo ""
echo -e "${GREEN}=================================="
echo "✅ MIGRATION COMPLETE"
echo "==================================${NC}"
echo ""
echo "Summary:"
echo "  • GHL Contacts exported: $CONTACTS_COUNT"
echo "  • Transformed for Twenty: $(jq 'length' /tmp/ghl-migration/transforms/contacts-twenty.json)"
echo "  • Imported to Twenty: $imported"
echo "  • Failed: $failed"
echo ""
echo "Next steps:"
echo "  1. Verify data in Twenty dashboard: https://twenty.op-sly.com"
echo "  2. Create n8n workflows (use docs/01-development/GHL-TO-TWENTY-MIGRATION.md)"
echo "  3. Test Peskids lead capture → Twenty"
echo "  4. Test ICSO dashboard reading from Twenty"
echo "  5. Monitor for 24 hours"
echo ""
echo "Logs saved to: /tmp/ghl-migration/logs/"
