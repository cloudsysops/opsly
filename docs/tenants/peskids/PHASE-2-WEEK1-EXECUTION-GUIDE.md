---
status: draft
owner: operations
last_review: 2026-05-24
type: tenant
tags:
  - opsly/tenant
---

# Phase 2 Week 1 Execution Guide — Step-by-Step

**Timeline:** May 24-31, 2026  
**Owner:** sierrasantiago90@gmail.com (implementation) + ops team (support)  
**Status:** Code ready, awaiting SSH access to VPS

---

## 📋 Prerequisites (Before You Start)

### ✅ Already Complete (Code Prepared)
- [x] Lead validation schema (`apps/peskids/lib/validation/lead.schema.ts`)
- [x] Updated lead capture form to POST to N8N webhook
- [x] N8N workflow guide (`docs/tenants/peskids/N8N-WORKFLOWS-GUIDE.md`)
- [x] RLS policies migration (`apps/peskids/migrations/20260524_...sql`)
- [x] Environment config updated (`.env.example`)

### ⚠️ Required Before Day 1 Execution
- [ ] SSH access via Tailscale to VPS (100.120.151.91)
- [ ] Doppler secrets configured (`ops-intcloudsysops/prd`):
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `DISCORD_WEBHOOK_PESKIDS`
  - [ ] `RESEND_API_KEY`

---

## 🚀 Day 1 (Friday, May 24)

### Morning: N8N Setup (2 hours, 9:00-11:00)

**9:00 - SSH to VPS and run setup script:**

```bash
# From your local machine (with SSH access)
ssh vps-dragon@100.120.151.91

# Once connected, verify Docker is running
docker ps

# Exit SSH for now (we'll use the script)
exit
```

**9:15 - Run N8N setup script from local machine:**

```bash
cd /path/to/opsly

./scripts/setup-n8n-tenant.sh --vps-host 100.120.151.91 --tenant peskids

# Expected output:
# ✅ SSH connection verified
# 📋 Checking existing containers...
# 📦 Container tenant_peskids not found. Creating...
# 🔧 Starting container...
# ✅ N8N Setup Complete
# 📍 Next Steps:
#    1. Access n8n UI: https://peskids.op-sly.com/n8n/
```

**9:45 - Verify N8N UI loads:**

```bash
# Test HTTP request
curl -s https://peskids.op-sly.com/n8n/ | head -50

# Or open in browser:
# https://peskids.op-sly.com/n8n/
```

**Expected:** You see N8N login page or setup wizard.

**10:00 - Test webhook endpoint:**

```bash
curl -X POST https://peskids.op-sly.com/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected response (or similar):
# { "ok": false, "message": "No matching workflow" }
# (404 is OK at this point — no workflows created yet)
```

**✅ Commit Day 1 Morning:**

```bash
git add apps/peskids/lib/validation/lead.schema.ts \
        apps/peskids/.env.example \
        docs/tenants/peskids/N8N-WORKFLOWS-GUIDE.md

git commit -m "feat(peskids): prepare phase 2 week 1 - n8n setup, lead validation schema"
git push origin feat/peskids-phase2
```

---

### Afternoon: Create Lead Capture Workflow (2 hours, 14:00-16:00)

**14:00 - Access N8N dashboard:**

1. Open https://peskids.op-sly.com/n8n/
2. Create admin account (email: sierrasantiago90@gmail.com, password: strong password)
3. Click **"Create workflow"**
4. Name it: **lead-capture**

**14:15 - Build the workflow (follow these exact steps):**

**Step 1: Add Webhook Trigger**
- Click **"+"** → Search "Webhook"
- Select **Webhook** node
- In the right panel:
  - **Method:** POST
  - **URL path:** `/lead-capture`
  - **Respond when:** First function was executed
  - **Authentication:** None
- Click the node and copy the full webhook URL (looks like `https://...`)

**Step 2: Add Supabase Node**
- Click **"+"** → Search "Supabase"
- Select **Supabase** node
- Connect it from Webhook node (drag line)
- In the right panel, click **"Credentials"** → **"Create new"**
- Fill in:
  - **URL:** `${NEXT_PUBLIC_SUPABASE_URL}` (from Doppler prd config)
  - **API Key:** `${SUPABASE_SERVICE_ROLE_KEY}` (from Doppler prd config)
- Click **Create** to save credentials
- Back to the Supabase node:
  - **Operation:** Insert
  - **Table:** leads
  - **Columns to insert:**
    - `full_name` ← webhook → `full_name`
    - `email` ← webhook → `email`
    - `phone` ← webhook → `phone`
    - `source` ← webhook → `source`
    - `class_modality` ← webhook → `class_modality`
    - `neighborhood` ← webhook → `neighborhood`
    - `grade_interested` ← webhook → `grade_interested`
    - `referral_source` ← webhook → `referral_source`
    - `status` ← static → `"new"`
    - `tenant_slug` ← static → `"peskids"`

**Step 3: Add HTTP Response**
- Click **"+"** → Search "HTTP"
- Select **HTTP Response** node
- Connect it from Supabase node
- In the right panel:
  - **Status Code:** 200
  - **Response Body (JSON):**
  ```json
  {
    "ok": true,
    "message": "Lead received successfully",
    "id": "{{ $node['Supabase'].json.id }}"
  }
  ```

**14:45 - Test the workflow:**

```bash
# Copy the webhook URL from N8N UI and test locally:
curl -X POST https://peskids.op-sly.com/webhooks/lead-capture \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "María García Test",
    "email": "maria@test.com",
    "phone": "3001234567",
    "source": "web",
    "class_modality": "domicilio",
    "neighborhood": "Envigado",
    "grade_interested": "6-8",
    "referral_source": "Instagram"
  }'

# Expected response:
# { "ok": true, "message": "Lead received successfully", "id": "..." }
```

**15:00 - Verify in Supabase:**

1. Open Supabase dashboard → Project `jkwykpldnitavhmtuzmo`
2. Navigate to **leads** table
3. You should see your test lead with:
   - `full_name` = "María García Test"
   - `email` = "maria@test.com"
   - `status` = "new"
   - `created_at` = current timestamp

**15:30 - Save and activate workflow:**

In N8N:
- Click **Save** (top right)
- Click **Activate** toggle (make sure it's **ON**)
- You should see "Workflow activated" confirmation

**✅ Commit Day 1 Afternoon:**

```bash
git add apps/peskids/components/forms/lead-capture-form.tsx

git commit -m "feat(peskids): update lead capture form to post to n8n webhook (phase 2 day 1)"
git push origin feat/peskids-phase2
```

---

## ✅ Day 2 (Saturday, May 25)

### Morning: Hot Lead Alert Workflow (2 hours, 9:00-11:00)

**In N8N Dashboard:**

1. Click **"Create workflow"**
2. Name it: **hot-lead-alert**

**Build the workflow:**

**Step 1: Add Supabase Polling Trigger**
- Click **"+"** → Search "Supabase"
- Select **Supabase** node
- **Operation:** Execute query
- **Query:**
  ```sql
  SELECT * FROM leads 
  WHERE source = 'web' 
  AND status = 'new' 
  AND created_at > NOW() - INTERVAL '5 minutes'
  ORDER BY created_at DESC 
  LIMIT 1
  ```

**Step 2: Add Condition (only alert for new leads)**
- Click **"+"** → Search "Condition"
- Select **Condition** node
- **Condition:** `{{ $node['Supabase'].json[0].id }}` exists
  (Ensures there's a new lead)

**Step 3: Add Discord Webhook**
- Click **"+"** on the true branch → Search "Discord"
- Select **Discord** node
- **Message format:**
  ```
  🔥 **New Peskids Lead!**
  
  👤 **Name:** {{ $node['Supabase'].json[0].full_name }}
  📧 **Email:** {{ $node['Supabase'].json[0].email }}
  📞 **Phone:** {{ $node['Supabase'].json[0].phone }}
  📍 **Location:** {{ $node['Supabase'].json[0].neighborhood }} ({{ $node['Supabase'].json[0].class_modality }})
  👧 **Level:** {{ $node['Supabase'].json[0].grade_interested }}
  🔗 **Source:** {{ $node['Supabase'].json[0].referral_source }}
  ⏰ **Time:** {{ $node['Supabase'].json[0].created_at }}
  ```

**Step 4: Add Email (Resend)**
- Click **"+"** on the true branch → Search "Resend"
- Select **Resend** node
- **To:** sierrasantiago90@gmail.com
- **Subject:** 🔥 New Peskids Lead: {{ $node['Supabase'].json[0].full_name }}
- **Body:** (same as Discord, formatted as HTML email)

**Configure polling:**
- In the Supabase node, click **"Polling interval"**
- Set to: **Every 2 minutes** (120 seconds)

**Test:**
1. Submit a test lead via the form (or curl command from Day 1)
2. Within 2 minutes, you should receive:
   - Discord notification in owner's Discord server
   - Email to sierrasantiago90@gmail.com

**Save & Activate:**
- Click **Save**
- Click **Activate** toggle (ON)

**✅ Commit Morning:**

```bash
git add -A
git commit -m "feat(peskids): n8n hot-lead-alert workflow - discord and email (day 2 morning)"
git push origin feat/peskids-phase2
```

---

### Afternoon: Update Landing Page Form (2 hours, 14:00-16:00)

**✅ Already done in code!**

The form (`apps/peskids/components/forms/lead-capture-form.tsx`) is updated to POST to N8N webhook.

**14:00 - Local testing:**

```bash
# Start dev server
npm run dev

# Navigate to http://localhost:3004
# Fill out the lead form
# It should POST to the N8N webhook URL
# You should see "Thank you" page
```

**14:30 - Verify with curl:**

```bash
# Test the updated form endpoint
curl -X POST https://peskids.op-sly.com/webhooks/lead-capture \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test From Landing Page",
    "email": "test-landing@example.com",
    "phone": "555-9999",
    "source": "web",
    "class_modality": "llanogrande",
    "neighborhood": "Llanogrande",
    "grade_interested": "K-5",
    "referral_source": "Google"
  }'
```

**15:00 - Build for production:**

```bash
npm run build

# Should complete with no errors
# No warnings about unused code
```

**15:30 - Deploy to VPS (automatic via GitHub Actions):**

```bash
# Push the form update
git add apps/peskids/components/forms/lead-capture-form.tsx \
        apps/peskids/.env.example

git commit -m "feat(peskids): landing page form posts to n8n webhook (day 2 afternoon)"
git push origin feat/peskids-phase2

# CI/CD will automatically deploy to VPS
# Check https://peskids.op-sly.com/
```

**✅ Day 2 Complete**

At this point:
- ✅ Lead capture workflow working (form → Supabase)
- ✅ Hot lead alerts sent to Discord + email
- ✅ Landing page form integrated with N8N
- ✅ Auto-deployment to VPS

---

## ✅ Day 3 (Sunday, May 26)

### Full Day: RLS Policies (6 hours)

**9:00 - Create & apply migration:**

```bash
# Migration file already created:
# apps/peskids/migrations/20260524_add_rls_policies_peskids.sql

# Apply locally (for testing):
npm run db:migrate --workspace=@intcloudsysops/migrations

# Or via Supabase CLI:
supabase db push --project-id jkwykpldnitavhmtuzmo
```

**9:30 - Test RLS enforcement:**

```bash
# As admin (sierrasantiago90@gmail.com):
# Query: SELECT COUNT(*) FROM leads;
# Expected: All leads returned

# As staff member (different user):
# Query: SELECT COUNT(*) FROM leads;
# Expected: Only leads created by self

# As parent:
# Query: SELECT * FROM students WHERE parent_id = auth.uid();
# Expected: Only own children
```

**11:30 - Verify policies are active:**

In Supabase dashboard:
- Navigate to **Authentication** → **Policies**
- You should see:
  - `admin_read_all_leads`
  - `staff_read_own_leads`
  - `teacher_read_own_classes`
  - `parent_read_own_children`
  - etc.

**14:00-16:00 - Write test queries:**

Create a file `docs/tenants/peskids/RLS-TEST-QUERIES.md` with test cases for each role.

**✅ Commit Day 3:**

```bash
git add apps/peskids/migrations/20260524_add_rls_policies_peskids.sql \
        docs/tenants/peskids/RLS-TEST-QUERIES.md

git commit -m "feat(db): rls policies for multi-user tenant isolation (phase 2 day 3)"
git push origin feat/peskids-phase2
```

---

## ✅ Days 4-5 (May 27-28) — Buffer & Testing

**If ahead of schedule:**
- Start Week 2 tasks (Teacher Dashboard)
- Create additional N8N workflows (daily digest)
- Write tests for RLS behavior

**If behind:**
- Debug N8N connectivity issues
- Refine lead validation
- Test RLS policies more thoroughly

---

## 📊 Success Checklist (End of Week 1)

- [ ] N8N container running on VPS (`docker ps | grep tenant_peskids`)
- [ ] Lead form → N8N webhook → Supabase (verified with test lead)
- [ ] Hot lead alert sent to Discord within 2 minutes
- [ ] Hot lead alert email sent to sierrasantiago90@gmail.com
- [ ] Landing page form works end-to-end (http://localhost:3004 + deployed)
- [ ] RLS policies applied (no errors during `supabase db push`)
- [ ] RLS policies tested (queries filtered by role)
- [ ] All code committed to `feat/peskids-phase2`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] All commits follow convention: `feat(peskids): description`

---

## 🆘 Troubleshooting

### N8N Container Won't Start
```bash
# Check logs
ssh vps-dragon@100.120.151.91
docker logs tenant_peskids | tail -50

# Common issues:
# - Postgres port conflict
# - Insufficient memory
# - Supabase credentials wrong
```

### Webhook Returns 404
```bash
# Verify workflow is activated
# In N8N UI: click workflow → ensure "Activate" toggle is ON

# Verify URL path matches
# Form should POST to: https://peskids.op-sly.com/webhooks/lead-capture
# (NOT /webhook/lead-capture — note the "s" in "webhooks")
```

### Supabase Insert Fails
```bash
# Check table schema
curl -s https://api.supabase.co/schema/leads \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}"

# Temporarily disable RLS for testing:
# ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
# (Re-enable after testing)
```

### RLS Policies Not Working
```bash
# Verify policies exist
SELECT * FROM pg_policies WHERE tablename = 'leads';

# Check policy definition
SELECT schemaname, tablename, policyname, qual FROM pg_policies 
WHERE tablename = 'leads' LIMIT 5;
```

---

## 📝 Next Phase (Week 2)

Once Week 1 is complete:
1. **Teacher Dashboard** (Day 1-2)
2. **Parent Portal Preview** (Day 2-3, optional)
3. **WhatsApp Integration** (Day 3-5)
4. **Daily Follow-Up Digest** (Day 5)

See `PHASE-2-IMPLEMENTATION-PLAN.md` for full Week 2 details.

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
