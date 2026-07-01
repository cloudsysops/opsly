---
status: in-progress
owner: operations
created: 2026-07-01
updated: 2026-07-01
type: migration
tags:
  - n8n
  - workflow-automation
  - ghl-replacement
  - opsly
---

# n8n Migration Plan — Replace GoHighLevel (GHL) with Self-Hosted n8n

**Objective:** Remove all GoHighLevel subscriptions and migrate all CRM/ERP workflows to n8n (open-source, self-hosted).  
**Cost Impact:** $0/month (vs. current GHL subscription fees)  
**Infrastructure:** VPS Tailscale `100.120.151.91` (existing)

---

## Phase 1: ERP Workflows (ICSO — Intcloudsysops)

### 1.1 Remove GHL Sync Code
**Files to delete:**
- `apps/intcloudsysops/lib/gohighlevel-sync.ts` — all GHL sync functions
- `apps/intcloudsysops/app/api/webhooks/ghl-sync/route.ts` — GHL webhook endpoint

**API Routes to update:**
- Keep `/api/accounts`, `/api/deals`, `/api/contacts` (internal APIs only)
- Remove any GHL-specific env vars from `.env.example`

**Env vars to remove:**
- `GOHIGHLEVEL_API_KEY`
- `GOHIGHLEVEL_LOCATION_ID`
- `GOHIGHLEVEL_BASE_URL`
- `GOHIGHLEVEL_API_VERSION`
- `GOHIGHLEVEL_WEBHOOK_SECRET`

---

### 1.2 n8n Workflows for ICSO ERP

#### Workflow 1: Account Lifecycle
**Trigger:** POST `/api/accounts` (account created/updated in dashboard)  
**Flow:**
1. Supabase insert/update `accounts` table
2. Send Slack notification → #ops-erp-accounts with:
   - Account name, type (prospect/customer/partner)
   - Account owner (assigned_to)
   - Key contacts count
3. Trigger deal pipeline check (see Workflow 3)

**n8n nodes:**
- Webhook (POST from API)
- Supabase (Insert/Update)
- Slack (Notification)
- Return 200 OK

---

#### Workflow 2: Contact & Follow-up Management
**Trigger:** POST `/api/contacts` (new contact created)  
**Flow:**
1. Insert contact to Supabase
2. Check if contact is a decision_maker → send priority Slack alert
3. Auto-create follow-up task (due: 3 days from now)
4. Schedule daily digest of pending follow-ups (8 AM)

**n8n nodes:**
- Webhook trigger
- Supabase insert
- Conditional logic (if role == decision_maker)
- Slack notification (priority)
- Supabase insert `followups` table
- Cron trigger (daily @ 8am) → compile follow-ups digest
- Slack digest post

**Followups table schema:**
```
- id (UUID)
- tenant_slug = 'intcloudsysops'
- contact_id (FK)
- related_type = 'contact' | 'deal' | 'account'
- due_at (timestamp)
- assigned_to (user email)
- status = 'pending' | 'done'
- created_at, updated_at
```

---

#### Workflow 3: Deal Pipeline & Revenue Tracking
**Trigger:** POST `/api/deals` (deal created/stage changed)  
**Flow:**
1. Insert/update deal in Supabase
2. If stage == 'won' → update `accounts.monthly_revenue` (for dashboard KPI)
3. If stage change → log to analytics table
4. Send Slack alert if deal closes > $10k

**n8n nodes:**
- Webhook trigger
- Supabase operations (insert, update, query)
- HTTP → revenue calculation
- Conditional logic (stage == 'won' && value > 10000)
- Slack alerts

**Analytics table (new):**
```
- id (UUID)
- tenant_slug
- entity_type = 'deal' | 'account' | 'contact'
- entity_id (UUID)
- event_type = 'created' | 'stage_changed' | 'won' | 'lost'
- old_value, new_value (JSON)
- created_at
```

---

### 1.3 Dashboard Integration
**Update `/apps/intcloudsysops/app/dashboard/page.tsx`:**
- Remove GHL sync status checks
- Add n8n workflow status indicator (optional—just for visibility)
- KPIs now sourced from Supabase only (no external sync)

**SQL query for monthly revenue (replace current logic):**
```sql
SELECT SUM(value) as monthly_revenue
FROM deals
WHERE tenant_slug = 'intcloudsysops'
  AND stage = 'won'
  AND date_trunc('month', close_date) = date_trunc('month', NOW());
```

---

## Phase 2: CRM Workflows (Peskids — Education Platform)

### 2.1 Lead Capture & Form Submission
**Trigger:** Form POST from landing page → `/n8n/webhooks/lead-capture`  
**Flow:**
1. Validate input (Zod schema in n8n or API)
2. Insert lead to `leads` table (status = 'new')
3. Send confirmation email to form submitter
4. Send Slack alert to sales team (#peskids-leads)
5. Auto-assign follow-up (due: 24 hours)

**n8n nodes:**
- Webhook (POST from form)
- Supabase insert `leads`
- HTTP → send email (via SendGrid or internal service)
- Slack notification
- Supabase insert `followups`
- Return 200 OK

**Lead table fields:**
```
- id (UUID)
- tenant_slug = 'peskids'
- full_name, email, phone
- source = 'web' | 'referral' | 'event' | 'manual'
- status = 'new' | 'contacted' | 'qualified' | 'lost' | 'converted'
- notes (text)
- created_at, contacted_at, converted_at
```

---

### 2.2 Student Enrollment & Parent Notifications
**Trigger:** Student enrolled (dashboard action) → POST `/api/students`  
**Flow:**
1. Insert student record
2. Send parent welcome email (template: Spanish + English)
3. Create parent account if not exists
4. Schedule class schedule notification (1 day before class)

**n8n nodes:**
- Webhook trigger
- Supabase operations (insert student, upsert parent)
- Email service (SendGrid)
- Cron trigger → check upcoming classes → send reminder emails

---

### 2.3 Feedback & Teacher Reports
**Trigger:** Parent/teacher submits feedback → POST `/api/feedback`  
**Flow:**
1. Insert feedback record
2. If rating < 3 → high-priority alert to owner
3. Weekly digest (Sunday 6 PM): compile all feedback, send to owner
4. Monthly report: aggregate by class, generate summary stats

**n8n nodes:**
- Webhook trigger
- Supabase insert `feedback`
- Conditional logic (rating < 3)
- Slack high-priority alert
- Cron trigger (weekly) → compile digest → email
- Cron trigger (monthly) → aggregate → email report

---

### 2.4 Jelou (WhatsApp) Integration
**Trigger:** Inbound WhatsApp message from Jelou  
**Flow:**
1. Receive message from Jelou webhook
2. Extract phone number → find parent record
3. Smart routing:
   - Enrollment question → auto-reply with class info
   - Payment question → route to admin
   - General inquiry → route to teacher
4. Store message in `messages` table (approval_status: pending)

**n8n nodes:**
- Webhook from Jelou
- Supabase query (find parent by phone)
- Conditional logic (message content analysis)
- Jelou HTTP → send auto-reply
- Slack notification (route to admin/teacher)
- Supabase insert `messages`

---

## Phase 3: Deployment & Testing

### 3.1 n8n Container Setup (VPS)
```bash
# SSH into VPS
ssh vps-dragon@100.120.151.91

# Deploy n8n for ICSO
docker run -d \
  --name n8n-icso \
  -p 5678:5678 \
  -e N8N_HOST=icso.op-sly.com \
  -e N8N_PROTOCOL=https \
  -e DB_TYPE=postgres \
  -e DB_POSTGRESS_HOST=<RDS_ENDPOINT> \
  -e DB_POSTGRESS_DATABASE=n8n_icso \
  -v n8n_icso_data:/home/node/.n8n \
  n8nio/n8n

# Deploy n8n for Peskids
docker run -d \
  --name n8n-peskids \
  -p 5679:5678 \
  -e N8N_HOST=peskids.op-sly.com \
  -e N8N_PROTOCOL=https \
  -e DB_TYPE=postgres \
  -e DB_POSTGRESS_HOST=<RDS_ENDPOINT> \
  -e DB_POSTGRESS_DATABASE=n8n_peskids \
  -v n8n_peskids_data:/home/node/.n8n \
  n8nio/n8n

# Proxy via Traefik
# Add labels to docker-compose.yml for both services
```

### 3.2 Supabase Table Additions
```sql
-- Analytics table (ICSO)
CREATE TABLE IF NOT EXISTS public.analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL CHECK (tenant_slug IN ('intcloudsysops', 'peskids')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_tenant CHECK (tenant_slug = 'intcloudsysops')
);

-- Followups table (both tenants)
CREATE TABLE IF NOT EXISTS public.followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  related_type TEXT NOT NULL, -- 'contact' | 'deal' | 'lead' | 'student'
  related_id UUID NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  assigned_to TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'done' | 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table (Peskids — Jelou integration)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT DEFAULT 'peskids',
  channel TEXT NOT NULL, -- 'whatsapp' | 'email' | 'sms'
  direction TEXT NOT NULL, -- 'inbound' | 'outbound'
  from_phone TEXT,
  from_email TEXT,
  to_phone TEXT,
  to_email TEXT,
  body TEXT NOT NULL,
  approval_status TEXT DEFAULT 'pending', -- 'approved' | 'rejected' | 'pending'
  approved_by TEXT,
  related_type TEXT, -- 'parent' | 'student' | 'teacher'
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- Enable RLS on all
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies (tenant isolation)
CREATE POLICY "analytics_tenant_isolation" ON public.analytics
  FOR SELECT USING (tenant_slug = 'intcloudsysops');

CREATE POLICY "followups_tenant_isolation" ON public.followups
  FOR SELECT USING (
    (tenant_slug = 'intcloudsysops' AND auth.uid()::text = 'icso-admin') OR
    (tenant_slug = 'peskids' AND auth.uid()::text = 'peskids-admin')
  );

CREATE POLICY "messages_tenant_isolation" ON public.messages
  FOR SELECT USING (tenant_slug = 'peskids');
```

### 3.3 Smoke Test (n8n Workflows)
```bash
# Test ICSO account creation workflow
curl -X POST https://icso.op-sly.com/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Acme Corp",
    "accountType": "prospect",
    "industry": "SaaS",
    "website": "https://acme.test"
  }' \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Expected: Supabase record created + Slack alert sent

# Test Peskids lead capture
curl -X POST https://peskids.op-sly.com/n8n/webhooks/lead-capture \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Maria García",
    "email": "maria@example.com",
    "phone": "555-1234",
    "source": "web"
  }'

# Expected: Lead inserted + confirmation email sent + Slack alert + follow-up created
```

---

## Phase 4: Cutover & Cleanup

### 4.1 Remove GHL Completely
```bash
cd apps/intcloudsysops

# Delete files
git rm lib/gohighlevel-sync.ts
git rm app/api/webhooks/ghl-sync/route.ts

# Update .env.example
# Remove all GOHIGHLEVEL_* variables

# Commit
git commit -m "feat(icso): remove GoHighLevel dependency, migrate to n8n"
git push origin feat/n8n-migration
```

### 4.2 Update Documentation
- Update CLAUDE.md for Peskids & ICSO
- Add N8N-WORKFLOWS.md for each tenant
- Remove any GHL references from docs
- Add n8n setup guide to runbooks

### 4.3 Monitoring & Alerts
- Set up n8n workflow error alerts → Slack #opsly-alerts
- Monitor n8n container health (Uptime Kuma)
- Log all workflow executions to Supabase `analytics` table
- Weekly workflow performance report

---

## Timeline

| Phase | Task | Duration | Owner |
|-------|------|----------|-------|
| **1** | Remove GHL code, create n8n instances | 2h | ops |
| **1** | Build 3 ICSO workflows (account, contact, deal) | 4h | ops |
| **2** | Build 4 Peskids workflows (lead, student, feedback, jelou) | 6h | ops |
| **3** | Deploy to VPS, test all workflows | 3h | ops |
| **4** | Cutover & monitoring | 1h | ops |
| **Total** | | **16h** | |

---

## Risk Mitigation

- **n8n downtime:** Keep n8n container health monitored; have manual fallback (send emails directly if n8n fails)
- **Workflow bugs:** Test each workflow with sample data before going live
- **Database:** Backup Supabase before cutover
- **Notification delays:** Set reasonable retry logic (3x with exponential backoff)

---

## Success Criteria

✅ All GHL code removed  
✅ n8n workflows for ICSO operational  
✅ n8n workflows for Peskids operational  
✅ Dashboard KPIs reflect n8n data (not external sync)  
✅ No monthly GHL charges  
✅ All workflows monitored & alerting  
✅ Disaster recovery runbook updated  

---

**Next Step:** Start Phase 1 — remove GHL, set up n8n instances.
