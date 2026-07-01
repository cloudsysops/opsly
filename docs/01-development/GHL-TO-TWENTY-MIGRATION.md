---
status: in-progress
owner: operations
created: 2026-07-01
type: migration-strategy
tags:
  - twenty
  - n8n
  - ghl-replacement
  - hybrid-crm
---

# Migration Plan: GoHighLevel → Twenty + n8n (Hybrid)

**Objective:** Replace GoHighLevel entirely with Twenty (CRM) + n8n (automation)  
**Cost:** $0/month (self-hosted open-source)  
**Timeline:** 3 phases, ~24 hours total work  
**Architecture:** Twenty (primary CRM) ← n8n (workflows) ← Peskids/ICSO (apps)

---

## Architecture: Hybrid Twenty + n8n

```
┌─────────────────────────────────────────────────────────┐
│  PESKIDS (Education CRM)    │  ICSO (Enterprise CRM)   │
│  - Lead capture             │  - Deal pipeline         │
│  - Enrollments              │  - Account mgmt          │
│  - Parent feedback          │  - Contact tracking      │
└──────────────┬──────────────┴──────────────┬────────────┘
               │                             │
               └─────────────────┬───────────┘
                                 │
                    ┌────────────▼──────────────┐
                    │   TWENTY CRM (UI Layer)   │
                    │  - Contacts               │
                    │  - Deals                  │
                    │  - Companies              │
                    │  - Activities/Timeline    │
                    │  - Custom fields          │
                    │  - Slack/email integration│
                    └────────────┬──────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
        ┌───────▼────┐  ┌───────▼────┐  ┌───────▼────┐
        │   n8n      │  │ Supabase   │  │   Slack    │
        │ Workflows  │  │   (DB)     │  │   /Email   │
        │            │  │            │  │            │
        │ - Lead     │  │ Shared     │  │ Alerts &   │
        │   capture  │  │ tenant DB  │  │ notif      │
        │ - Jelou    │  │            │  │            │
        │   sync     │  │            │  │            │
        │ - Email    │  │            │  │            │
        │ - Reminders│  │            │  │            │
        └────────────┘  └────────────┘  └────────────┘
```

---

## Phase 1: Data Export from GoHighLevel (2h)

### 1.1 Export GHL Data

**Contacts, Deals, Companies from GHL:**
```bash
# Using GHL API (v2021-07-28)
# Export contacts
curl -X GET "https://services.leadconnectorhq.com/contacts/" \
  -H "Authorization: Bearer $GOHIGHLEVEL_API_KEY" \
  -H "Version: 2021-07-28" \
  > ghl-contacts.json

# Export deals/opportunities
curl -X GET "https://services.leadconnectorhq.com/opportunities/" \
  -H "Authorization: Bearer $GOHIGHLEVEL_API_KEY" \
  -H "Version: 2021-07-28" \
  > ghl-deals.json

# Export activities/notes
curl -X GET "https://services.leadconnectorhq.com/activities/" \
  -H "Authorization: Bearer $GOHIGHLEVEL_API_KEY" \
  -H "Version: 2021-07-28" \
  > ghl-activities.json
```

### 1.2 Validate Exports

```bash
# Check record counts
jq '.contacts | length' ghl-contacts.json  # Should be > 0
jq '.opportunities | length' ghl-deals.json
jq '.activities | length' ghl-activities.json
```

---

## Phase 2: Import to Twenty (4h)

### 2.1 Deploy Twenty (if not already done)

```bash
# SSH to VPS
ssh vps-dragon@100.120.151.91

# Deploy Twenty Docker container
docker run -d \
  --name twenty \
  -p 3006:3000 \
  -e DATABASE_URL=postgresql://user:pass@postgres:5432/twenty \
  -e REDIS_URL=redis://redis:6379 \
  -e FRONT_BASE_URL=https://twenty.op-sly.com \
  -e SERVER_URL=https://twenty.op-sly.com/api \
  -e JWT_SECRET=$(openssl rand -base64 32) \
  -v twenty_data:/app/data \
  --network opsly \
  twentyhq/twenty:latest

# Or use docker-compose (recommended):
docker-compose up -d twenty
```

### 2.2 Transform GHL Data to Twenty Schema

**Migration script (Node.js):**

```typescript
// scripts/migrate-ghl-to-twenty.ts
import * as fs from 'fs';

interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  customFields?: Record<string, any>;
}

interface TwentyContact {
  firstName: string;
  lastName: string;
  email: string;
  phones: string[];
  customFields?: Record<string, any>;
}

const transformContact = (ghlContact: GHLContact): TwentyContact => ({
  firstName: ghlContact.firstName || 'Unknown',
  lastName: ghlContact.lastName || '',
  email: ghlContact.email,
  phones: ghlContact.phone ? [ghlContact.phone] : [],
  customFields: {
    ghl_id: ghlContact.id,
    ...ghlContact.customFields,
  },
});

const migrateContacts = () => {
  const ghlData = JSON.parse(fs.readFileSync('ghl-contacts.json', 'utf8'));
  const twentyContacts = ghlData.contacts.map(transformContact);
  
  fs.writeFileSync('twenty-contacts.json', JSON.stringify(twentyContacts, null, 2));
  console.log(`✅ Transformed ${twentyContacts.length} contacts`);
};

// Similarly for deals, activities...
migrateContacts();
```

### 2.3 Import to Twenty API

```bash
# Get Twenty API token
TWENTY_TOKEN=$(curl -X POST https://twenty.op-sly.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@twenty.local",
    "password": "'$TWENTY_ADMIN_PASSWORD'"
  }' | jq -r '.accessToken')

# Import contacts
curl -X POST https://twenty.op-sly.com/api/graphql \
  -H "Authorization: Bearer $TWENTY_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "query": "mutation { createPerson(input: { firstName: \"John\" lastName: \"Doe\" email: \"john@example.com\" }) { id firstName } }"
}
EOF
```

### 2.4 Verify Imports

```bash
# Check Twenty dashboard
curl -X POST https://twenty.op-sly.com/api/graphql \
  -H "Authorization: Bearer $TWENTY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ people(first: 100) { edges { node { id firstName email } } } }"
  }' | jq '.data.people.edges | length'
```

---

## Phase 3: Configure n8n ↔ Twenty Integration (4h)

### 3.1 n8n Workflows for Twenty

#### Workflow A: Lead Capture → Twenty

**Trigger:** Form POST  
**Flow:**
1. Webhook receives form data (Peskids landing page)
2. Transform to Twenty Person schema
3. POST to Twenty API (`/graphql`)
4. Send confirmation email
5. Create Slack notification
6. Return 200 OK

**n8n Setup:**
```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300],
      "webhookId": "lead-capture-twenty"
    },
    {
      "name": "Twenty - Create Person",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [450, 300],
      "parameters": {
        "method": "POST",
        "url": "https://twenty.op-sly.com/api/graphql",
        "headers": {
          "Authorization": "Bearer {{ $env.TWENTY_API_TOKEN }}",
          "Content-Type": "application/json"
        },
        "body": {
          "query": "mutation createPerson { createPerson(input: {firstName: \"{{ $json.firstName }}\" lastName: \"{{ $json.lastName }}\" email: \"{{ $json.email }}\"}) { id firstName } }"
        }
      }
    },
    {
      "name": "Send Email",
      "type": "n8n-nodes-base.sendGrid",
      "typeVersion": 1,
      "position": [650, 300]
    },
    {
      "name": "Slack Notification",
      "type": "n8n-nodes-base.slack",
      "typeVersion": 1,
      "position": [850, 300]
    }
  ]
}
```

#### Workflow B: Jelou (WhatsApp) → Twenty

**Trigger:** Jelou webhook  
**Flow:**
1. Receive WhatsApp message from Jelou
2. Extract phone → query Twenty for existing person
3. If exists: create activity
4. If new: create person + activity
5. Route to appropriate team member
6. Send auto-reply via Jelou

**n8n GraphQL for Two-Way Sync:**
```graphql
query findPersonByPhone($phone: String!) {
  people(filter: { phones: { any: { number: { eq: $phone } } } }) {
    edges {
      node {
        id
        firstName
        emails { value }
      }
    }
  }
}

mutation createActivity($personId: ID!, $body: String!) {
  createActivity(input: {
    type: "note"
    body: $body
    relatedEntity: { id: $personId, type: "person" }
  }) {
    id
    body
    createdAt
  }
}
```

#### Workflow C: Deals ↔ Twenty (ICSO)

**Bidirectional sync:**
- ICSO deal created → Twenty Opportunity
- Twenty Opportunity stage changed → ICSO dashboard updated
- n8n polling: Every 5 min check for changes

**n8n Setup:**
```typescript
// Cron trigger (every 5 min)
// Query Twenty for opportunities
// Compare with ICSO.deals table
// Sync changes (create/update/delete)
```

### 3.2 Configure Twenty API Access in n8n

```bash
# In n8n UI:
# Settings → Credentials → Add new
# Type: HTTP Header Auth
# Authorization: Bearer <TWENTY_API_TOKEN>
# URL: https://twenty.op-sly.com/api/graphql
```

---

## Phase 4: Update Peskids + ICSO (6h)

### 4.1 Peskids: Wire Lead Form to Twenty

**Remove:** Direct Supabase insert  
**Add:** POST to n8n webhook (which then creates Twenty person)

```typescript
// apps/peskids/app/api/leads/route.ts (BEFORE - direct GHL)
// Now: POST to n8n instead
export async function POST(req: Request) {
  const body = await req.json();
  
  // POST to n8n webhook (which creates Twenty person + email + Slack)
  const response = await fetch(`${process.env.N8N_WEBHOOK_URL}/lead-capture-twenty`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return Response.json({ ok: true, data: await response.json() });
}
```

### 4.2 ICSO: Wire Dashboard to Twenty API

**Sync accounts/deals from Twenty:**

```typescript
// apps/intcloudsysops/lib/services/deal.service.ts
import { ApolloClient, gql } from '@apollo/client';

const twentyClient = new ApolloClient({
  uri: 'https://twenty.op-sly.com/api/graphql',
  headers: {
    Authorization: `Bearer ${process.env.TWENTY_API_TOKEN}`,
  },
});

export async function getDealsFromTwenty() {
  const query = gql`
    query {
      opportunities(first: 100) {
        edges {
          node {
            id
            name
            value
            stage
            closeDate
            person { id firstName email }
          }
        }
      }
    }
  `;
  
  const result = await twentyClient.query({ query });
  return result.data.opportunities.edges.map(e => e.node);
}

// ICSO dashboard now fetches from Twenty instead of GHL
export async function fetchDashboardStats() {
  const deals = await getDealsFromTwenty();
  return {
    totalDeals: deals.length,
    wonDeals: deals.filter(d => d.stage === 'won').length,
    pipelineValue: deals.reduce((sum, d) => sum + (d.value || 0), 0),
  };
}
```

### 4.3 Remove All GHL References

```bash
# Delete GHL code (already done in PR #658)
rm apps/intcloudsysops/lib/gohighlevel-sync.ts
rm apps/intcloudsysops/app/api/webhooks/ghl-sync/route.ts

# Update .env.example (remove GHL vars)
sed -i '/GOHIGHLEVEL/d' apps/intcloudsysops/.env.example

# Add Twenty vars
cat >> apps/intcloudsysops/.env.example << 'EOF'
# Twenty CRM Integration
TWENTY_API_URL=https://twenty.op-sly.com/api/graphql
TWENTY_API_TOKEN=<token-from-doppler>

# n8n Webhooks
N8N_WEBHOOK_URL=https://n8n.op-sly.com/webhook
EOF
```

---

## Phase 5: Deployment & Testing (4h)

### 5.1 Deploy on VPS

```bash
# 1. Deploy Twenty container
docker-compose -f docker-compose.vps.yml up -d twenty

# 2. Verify Twenty is running
curl -s https://twenty.op-sly.com/api/health | jq .

# 3. Create admin user in Twenty
docker exec twenty npm run seed:db

# 4. Deploy n8n workflows
# (manual in n8n UI or via CLI)

# 5. Update Traefik routing
# Point *.op-sly.com/twenty → twenty:3000
# Point *.op-sly.com/n8n → n8n-icso:5678, n8n-peskids:5679
```

### 5.2 Smoke Tests

```bash
# Test 1: Lead capture (Peskids)
curl -X POST https://peskids.op-sly.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "phone": "555-1234"
  }'
# Expected: Person created in Twenty + email sent + Slack alert

# Test 2: Deal sync (ICSO)
curl -X GET https://intcloudsysops.op-sly.com/api/dashboard \
  -H "Authorization: Bearer $AUTH_TOKEN"
# Expected: Deals fetched from Twenty (not GHL)

# Test 3: Jelou integration
# Send WhatsApp message → should create/update Twenty activity

# Test 4: Email notifications
# Check Slack alerts → should be from n8n (not GHL)
```

### 5.3 Data Validation

```sql
-- Verify Twenty data imported correctly
SELECT COUNT(*) as total_people FROM "twenty"."public"."person";
SELECT COUNT(*) as total_opportunities FROM "twenty"."public"."opportunity";
SELECT COUNT(*) as total_activities FROM "twenty"."public"."activity";

-- Check no GHL API calls in logs
grep -r "leadconnectorhq" /opt/opsly/runtime/logs/
```

---

## Phase 6: Cutover & Cleanup (2h)

### 6.1 Final Steps

1. ✅ All data migrated to Twenty
2. ✅ n8n workflows operational
3. ✅ Peskids/ICSO pointing to Twenty
4. ✅ Smoke tests passing
5. ✅ Team trained on Twenty UI
6. ✅ Monitoring alerts set up
7. ✅ Cancel GHL subscription

### 6.2 Backup Strategy

```bash
# Weekly backup of Twenty data
docker exec twenty pg_dump -U twenty_user twenty_db > /backups/twenty-$(date +%Y%m%d).sql

# Export n8n workflows
docker exec n8n-icso n8n export:workflow --all --output /backups/n8n-workflows.json
```

### 6.3 Disaster Recovery

```bash
# If Twenty goes down, restore from backup:
psql -U twenty_user < /backups/twenty-latest.sql

# If n8n workflows lost, restore:
docker exec n8n-icso n8n import:workflow --input /backups/n8n-workflows.json
```

---

## Success Criteria

- ✅ Zero GHL API calls
- ✅ All contacts/deals imported to Twenty
- ✅ Lead capture → Twenty (via n8n)
- ✅ Jelou ↔ Twenty sync working
- ✅ ICSO dashboard pulling from Twenty
- ✅ Peskids enrollments tracked in Twenty
- ✅ No downtime during migration
- ✅ Team comfortable with Twenty UI
- ✅ Monitoring + alerts active
- ✅ $0/month for CRM (vs GHL subscription)

---

## Timeline Summary

| Phase | Task | Duration | Owner |
|-------|------|----------|-------|
| 1 | Export GHL data | 2h | ops |
| 2 | Deploy Twenty, import data | 4h | ops |
| 3 | Configure n8n ↔ Twenty | 4h | ops |
| 4 | Update Peskids + ICSO | 6h | dev |
| 5 | Deploy, test, validate | 4h | ops/qa |
| 6 | Cutover, cleanup, DR | 2h | ops |
| **TOTAL** | | **22h** | |

---

## Next Steps

1. Confirm Twenty is deployed on VPS (or deploy if needed)
2. Export GHL data (use scripts above)
3. Transform + import to Twenty
4. Create n8n workflows
5. Test end-to-end
6. Deploy to production
7. Monitor for 24h

**Ready to start Phase 1?**
