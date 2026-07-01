---
status: ready-to-implement
owner: operations
created: 2026-07-01
type: tenant-workflows
tags:
  - n8n
  - intcloudsysops
  - erp-crm
---

# n8n Workflows for ICSO (ERP/CRM)

**Purpose:** Self-hosted workflow automation replacing GoHighLevel  
**Platform:** n8n (open-source)  
**Container:** `n8n-icso` on VPS (Tailscale 100.120.151.91)  
**Dashboard:** `https://icso.op-sly.com/n8n/`

---

## Workflow 1: Account Lifecycle Management

**Trigger:** POST `/api/accounts` (account created/updated)

**Steps:**
1. **Webhook (POST)** → Listen for account events
2. **Supabase Insert/Update** → Write to `intcloudsysops_accounts`
3. **Slack Notification** → Alert #ops-erp-accounts with account details
4. **Create Follow-up** → Auto-create 3-day follow-up task

**n8n UI Setup:**
```
1. Add Webhook node → Set method POST
2. Add Supabase node → Insert into intcloudsysops_accounts
3. Add Slack node → Send message to #ops-erp-accounts
4. Add HTTP node → POST to /api/followups to create task
5. Add Response node → Return 200 OK
```

**Test:**
```bash
curl -X POST http://localhost:5678/webhook/intcloudsysops-account \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "accountType": "prospect",
    "billingEmail": "billing@acme.test",
    "industry": "SaaS",
    "employeeCount": 50
  }'
```

---

## Workflow 2: Contact & Decision-Maker Alerts

**Trigger:** POST `/api/contacts` (new contact created)

**Steps:**
1. **Webhook (POST)** → Listen for contact events
2. **Supabase Insert** → Write to `intcloudsysops_contacts`
3. **IF role == 'decision_maker'** → Send high-priority Slack alert
4. **Create Follow-up** → Auto-create follow-up (due: tomorrow)
5. **Send Email** → Optional: notify sales team

**n8n UI Setup:**
```
1. Webhook node (POST /webhook/intcloudsysops-contact)
2. Supabase Insert
3. Switch node → Check if role === 'decision_maker'
   - True: Continue to Slack (priority message)
   - False: Skip to followup
4. Slack notification node
5. HTTP → POST /api/followups
6. Response node (200 OK)
```

**Test:**
```bash
curl -X POST http://localhost:5678/webhook/intcloudsysops-contact \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@acme.test",
    "phone": "555-1234",
    "role": "decision_maker",
    "accountId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## Workflow 3: Deal Pipeline & Revenue Sync

**Trigger:** POST `/api/deals` (deal created/stage changed)

**Steps:**
1. **Webhook (POST)** → Listen for deal events
2. **Supabase Insert/Update** → Write to `intcloudsysops_deals`
3. **IF stage == 'won'** → Update account monthly_revenue
4. **IF value > $10k** → Send Slack alert to #sales
5. **Log to Analytics** → Insert into analytics table

**n8n UI Setup:**
```
1. Webhook node (POST /webhook/intcloudsysops-deal)
2. Supabase Insert/Update deal
3. Switch node → Check if stage === 'won'
   - True: Supabase update accounts.monthly_revenue
   - Continue
4. Switch node → Check if value > 10000
   - True: Slack notification (#sales channel)
5. Supabase Insert → analytics table (log event)
6. Response node (200 OK)
```

**Test:**
```bash
curl -X POST http://localhost:5678/webhook/intcloudsysops-deal \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Enterprise Contract - Acme",
    "accountId": "550e8400-e29b-41d4-a716-446655440000",
    "value": 50000,
    "stage": "won",
    "probability": 100,
    "closeDate": "2026-07-01T00:00:00Z",
    "owner": "alice@intcloudsysops.com"
  }'
```

---

## Workflow 4: Daily Follow-up Digest

**Trigger:** Cron (8 AM daily)

**Steps:**
1. **Cron Trigger** → Every day at 8 AM
2. **Supabase Query** → Get all `followups` with status='pending' and due_at <= TODAY
3. **Format Message** → Compile HTML table of overdue follow-ups
4. **Slack Notification** → Post digest to #ops-followups

**n8n UI Setup:**
```
1. Cron node → Schedule "0 8 * * *" (8 AM UTC)
2. Supabase Query
   SELECT * FROM intcloudsysops_followups
   WHERE status = 'pending'
   AND due_at <= NOW()
   ORDER BY due_at ASC
3. Function node → Format as Slack markdown table
4. Slack notification node → Post to #ops-followups
```

**Expected Slack Output:**
```
📋 Pending Follow-ups (8 items due)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Contact: Jane Doe (Acme Corp)
Due: 2026-06-30 (OVERDUE)
Assigned: alice@intcloudsysops.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[View in Dashboard]
```

---

## Workflow 5: Monthly Revenue Report

**Trigger:** Cron (1st of month, 9 AM)

**Steps:**
1. **Cron Trigger** → 1st of each month at 9 AM
2. **Supabase Query** → Calculate monthly revenue (sum of deals where stage='won')
3. **Generate Report** → Count by account_type, by owner
4. **Email Report** → Send to ops-team@intcloudsysops.com

**n8n UI Setup:**
```
1. Cron node → Schedule "0 9 1 * *" (1st day, 9 AM)
2. Supabase Query (revenue sum)
3. Supabase Query (breakdown by type)
4. Function node → Format HTML report
5. Slack notification (or Email node)
```

**Report Contents:**
- Total monthly revenue (previous month)
- Revenue by account type (prospect, customer, partner)
- Revenue by sales owner
- Top 5 deals
- Conversion rate (won / total pipeline)

---

## Workflow 6: Inbound Webhook Handler (Future)

**Trigger:** Jelou/Slack/external webhooks

**Steps:**
1. **Webhook** → Accept inbound notifications
2. **Route** → Determine source (Jelou, Slack, custom)
3. **Supabase Insert** → Log message/event
4. **Notify** → Alert relevant team member

*Implementation pending — reserve for Phase 2 integration*

---

## Deployment Checklist

- [ ] n8n container running on VPS
- [ ] Supabase credentials configured in n8n
- [ ] Slack token configured in n8n
- [ ] All 5 workflows created and tested
- [ ] Webhook URLs documented in .env files
- [ ] Monitoring alerts set up for workflow failures
- [ ] Backup strategy for n8n workflows (export JSON)
- [ ] Team trained on n8n dashboard access

---

## Monitoring & Errors

**n8n Dashboard:** Track execution logs
- Login: https://icso.op-sly.com/n8n/
- View execution history per workflow
- Set up error notifications → Slack #opsly-alerts

**Common Issues:**
- Supabase connection timeout → Check VPS network
- Slack auth failed → Regenerate token in n8n settings
- Webhook not triggering → Verify webhook URL is accessible from source app

---

## Backup & Disaster Recovery

**Export workflows** (weekly):
```bash
# SSH to VPS
ssh vps-dragon@100.120.151.91

# Backup n8n workflows
docker exec n8n-icso n8n export:workflow --all --output /home/node/.n8n/backups/

# Download locally
scp -r vps-dragon@100.120.151.91:/opt/opsly/n8n/backups/ ./n8n-icso-backups/
```

**Restore:**
```bash
docker exec n8n-icso n8n import:workflow --input ./backup.json
```

---

## Next Steps

1. Deploy n8n container to VPS
2. Create workflow 1 (Account Lifecycle) — test with curl
3. Create workflow 2 (Contact Alerts) — test with curl
4. Create workflow 3 (Deal Pipeline) — test with curl
5. Create workflow 4 (Daily Digest) — schedule and verify
6. Go live: Redirect all API POST requests to n8n webhooks
