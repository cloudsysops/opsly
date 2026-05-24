---
status: draft
owner: operations
last_review: 2026-05-24
type: tenant
tags:
  - opsly/tenant
---

# N8N Workflows Guide — Peskids Phase 2

**Date:** 2026-05-24  
**Owner:** sierrasantiago90@gmail.com  
**Status:** Ready to implement

---

## ✅ Prerequisite: N8N Container Running

Before creating workflows, ensure the N8N container is running on VPS:

```bash
# From your local machine with SSH access:
./scripts/setup-n8n-tenant.sh --vps-host 100.120.151.91 --tenant peskids

# Verify N8N is accessible:
curl -s https://peskids.op-sly.com/n8n/ | head -20

# You should see HTML response with N8N UI
```

**N8N Dashboard URL:** https://peskids.op-sly.com/n8n/

---

## 📋 Week 1 Workflows (Required for Phase 2 MVP)

### Workflow 1: Lead Capture (Day 1 Afternoon)

**Purpose:** Form submission → Supabase leads table

**Trigger:** Webhook POST from landing page form  
**Input:** `{ full_name, email, phone, source, class_modality, neighborhood, grade_interested, referral_source }`  
**Output:** Lead inserted to Supabase, return 200 OK

**Steps in N8N:**
1. **Webhook Trigger (POST)**
   - URL: `https://peskids.op-sly.com/webhooks/lead-capture`
   - Method: POST
   - Respond when: 200 OK response

2. **Parse JSON**
   - Extract: name → full_name, email, phone, source (default: "web")

3. **Supabase Insert (leads table)**
   - Table: `leads`
   - Fields: `full_name`, `email`, `phone`, `source`, `class_modality`, `neighborhood`, `grade_interested`, `referral_source`, `status` (always "new"), `tenant_slug` (always "peskids")

4. **HTTP Response**
   - Return: `{ "ok": true, "id": "{{$node['Supabase'].json.id}}", "message": "Lead received" }`

**Step-by-step in UI:**
1. In N8N, click **"+"** → add **Webhook** node
2. Name: "lead-capture-webhook"
3. Set URL path: `/lead-capture`
4. Click on the Webhook node, **Get started** → copy the webhook URL
5. Add **Supabase** node → connect to trigger
6. In Supabase node:
   - Method: Insert
   - Table: leads
   - Fields: (map incoming JSON to schema)
7. Add **HTTP Response** node → return 200 OK with message
8. Save workflow as **lead-capture**

**Test the workflow:**
```bash
curl -X POST https://peskids.op-sly.com/webhooks/lead-capture \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "phone": "555-1234",
    "source": "web",
    "class_modality": "domicilio",
    "neighborhood": "Envigado",
    "grade_interested": "6-8",
    "referral_source": "Instagram"
  }'
```

**Expected response:**
```json
{
  "ok": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Lead received"
}
```

---

### Workflow 2: Hot Lead Alert (Day 2 Morning)

**Purpose:** Alert owner (Discord + Email) when new lead arrives

**Trigger:** New row in `leads` table (polling via N8N cron)  
**Condition:** `source = 'web'`  
**Actions:** 
- Discord message to owner
- Email to sierrasantiago90@gmail.com

**Steps in N8N:**
1. **Postgres Polling** (or Supabase)
   - Query: `SELECT * FROM leads WHERE source = 'web' AND status = 'new' ORDER BY created_at DESC LIMIT 1`
   - Poll interval: Every 2 minutes

2. **Condition Node**
   - Check: `source = 'web'` AND `created_at > NOW() - INTERVAL '5 minutes'`

3. **Discord Webhook**
   - Webhook URL: `${DISCORD_WEBHOOK_PESKIDS}` (from Doppler `prd` config)
   - Message:
     ```
     🔥 **New Lead: {{full_name}}**
     📧 Email: {{email}}
     📞 Phone: {{phone}}
     📍 Location: {{neighborhood}} ({{class_modality}})
     👧 Level: {{grade_interested}}
     🔗 Source: {{referral_source}}
     ⏰ Time: {{created_at}}
     ```

4. **Resend Email**
   - To: `sierrasantiago90@gmail.com`
   - Subject: `🔥 New Peskids Lead: {{full_name}}`
   - Body: (same as Discord, formatted as email)

**Cron Schedule (N8N):**
- Every 2 minutes: `*/2 * * * *`

**Test:**
1. Submit a test lead via the form or curl
2. Wait max 2 minutes
3. Check Discord channel (owner receives notification)
4. Check email inbox (sierrasantiago90@gmail.com)

---

### Workflow 3: RLS Policy Application (Day 3)

**No N8N workflow needed.** This is a Supabase migration (SQL).

See `RLS-POLICIES-MIGRATION.md` below.

---

## 🔧 Supabase Connection Details

**N8N Supabase credentials (from Doppler prd config):**
- **Supabase URL:** `${NEXT_PUBLIC_SUPABASE_URL}` (from Doppler)
- **Supabase API Key:** `${SUPABASE_ANON_KEY}` (from Doppler)
- **Service Role Key:** `${SUPABASE_SERVICE_ROLE_KEY}` (for admin operations)

**To get credentials:**
```bash
doppler run --project ops-intcloudsysops --config prd -- env | grep SUPABASE
```

---

## 📊 N8N Configuration via Doppler

Store all secrets in Doppler `ops-intcloudsysops/prd`:

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public API key (for N8N to read) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (for inserts/deletes) |
| `DISCORD_WEBHOOK_PESKIDS` | Discord webhook for alerts |
| `RESEND_API_KEY` | Resend email service API key |

**N8N Dashboard Credentials:**
- Default: Username/password (create admin account on first login)
- Protected: Only access via `peskids.op-sly.com/n8n/` (behind Traefik SSL)

---

## 🚀 Week 2 Workflows (Optional, If Ahead of Schedule)

### Workflow 4: Daily Follow-Up Digest

**Trigger:** Cron every morning at 08:00 (Colombian timezone)  
**Query:** All followups with `due_at ≤ today` and `status != 'completed'`  
**Output:** Discord message + email to owner

*(Detailed spec in PHASE-2-IMPLEMENTATION-PLAN.md)*

### Workflow 5: Jelou WhatsApp Integration

**Trigger:** Webhook from Jelou (inbound WhatsApp message)  
**Action:** Store in `messages` table with `status = 'pending_approval'`  
**Output:** Discord alert to owner for approval

*(Detailed spec in PHASE-2-IMPLEMENTATION-PLAN.md)*

---

## ✅ Success Criteria

- [ ] N8N container running on VPS
- [ ] Lead capture workflow deployed and tested
- [ ] Form posts to N8N webhook (not internal API)
- [ ] Hot lead alert sent to Discord within 2 minutes
- [ ] Email notification sent to owner
- [ ] RLS policies applied (Day 3)
- [ ] All workflows have error handling + logging

---

## 🆘 Troubleshooting

### N8N Webhook Returns 404
- **Cause:** Workflow not active or webhook URL mismatch
- **Fix:** In N8N UI, click Workflow → Activate toggle (should be ON)
- **Fix:** Copy exact webhook URL from N8N UI, not manually

### Supabase Insert Fails
- **Cause:** Missing column or RLS policy blocking insert
- **Fix:** Check Supabase table schema in dashboard
- **Fix:** Temporarily disable RLS on `leads` table for testing: `ALTER TABLE leads DISABLE ROW LEVEL SECURITY;`
- **Fix:** Re-enable after testing: `ALTER TABLE leads ENABLE ROW LEVEL SECURITY;`

### Discord Alert Not Received
- **Cause:** Webhook URL invalid or Discord channel permissions
- **Fix:** Test webhook with curl: `curl -X POST ${DISCORD_WEBHOOK_PESKIDS} -H "Content-Type: application/json" -d '{"content":"Test"}'`
- **Fix:** Ensure bot has "Send Messages" permission in Discord channel

### Email Not Sent
- **Cause:** Resend API key missing or invalid
- **Fix:** Verify `RESEND_API_KEY` is set in Doppler
- **Fix:** Test: `echo $RESEND_API_KEY` (should show masked key in CLI)

---

## 📝 Next Steps

**Week 1:**
1. ✅ Run N8N setup script (creates container)
2. ✅ Create lead-capture workflow (Day 1 afternoon)
3. ✅ Create hot-lead-alert workflow (Day 2 morning)
4. ✅ Apply RLS policies (Day 3)
5. ✅ Update landing page form (Day 2 afternoon)

**Week 2:**
- Teacher dashboard
- WhatsApp integration
- Daily digest workflow

---

## 🔗 References

- N8N Docs: https://docs.n8n.io/
- Supabase Docs: https://supabase.com/docs
- Resend Email: https://resend.com/docs
- Jelou WhatsApp: [Provided by product owner]

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
