---
status: guide
owner: operations
type: peskids-env
---

# Phase 2 Week 1: Environment Variables & N8N Webhook Setup

**Timeline:** 15 minutes  
**Owner:** cboteros1@gmail.com  
**Status:** Ready to execute

---

## Overview

This guide configures the N8N webhook URL that the lead-capture form uses to submit data. The form is already implemented in `apps/peskids/components/forms/lead-capture-form.tsx` and ready to receive webhooks.

---

## Environment Variables

### Peskids App (.env.local)

Add or verify these variables in `apps/peskids/.env.local`:

```bash
# N8N Webhook for lead capture (from N8N dashboard)
# URL pattern: https://n8n.yourdomain.com/webhook/{workflow-id}
# Or use the global endpoint: https://peskids.op-sly.com/webhooks/lead-capture
NEXT_PUBLIC_N8N_LEAD_WEBHOOK=https://peskids.op-sly.com/webhooks/lead-capture

# Supabase (already configured via Doppler)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Get Current Values from Doppler

```bash
# List all peskids env vars
doppler run --project peskids --config dev -- env | grep -i n8n

# Or fetch specific var
doppler secrets get NEXT_PUBLIC_N8N_LEAD_WEBHOOK --project peskids --config dev
```

---

## N8N Webhook Configuration

### Step 1: Create N8N Webhook Node (in N8N UI)

After deploying N8N on VPS (see PHASE-2-WEEK-1-VPS-SETUP.md):

1. Open N8N: https://peskids.op-sly.com/n8n/
2. Create new workflow: "lead-capture"
3. Add first node: **Webhook**
   - **Node name:** Lead Form Submission
   - **Authentication:** None (or Basic if needed)
   - **HTTP Method:** POST
   - **Path:** `/lead-capture` (or custom)
   - **Full URL will be:** `https://peskids.op-sly.com/webhook/{workflow-id}`

### Step 2: Copy Webhook URL

N8N generates a unique webhook URL:
```
https://peskids.op-sly.com/webhook/abc123def456ghi789
```

### Step 3: Update Environment Variable

Add to `apps/peskids/.env.local`:
```bash
NEXT_PUBLIC_N8N_LEAD_WEBHOOK=https://peskids.op-sly.com/webhook/abc123def456ghi789
```

Or store in Doppler:
```bash
doppler secrets set NEXT_PUBLIC_N8N_LEAD_WEBHOOK "https://peskids.op-sly.com/webhook/abc123def456ghi789" --project peskids --config dev
```

### Step 4: Test Webhook Connection

From your local machine:

```bash
# Test webhook endpoint
curl -X POST https://peskids.op-sly.com/webhook/abc123def456ghi789 \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "phone": "+573001234567",
    "source": "web",
    "class_modality": "domicilio",
    "neighborhood": "Envigado",
    "grade_interested": "3rd",
    "referral_source": null,
    "referred_by_code": null,
    "referral_code": null,
    "consent_treatment": true,
    "consent_marketing": false,
    "consent_policy_version": "2026-05-01"
  }'

# Expected response: 200 OK with N8N workflow execution ID
```

---

## Form Webhook Integration (Already Implemented)

The lead-capture form at `apps/peskids/components/forms/lead-capture-form.tsx` already includes:

### Payload Structure

```typescript
const payload = {
  full_name: form.getValues('full_name'),
  email: form.getValues('email'),
  phone: form.getValues('phone'),
  source: 'web', // hardcoded
  class_modality: form.getValues('class_modality'),
  neighborhood: form.getValues('neighborhood'),
  grade_interested: form.getValues('grade_interested'),
  referral_source: form.getValues('referral_source'),
  referred_by_code: form.getValues('referred_by_code'),
  referral_code: form.getValues('referral_code'),
  consent_treatment: form.getValues('consent_treatment'),
  consent_marketing: form.getValues('consent_marketing'),
  consent_policy_version: '2026-05-01',
}
```

### Webhook Call (Non-Blocking)

```typescript
const webhookUrl = process.env.NEXT_PUBLIC_N8N_LEAD_WEBHOOK || 
  'https://peskids.op-sly.com/webhooks/lead-capture'

void fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
}).catch((error) => {
  console.warn('Webhook submission failed:', error.message)
})
```

---

## Testing the Integration

### 1. Local Form Test

```bash
npm run dev --workspace apps/peskids
# Navigate to http://localhost:3004/familias/landing
# Fill out lead capture form
# Submit
# Check N8N UI for received webhook execution
```

### 2. Verify N8N Received Data

In N8N UI:
1. Click on "lead-capture" workflow
2. Go to **Executions** tab
3. Find latest execution (should show webhook payload)
4. Expand to see full input data

### 3. Check Supabase (After RLS Applied)

```sql
-- In Supabase SQL Editor
SELECT id, full_name, email, source, created_at 
FROM leads 
WHERE tenant_slug = 'peskids' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## Troubleshooting

### Webhook URL Not Configured

**Error:** Form submits but N8N doesn't receive it

**Fix:**
1. Check `NEXT_PUBLIC_N8N_LEAD_WEBHOOK` env var is set
2. Verify webhook URL is accessible: `curl -I https://peskids.op-sly.com/webhook/...`
3. Check N8N container logs: `docker logs tenant_peskids`

### Form Submission Fails

**Error:** "Network error" or CORS issue

**Possible causes:**
1. N8N webhook URL is wrong or malformed
2. N8N container is not running
3. Webhook authentication is misconfigured

**Fix:**
```bash
# Verify N8N is running on VPS
ssh vps-dragon@100.120.151.91
docker logs tenant_peskids | tail -20

# Check webhook URL format
curl -v https://peskids.op-sly.com/webhook/{workflow-id}
```

### N8N Not Saving Leads to Supabase

**Error:** Webhook received but no data in `leads` table

**Possible causes:**
1. N8N workflow missing "Write to DB" node
2. Supabase credentials not configured in N8N
3. RLS policy blocking inserts

**Fix:**
1. In N8N workflow, add node: **Supabase** → Insert
2. Configure credentials:
   - Project URL: `https://xxxxx.supabase.co`
   - API Key: (service role key from Doppler)
   - Table: `leads`
3. Map webhook fields to table columns
4. Test workflow

---

## Deployment Checklist

- [ ] N8N deployed on VPS (`docker ps | grep tenant_peskids`)
- [ ] Webhook URL copied from N8N UI
- [ ] `.env.local` updated with `NEXT_PUBLIC_N8N_LEAD_WEBHOOK`
- [ ] Or Doppler secret updated
- [ ] Form test submission successful
- [ ] N8N shows execution in Executions tab
- [ ] Supabase shows new `leads` record
- [ ] RLS policies applied (see PHASE-2-WEEK-1-RLS-POLICIES.sql)

---

## Next Steps

1. **Deploy N8N on VPS** — see PHASE-2-WEEK-1-VPS-SETUP.md
2. **Create lead-capture workflow** — webhook → write to Supabase
3. **Create hot-lead-alert workflow** — triggered by `status = 'hot'`
4. **Test form end-to-end** — submit → N8N → Supabase → dashboard
5. **Enable RLS policies** — apply SQL from PHASE-2-WEEK-1-RLS-POLICIES.sql

---

## References

- **Lead Capture Form:** `apps/peskids/components/forms/lead-capture-form.tsx`
- **N8N Webhooks Docs:** https://docs.n8n.io/workflows/triggers/webhook/
- **Supabase Integration:** https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/
- **Phase 2 Week 1 Setup:** PHASE-2-WEEK-1-VPS-SETUP.md
- **RLS Policies:** PHASE-2-WEEK-1-RLS-POLICIES.sql
