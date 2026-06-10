---
status: draft
owner: operations
version: 1.0
last_review: 2026-06-10
---

# Opsly Client Onboarding Playbook — Repeatable Process

**Goal:** Onboard a second client (after Peskids) using a repeatable, minimally-manual checklist.

**Key Metrics:**
- Total onboarding time: **3-5 business days**
- Automatic setup time: **30 min**
- Manual setup time: **2-4 hours** (distributed)
- Blockers: **API keys, GHL private integration, Billing approval**

---

## READINESS MATRIX

### 🟢 READY (Fully Automated)

#### Infrastructure
- [x] Multi-tenant database (Supabase)
- [x] API provisioning endpoints (`/api/provisioning/*)
- [x] Docker Compose tenant isolation
- [x] Doppler secrets management
- [x] Redis/BullMQ orchestration
- [x] Webhook receiver (`/webhooks/*/`)

#### Portal
- [x] Onboarding UI (step-1, step-2, authorize-deployment)
- [x] Tenant dashboard
- [x] API access management
- [x] Invite system (email-based)
- [x] Role-based access control

#### Billing
- [x] Stripe integration
- [x] Subscription management API
- [x] Invoice generation
- [x] Usage tracking framework

---

### 🟡 PARTIAL (Partially Automated, Requires Manual Config)

#### GoHighLevel
- [x] API client library (`@intcloudsysops/services/gohighlevel`)
- [x] Webhook integration framework
- [x] Tag/field/calendar provisioning script (`ghl-provision.ts`)
- [ ] **Manual:** Create private integration in GHL console
- [ ] **Manual:** GHL email/SMS templates (UI only)
- [ ] **Manual:** GHL workflows (UI only, but spec provided)
- **Status:** 60% automated — Needs API key + UI setup

#### n8n
- [x] Docker Compose setup per tenant
- [x] n8n webhook receiver endpoint
- [x] Workflow execution logging
- [x] Tenant isolation (separate DB per tenant)
- [ ] **Manual:** n8n workflow creation (UI or JSON import)
- [ ] **Manual:** OAuth connections (Stripe, Gmail, etc.)
- [ ] **Manual:** Workflow triggers (webhook URL registration)
- **Status:** 50% automated — Needs workflow creation + OAuth

#### Billing
- [x] Stripe API integration
- [x] Customer creation on signup
- [x] Subscription API endpoints
- [ ] **Manual:** Billing onboarding email (template exists, needs customization)
- [ ] **Manual:** Payment method setup (user must enter card)
- **Status:** 70% automated — Needs payment method entry

---

### 🔴 MISSING (Not Yet Implemented)

#### n8n Advanced
- [ ] Workflow templates catalog (per industry/use-case)
- [ ] Pre-built workflow imports
- [ ] OAuth pre-authentication (currently manual per connection)
- **Impact:** Customers must build workflows from scratch or import manually

#### GHL Advanced
- [ ] Form builder API (currently manual UI only)
- [ ] Lead routing rules (API planning incomplete)
- [ ] Custom field templates
- **Impact:** Custom forms require manual GHL UI setup

#### Billing Advanced
- [ ] Usage-based metering (beyond subscription)
- [ ] Multi-currency support (USD only currently)
- [ ] Dunning management (automatic retry on failed payments)
- **Impact:** Limited pricing flexibility

#### Portal Advanced
- [ ] Client self-service n8n workflow builder
- [ ] GHL integration UI (currently docs + manual)
- [ ] Real-time usage dashboard
- **Impact:** Requires manual Slack/email communication during setup

---

## STEP-BY-STEP ONBOARDING CHECKLIST

### PRE-ONBOARDING (Owner/Sales Team)

**Duration:** 30 min  
**Blockers:** Signed contract, payment method

- [ ] **Step 1: Collect client details**
  - Client name (legal)
  - Tenant slug (3-30 chars, lowercase, hyphens allowed)
  - Owner email (primary contact)
  - Expected use-case (lead funnel, CRM, workflow automation, etc.)
  - Estimated monthly leads/contacts

- [ ] **Step 2: Verify access credentials**
  - GHL account access (admin level required)
  - Stripe account (if custom billing needed)
  - n8n workspace ready (if self-hosted, else use platform)
  - Domain ready (if custom domain, else use op-sly.com subdomain)

- [ ] **Step 3: Legal & Compliance**
  - [ ] Data Processing Agreement signed
  - [ ] Privacy Policy reviewed
  - [ ] Industry compliance verified (GDPR, HIPAA, etc.)

---

### PHASE 1: AUTOMATIC SETUP (Infrastructure) — 30 min

**What's happening:** API, database, containers, webhooks

**Executor:** Automated (CLI scripts) or Claude Code (minimal)

#### 1.1 Generate tenant config

```bash
# Interactive mode
bash scripts/generate-tenant-config.sh

# Output example:
# {
#   "tenant_name": "AcmeCRM",
#   "tenant_slug": "acme-crm",
#   "schema_name": "acmecrm",
#   "platform_domain": "op-sly.com",
#   "internal_port": 3005,
#   "pattern_ids": ["crm-starter-stack"]
# }
```

**What's created:**
- `config/tenants/{slug}.json` (validated against schema)
- Supabase schema (if pattern includes database)
- Docker Compose service config

#### 1.2 Create Supabase tenant schema

```bash
npm run migrations:apply -- --tenant {slug}
```

**What's created:**
- PostgreSQL schema named `{slug}`
- Tables: contacts, opportunities, tags, custom_fields, webhook_logs
- RLS policies (tenant isolation)
- Triggers (created_at, updated_at timestamps)

#### 1.3 Create tenant service in Docker Compose

```bash
npm run provision:docker-tenant -- --slug {slug} --port 3005
```

**What's created:**
- `docker-compose.{slug}.yml` (symlink to service)
- Environment variables file (Doppler references)
- Healthcheck endpoint

#### 1.4 Register webhook receivers

```bash
npm run provision:webhooks -- --tenant {slug}
```

**What's created:**
- GHL webhook receiver: `POST /api/public/tenants/{slug}/webhooks/gohighlevel/leads`
- n8n webhook receiver: `POST /api/public/tenants/{slug}/webhooks/n8n/trigger`
- Stripe webhook receiver: `POST /api/public/tenants/{slug}/webhooks/stripe/events`

**Status after Phase 1:**
- ✅ Tenant database ready
- ✅ API endpoints active
- ✅ Docker container can start
- ⚠️ No external integrations yet

---

### PHASE 2: MANUAL SETUP (GoHighLevel) — 2 hours

**What's happening:** GHL private integration, API credentials, templates

**Executor:** Client (with Opsly guidance), or dedicated agent

#### 2.1 Create GHL private integration

**Location:** GHL Console → Settings → Integrations → Create Private Integration

**Steps:**
1. Name: `Opsly {Client Name}`
2. Request scopes (minimum):
   - `locations.readonly`
   - `locations/tags.read` + `locations/tags.write`
   - `locations/customFields.readonly` + `locations/customFields.write`
   - `forms.readonly` + `forms.write`
   - `opportunities.readonly`
   - `calendars.readonly` + `calendars.write` + `calendars/events.write`
   - `contacts.readonly` + `contacts.write`

3. Generate private integration token
4. Copy credentials:
   - **API Key:** `GOHIGHLEVEL_{SLUG}_API_KEY`
   - **Location ID:** `GOHIGHLEVEL_{SLUG}_LOCATION_ID`
   - **Private Integration ID:** `GOHIGHLEVEL_{SLUG}_PRIVATE_INTEGRATION_ID`

**Deliverable:** Doppler secrets set

```bash
doppler secrets set GOHIGHLEVEL_ACMECRM_API_KEY --value "xxxx..." \
  --project ops-intcloudsysops --config prd
```

#### 2.2 Provision GHL tags, fields, calendars via API

```bash
npm run ghl-provision -- \
  --manifest docs/examples/intake/{slug}.json \
  --tenant {slug} \
  --execute
```

**What's created:**
- Tags: `lead-web`, `lead-contacted`, `lead-qualified`, etc.
- Custom fields: `company`, `phone`, `deal_size`, `source`, etc.
- Calendars: Discovery Call, Assessment, Follow-up
- Pipeline stages (if specified in manifest)

**Expected output:**
```
Provisioning report: docs/artifacts/provisioning/provision-report-{slug}.md

Summary:
✓ 8 tags created
✓ 5 custom fields created
✓ 2 calendars created
⚠ 3 templates manual_required (email, SMS)
✓ 1 pipeline validated
```

#### 2.3 Create GHL email/SMS templates

**Manual:** GHL Console → Automation → Email Templates

**Templates needed:**
1. **Welcome Lead**
   - Trigger: Contact Created
   - Subject: "Welcome to {ClientName} — Let's get started"
   - Body: Program overview, next steps, calendar link

2. **Trial/Discovery Confirmation** (if applicable)
   - Trigger: Appointment Scheduled
   - Subject: "Your {appointment type} is confirmed"
   - Body: Date, time, location, what to prepare

3. **Reminder** (SMS or Email)
   - Trigger: 24h before appointment
   - Message: Friendly reminder + action (confirm/reschedule)

**Est. time:** 15 min per template (copy spec from manifest, customize, test)

#### 2.4 Create GHL workflows (optional, but recommended)

**Manual:** GHL Console → Automation → Workflows

**Standard workflows:**
1. **Welcome Lead:** Contact Created → Send Email → Add Tag → Update Stage
2. **Trial Confirmation:** Appointment Scheduled → Send Email → Add Tag → Update Stage
3. **Reminder:** Time-Based (24h before) → Send SMS → Add Tag
4. **No-Show Recovery:** Appointment Status = No Show → Send SMS + Task

**Est. time:** 20 min per workflow (drag & drop in UI)

**Status after Phase 2:**
- ✅ GHL integration active
- ✅ Leads can be created via API
- ✅ Tags & custom fields available
- ✅ Calendars ready for booking
- ⚠️ Email/SMS automations optional (can add later)

---

### PHASE 3: MANUAL SETUP (n8n) — 1 hour

**What's happening:** Workflow engine, OAuth connections, lead routing

**Executor:** Client (with Opsly templates) or Opsly team

#### 3.1 Start n8n tenant service

```bash
docker-compose -f docker-compose.yml -f docker-compose.{slug}.yml up -d n8n-{slug}
```

**Verify:** Visit `https://n8n-{slug}.op-sly.com` → Set admin password

#### 3.2 Connect OAuth integrations

**In n8n Console:**
1. Settings → Credentials → Create
2. Add connectors (examples):
   - Stripe API (webhook receiver)
   - Gmail (email sending)
   - Zapier (if custom workflows)
   - AWS (if Lambda needed)
   - Google Sheets (data export)

**Credentials needed per use-case:**
- Email: Stripe verification emails → Gmail API
- SMS: Twilio API
- Database: Supabase SQL execution

**Est. time:** 10-15 min per OAuth connection

#### 3.3 Import starter workflows

```bash
npm run n8n:import-workflows -- \
  --tenant {slug} \
  --pattern {pattern-id}
```

**Starter workflows (by pattern):**
- **crm-starter-stack:** Lead intake → GHL sync → Tag assignment
- **webinar-funnel:** Registration → Confirmation email → Calendar sync
- **sales-pipeline:** Lead scoring → Auto-qualification → Salesforce update

**Customize:**
- Webhook URLs (auto-filled from API config)
- Error handling (Slack notifications)
- Data mapping (custom field names)

**Est. time:** 20 min (review + customize starter)

#### 3.4 Test n8n webhook receiver

```bash
curl -X POST https://n8n-{slug}.op-sly.com/webhook/lead-intake \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com"}'
```

**Verify:** Check n8n execution logs → Workflow should trigger

**Status after Phase 3:**
- ✅ n8n instance running
- ✅ OAuth connections configured
- ✅ Workflows imported & tested
- ✅ Ready for lead routing

---

### PHASE 4: MANUAL SETUP (Billing) — 30 min

**What's happening:** Stripe subscription, pricing plan, payment method

**Executor:** Client or Opsly billing admin

#### 4.1 Create Stripe customer

**Automatic (via API):**
```
POST /api/provisioning/tenants/{slug}/billing/customer
{
  "email": "billing@acmecrm.com",
  "name": "Acme CRM Inc."
}
```

**Output:** Stripe Customer ID stored in `tenants` table

#### 4.2 Set subscription plan

**Options:**
- **Startup:** $99/mo, 100 contacts, 5 workflows
- **Business:** $299/mo, 1000 contacts, 20 workflows
- **Enterprise:** Custom pricing

**API:**
```
POST /api/provisioning/tenants/{slug}/billing/subscription
{
  "plan_id": "plan_startup",
  "billing_cycle": "monthly"
}
```

#### 4.3 Client adds payment method

**In Portal:** Onboarding Step 2 → Billing → Add Card

**UI:** Stripe Elements (pre-filled form)
**Verification:** 3D Secure (if required by region)

#### 4.4 Verify subscription active

**Dashboard:** Portal → Settings → Billing
- Subscription status: Active
- Next billing date: 30 days from now
- Usage: 0/100 contacts

**Status after Phase 4:**
- ✅ Billing active
- ✅ Subscription created
- ✅ Payment method verified
- ✅ Usage tracking enabled

---

### PHASE 5: LAUNCH & HANDOFF — 30 min

**What's happening:** Domain setup, documentation, training, go-live

**Executor:** Opsly team + Client

#### 5.1 Configure custom domain (optional)

**If using custom domain (e.g., `app.acmecrm.com`):**

1. **Update DNS:** Add CNAME record to Vercel
   ```
   CNAME app.acmecrm.com → cname.vercel-dns.com
   ```

2. **Update Vercel:** Add domain in project settings
3. **Update Portal config:** `NEXT_PUBLIC_PLATFORM_DOMAIN=app.acmecrm.com`

**Alternatively:** Use `{slug}.op-sly.com` (no DNS needed, default)

#### 5.2 Create portal invite

**API:**
```
POST /api/portal/invites
{
  "tenant_slug": "{slug}",
  "email": "admin@acmecrm.com",
  "role": "admin"
}
```

**Email sent:** Click link → Set password → Access portal

#### 5.3 Verify all systems

**Checklist:**
- [ ] Portal loads (`https://op-sly.com`)
- [ ] Tenant dashboard accessible
- [ ] GHL webhooks test: Send test lead, verify in GHL
- [ ] n8n webhooks test: Trigger workflow, verify execution
- [ ] Stripe test transaction succeeds
- [ ] API health check: `GET /api/health` → `200 OK`

**Command:**
```bash
npm run provision:smoke-test -- --tenant {slug}
```

#### 5.4 Client training

**Topics:**
1. Portal navigation (dashboard, settings, API keys)
2. GHL integration (where leads appear, how to update)
3. n8n workflows (how to add custom steps, monitoring)
4. Billing (usage, invoices, upgrade paths)

**Delivery:** 30-min video call + documentation links

#### 5.5 Go live

**Signal:** Client starts sending leads/contacts

**Monitor:**
- Webhook success rate (target: >99%)
- API response times (target: <500ms)
- Error logs (target: <0.1% errors)

**Status after Phase 5:**
- ✅ System live
- ✅ Client accessing portal
- ✅ Data flowing through pipeline
- ✅ Billing active

---

## BLOCKERS & DEPENDENCIES

| Blocker | Impact | Resolution Time | Mitigation |
|---------|--------|-----------------|-----------|
| **GHL API key** | Blocks all GHL integration | 30 min | Provide step-by-step guide to client |
| **Stripe payment method** | Blocks billing, go-live | 5 min | Send reminder email, offer backup payment |
| **n8n OAuth connections** | Blocks workflow execution | 15 min per connection | Pre-create test credentials |
| **Domain registration** (custom) | Blocks custom domain | 24-48 hours | Use `{slug}.op-sly.com` by default |
| **Data Processing Agreement** | Blocks contract, go-live | 1-3 days | Legal review (parallel to tech setup) |
| **Client approval** (for n8n workflows) | Blocks workflow customization | 1 day | Provide starter templates for approval |

---

## TIMELINE ESTIMATE

| Phase | Task | Manual | Auto | Total | Dependencies |
|-------|------|--------|------|-------|--------------|
| **Pre** | Contract, credentials | 30 min | - | 30 min | Sales approval |
| **1** | Infrastructure | 5 min | 25 min | 30 min | None |
| **2** | GoHighLevel | 90 min | 10 min | 100 min | GHL API key |
| **3** | n8n | 30 min | 20 min | 50 min | n8n OAuth ready |
| **4** | Billing | 15 min | 15 min | 30 min | Stripe customer |
| **5** | Launch | 30 min | 5 min | 35 min | All above |
| | **TOTAL** | **200 min** | **75 min** | **3-5 days** | Sequential |

**Parallelizable:** Phases 2, 3, 4 can run concurrently → Total time **2 days** with parallel execution

---

## READINESS ASSESSMENT

### Infrastructure: 🟢 READY

```
✅ Multi-tenant database
✅ API provisioning endpoints
✅ Docker isolation per tenant
✅ Doppler secrets
✅ Webhook receivers
✅ Redis orchestration
✅ Health monitoring

Time to set up new tenant: 30 min (automated)
Manual effort: 5 min (review config)
Blockers: None
```

### GoHighLevel: 🟡 PARTIAL

```
✅ API client library ready
✅ Tag/field/calendar provisioning (script ready)
✅ Webhook receiver ready
❌ Private integration creation (manual GHL console)
❌ Email/SMS templates (manual UI)
❌ Workflows (manual UI, specs provided)

Time to set up: 2 hours (mostly manual UI)
Manual effort: 90 min
Blockers: GHL API key, private integration approval
```

### n8n: 🟡 PARTIAL

```
✅ Docker Compose setup ready
✅ Multi-tenant isolation
✅ Webhook receiver ready
✅ Execution logging
❌ Workflow templates (need catalog)
❌ OAuth pre-authentication (manual per connection)
❌ Workflow builder UI (requires client expertise)

Time to set up: 1 hour (with starter templates)
Manual effort: 30 min
Blockers: OAuth credentials, workflow customization approval
```

### Portal: 🟢 READY

```
✅ Onboarding UI (step-1, step-2)
✅ Tenant dashboard
✅ API key management
✅ Invite system
✅ RBAC (role-based access control)

Time to set up: 10 min
Manual effort: 5 min (send invite)
Blockers: None (automatic on tenant creation)
```

### Billing: 🟡 PARTIAL

```
✅ Stripe integration
✅ Subscription creation API
✅ Invoice generation
✅ Usage tracking framework
❌ Multi-currency support (USD only)
❌ Usage-based metering (beyond subscription)
❌ Dunning management (automatic retries)

Time to set up: 30 min
Manual effort: 15 min (client adds payment method)
Blockers: Stripe account, payment method
```

---

## QUICK START COMMAND

For Opsly operators, condensed version:

```bash
# 1. Generate config
bash scripts/generate-tenant-config.sh --slug acme-crm --email admin@acme.com --plan startup

# 2. Provision infrastructure
npm run provision:tenant -- --slug acme-crm --execute

# 3. Create Doppler secrets (manual, but template provided)
doppler secrets set GOHIGHLEVEL_ACMECRM_API_KEY --value "xxxx..."

# 4. Provision GHL resources
npm run ghl-provision -- --manifest docs/examples/intake/acme-crm.json --tenant acme-crm --execute

# 5. Start n8n
docker-compose -f docker-compose.yml -f docker-compose.acme-crm.yml up -d n8n-acme-crm

# 6. Run smoke tests
npm run provision:smoke-test -- --tenant acme-crm

# 7. Send portal invite
npm run provision:invite -- --tenant acme-crm --email admin@acme.com --role admin
```

**Total execution time:** 45 min (mostly watching automated steps)

---

## LESSONS LEARNED FROM ICSO & PESKIDS

### What Worked ✅

- **Multi-tenant isolation at API level** — no cross-contamination
- **Webhook receiver pattern** — simple, reliable, scalable
- **Doppler for secrets** — no keys in code
- **Docker Compose for local dev** — easy to test new tenants
- **GHL provisioning script** — saves 30+ min per tenant

### What's Hard 🔴

- **GHL private integration approval** — takes 30 min of manual clicking
- **n8n OAuth setup** — each provider needs separate credentials
- **Email/SMS templates** — GHL UI only, no API export/import
- **Workflow templates** — n8n doesn't have catalog; customers build from scratch
- **Custom domain DNS** — requires client domain access, 24h propagation

### What's Missing 🚫

- **Billing onboarding email** — template exists, needs personalization per client
- **GHL workflow templates** — specifications written, need GHL UI implementation
- **n8n workflow catalog** — starter templates needed per industry
- **Portal step-by-step guides** — reduce need for training calls
- **Automated compliance checks** — GDPR, CCPA, HIPAA validation

---

## RECOMMENDATIONS FOR NEXT CLIENT

### Day 1 (Pre-work)

```
[ ] Legal review (DPA signed)
[ ] GHL account confirmed (admin access)
[ ] Stripe account created
[ ] Slack channel created (acme-crm-support)
```

### Day 2 (Parallel tracks)

**Track A (Opsly):** Run automated provisioning (30 min)  
**Track B (Client):** Create GHL private integration + add payment method (90 min)  
**Track C (Opsly):** Provision GHL, create email templates (60 min)

### Day 3 (n8n + Testing)

```
[ ] Start n8n service
[ ] Client configures OAuth connections
[ ] Import & customize starter workflows
[ ] Run smoke tests
[ ] Client training (30 min call)
```

### Day 4 (Go live)

```
[ ] Client sends first lead
[ ] Verify end-to-end flow
[ ] Monitor webhooks (24h)
```

---

## FINAL CHECKLIST FOR NEXT CLIENT

- [ ] Pre-onboarding complete (legal, credentials, DPA)
- [ ] Tenant config created & validated
- [ ] Database schema provisioned
- [ ] Doppler secrets set (GHL, n8n, Stripe)
- [ ] GHL private integration created
- [ ] GHL resources provisioned (tags, fields, calendars)
- [ ] GHL email/SMS templates created
- [ ] n8n service running
- [ ] n8n OAuth connections configured
- [ ] n8n starter workflows imported
- [ ] Stripe subscription created
- [ ] Client payment method added
- [ ] Portal invite sent & verified
- [ ] Smoke tests passing (GHL, n8n, Stripe)
- [ ] Domain configured (custom or default)
- [ ] Client training completed
- [ ] Monitoring & alerts configured
- [ ] Documentation updated (client-specific)
- [ ] Go-live approval from client
- [ ] First lead verified in GHL
