---
status: active
owner: operations
created: 2026-06-10
purpose: "Repeatable onboarding process for new clients on Opsly platform"
---

# Second Client Onboarding Playbook

**Objective:** Rapid, repeatable onboarding of new clients (e.g., Academia, Restaurante, Barbería).

**Time Estimate:** 3–4 hours (fully operational, end-to-end)

**Success Criteria:** Lead ingestion → Contact creation → Opportunity pipeline → Automation ready

---

## Executive Summary

### What's Automated
✅ Lead ingestion from web forms  
✅ Supabase storage (multi-tenant isolation)  
✅ GHL contact creation  
✅ Opportunity creation in pipeline  
✅ Tag assignment  
✅ n8n webhook dispatch  

### What's Manual (UI-based)
⚠️ GHL pipeline/stage configuration  
⚠️ Email/SMS template creation  
⚠️ GHL workflow setup  
⚠️ Calendar configuration  

### What's Not Implemented
❌ Lead scoring  
❌ Conversion decision logic  
❌ Billing integration  
❌ Retention workflows  

---

## Time Breakdown by Client Type

### Education (Peskids Model)
**Total: 4 hours**

| Phase | Task | Time | Notes |
|-------|------|------|-------|
| 1. Infra | Supabase + webhooks | 30 min | Copy Peskids config, update tenant_slug |
| 2. GHL | Pipeline + stages + tags | 60 min | 7 stages: New Lead → Active → Renewal |
| 3. Templates | Email/SMS (4 templates) | 30 min | Welcome + Confirmation + Reminder + Recovery |
| 4. Workflows | GHL automation (4 WF) | 60 min | Triggers: Contact Created, Appointment, 24h, No-show |
| 5. n8n | Webhook receiver | 15 min | Docker container + environment variables |
| 6. Testing | E2E validation | 30 min | Lead → Contact → Opportunity → Email |

**Lead Flow:** Web form → Contact → Trial class → Enrollment → Active student → Renewal

---

### Service-Based (Barbería/Restaurante Model)
**Total: 3 hours**

| Phase | Task | Time | Notes |
|-------|------|------|-------|
| 1. Infra | Supabase + webhooks | 30 min | Copy template, update tenant_slug |
| 2. GHL | Pipeline + stages + tags | 45 min | 4 stages: New Lead → Booked → Completed → Repeat |
| 3. Templates | Email/SMS (3 templates) | 20 min | Welcome + Confirmation + Thank you |
| 4. Workflows | GHL automation (3 WF) | 45 min | Triggers: Contact Created, Appointment, Completed |
| 5. n8n | Webhook receiver | 15 min | Docker container + environment variables |
| 6. Testing | E2E validation | 25 min | Lead → Contact → Booking → Service |

**Lead Flow:** Web form/phone → Contact → Booking → Service completion → Repeat customer

---

### Service + Billing (Academia Pago Model)
**Total: 4 hours**

| Phase | Task | Time | Notes |
|-------|------|------|-------|
| 1. Infra | Supabase + webhooks | 30 min | Copy template, update tenant_slug |
| 2. GHL | Pipeline + stages + tags | 60 min | Includes payment status stages |
| 3. Templates | Email/SMS (4 templates) | 30 min | Welcome + Invoice + Reminder + Receipt |
| 4. Workflows | GHL automation (4 WF) | 60 min | Payment triggers + dunning |
| 5. n8n | Webhook receiver + Stripe | 20 min | Stripe webhook integration |
| 6. Testing | E2E validation | 30 min | Full subscription flow |

**Lead Flow:** Web form → Contact → Enrollment → Payment → Subscription → Renewal

---

## Phase-by-Phase Instructions

### Phase 1: Infrastructure Setup (30 minutes)

**Goal:** Set up database, webhooks, and secure credentials.

**Checklist:**

1. **Supabase Tenant Setup**
   - [ ] Create new schema in Supabase (e.g., `academia`, `restaurante`)
   - [ ] Run migration: Copy `apps/peskids/migrations/` to new tenant
   - [ ] Update schema name in migrations (e.g., `platform.academia_leads`)
   - [ ] Verify tables created: leads, contacts, opportunities, followups
   - [ ] Set RLS policies for multi-tenant isolation

2. **Environment Configuration**
   - [ ] Add to `.env.local` or Doppler:
     ```
     TENANT_SLUG=academia
     SUPABASE_URL=https://jkwykpldnitavhmtuzmo.supabase.co
     SUPABASE_SERVICE_KEY=...
     GOHIGHLEVEL_LOCATION_ID=...
     GOHIGHLEVEL_API_KEY=...
     PESKIDS_INBOUND_WEBHOOK_SECRET=...
     ```
   - [ ] Verify Doppler secrets are set for environment (dev/prd)

3. **Webhook Receivers**
   - [ ] Create endpoint: `/api/public/tenants/{slug}/webhooks/gohighlevel/leads`
   - [ ] Add webhook secret validation
   - [ ] Test with sample GHL lead webhook
   - [ ] Verify Supabase records created

4. **Verification**
   - [ ] Run smoke test: Submit test lead
   - [ ] Check Supabase: Row created with tenant_slug
   - [ ] Check GHL: Contact appears in Contacts list
   - [ ] Check logs: No errors in API

**Time: 30 minutes**

---

### Phase 2: GHL Configuration (45–60 minutes)

**Goal:** Set up pipeline, stages, tags, and calendars in GoHighLevel.

**Checklist:**

1. **Pipeline Setup**
   - [ ] Create new pipeline in GHL: "{Client Name} Sales Pipeline"
   - [ ] Define stages:
     - **Education:** New Lead → Contacted → Trial Class → Enrolled → Active Student → Renewal → Lost
     - **Service:** New Lead → Booked → In Progress → Completed → Repeat
   - [ ] Document stage IDs (needed for Opsly config)
   - [ ] Example: `New Lead: abc123`, `Contacted: def456`, etc.

2. **Tags Setup**
   - [ ] Create tags:
     - `lead-web` (web form source)
     - `lead-phone` (phone inquiry)
     - `hot-lead` (high priority)
     - `trial-scheduled` (appointment booked)
     - `no-show` (missed appointment)
   - [ ] Document tag IDs

3. **Calendar Setup**
   - [ ] Create calendar: "{Client Name} Appointments"
   - [ ] Set availability: M-F, 9 AM – 5 PM (or client hours)
   - [ ] Set appointment duration: 30 min or 1 hour
   - [ ] Document calendar ID

4. **Fields & Custom Data**
   - [ ] Verify standard fields exist:
     - First Name, Last Name, Email, Phone
   - [ ] Add custom fields if needed:
     - **Education:** Grade, Interest, Parent Phone
     - **Service:** Service Type, Preferred Time
     - **Billing:** Payment Status, Subscription ID
   - [ ] Document field IDs

5. **Verification**
   - [ ] Create test contact manually in GHL
   - [ ] Verify tags can be applied
   - [ ] Verify calendar booking works
   - [ ] Check opportunity pipeline creation

**Time: 45–60 minutes**

---

### Phase 3: Email & SMS Templates (20–30 minutes)

**Goal:** Create customer-specific email and SMS templates.

**Checklist:**

1. **Email Templates**
   - [ ] Welcome Email
     - Subject: "Welcome to {Client Name}!"
     - Content: Program overview, benefits, next steps
     - CTA: Link to calendar booking or trial
   - [ ] Confirmation Email
     - Subject: "Your appointment is confirmed"
     - Content: Date, time, location, what to bring
   - [ ] Reminder Email (optional)
     - Subject: "Reminder: Your appointment tomorrow"
     - Content: Date, time, location, cancellation link
   - [ ] Follow-up Email
     - Subject: "How was your experience?"
     - Content: Feedback request, next steps

2. **SMS Templates**
   - [ ] Confirmation SMS
     - Text: "Hi {first_name}! Your appointment is {date} at {time}. Reply YES to confirm."
     - Length: <160 characters
   - [ ] Reminder SMS
     - Text: "Reminder: You have an appointment tomorrow at {time}. Reply YES to confirm."
     - Length: <160 characters

3. **Customization**
   - [ ] Update client name throughout templates
   - [ ] Verify merge tags match GHL field names
   - [ ] Test send to test contact
   - [ ] Check for broken links or formatting

4. **Publishing**
   - [ ] Publish all templates (not draft)
   - [ ] Create backup copies (if GHL allows)
   - [ ] Document template IDs

**Time: 20–30 minutes**

---

### Phase 4: GHL Workflows (45–60 minutes)

**Goal:** Automate email/SMS sending and follow-up actions.

**Checklist:**

1. **Welcome Workflow**
   - [ ] Trigger: Contact Created
   - [ ] Action: Send Welcome Email
   - [ ] Delay: Immediate
   - [ ] Test: Create contact, verify email sent

2. **Confirmation Workflow**
   - [ ] Trigger: Appointment Scheduled
   - [ ] Action: Send Confirmation Email
   - [ ] Delay: Immediate
   - [ ] Test: Schedule appointment, verify email sent

3. **Reminder Workflow**
   - [ ] Trigger: Time-based (24 hours before appointment)
   - [ ] Action: Send Reminder SMS
   - [ ] Delay: 24 hours before event
   - [ ] Test: Verify SMS sent (may take 24 hours)

4. **No-show Recovery Workflow** (optional)
   - [ ] Trigger: Contact Status = "No Show"
   - [ ] Action: Send Recovery Email
   - [ ] Delay: 2 hours after no-show
   - [ ] Test: Mark contact as no-show, verify email sent

5. **Verification**
   - [ ] All workflows enabled (toggle: ON)
   - [ ] All workflows have correct trigger conditions
   - [ ] Test execution logs show success
   - [ ] No failed executions

**Time: 45–60 minutes**

---

### Phase 5: n8n Setup (15 minutes)

**Goal:** Configure n8n webhook receiver for async processing.

**Checklist:**

1. **Docker Container**
   - [ ] Copy `docker-compose.n8n-{tenant}.yml` from template
   - [ ] Update environment:
     ```yaml
     environment:
       TENANT_SLUG: academia
       N8N_WEBHOOK_URL: https://n8n-academia.op-sly.com
       N8N_PORT: 3005
     ```
   - [ ] Start container: `docker-compose up -d n8n-academia`

2. **Webhook Receiver**
   - [ ] Create n8n workflow: "Lead Intake"
   - [ ] Webhook trigger: `/webhook/lead-created`
   - [ ] Parse GHL payload
   - [ ] Log execution
   - [ ] Test with sample webhook

3. **Verification**
   - [ ] n8n UI accessible at `https://n8n-academia.op-sly.com`
   - [ ] Webhook URL responding with 200 OK
   - [ ] Sample webhook execution logged

**Time: 15 minutes**

---

### Phase 6: End-to-End Testing (25–30 minutes)

**Goal:** Validate complete lead flow from form submission to pipeline.

**Checklist:**

1. **Lead Submission Test**
   - [ ] Submit test lead via web form (or manual entry)
   - [ ] Verify form submits without error
   - [ ] Verify success message displays

2. **Supabase Verification**
   - [ ] Check `{tenant}_leads` table
   - [ ] Verify row created with:
     - `tenant_slug: academia` (or client slug)
     - `lead_id`, `email`, `phone`, `created_at`
   - [ ] Verify `ghl_contact_id` populated

3. **GHL Verification**
   - [ ] Navigate to GHL Contacts
   - [ ] Find test contact by email
   - [ ] Verify contact details populated
   - [ ] Check tags are applied (e.g., `lead-web`)

4. **Opportunity Verification**
   - [ ] Go to GHL Pipeline
   - [ ] Find test contact/opportunity
   - [ ] Verify stage = "New Lead"
   - [ ] Verify opportunity created (not just contact)

5. **Email Verification**
   - [ ] Check email inbox (test@example.com)
   - [ ] Verify Welcome Email received
   - [ ] Check email content is correct
   - [ ] Verify merge tags replaced (e.g., `{first_name}` → "John")

6. **n8n Verification**
   - [ ] Check n8n execution logs
   - [ ] Verify webhook received
   - [ ] Verify payload parsed correctly
   - [ ] No errors in execution

7. **Sign-off**
   - [ ] All 6 verifications passed ✅
   - [ ] Document any issues found
   - [ ] Client ready for production

**Time: 25–30 minutes**

---

## Automation vs Manual: Detailed Breakdown

### ✅ AUTOMATED (No Manual Work)

| Component | What It Does | Timing |
|-----------|-------------|--------|
| **Lead Ingestion** | Receives webhook from form/GHL | Real-time |
| **Supabase Storage** | Saves lead to database | Real-time |
| **Contact Creation** | Creates contact in GHL | Real-time |
| **Opportunity Creation** | Creates opportunity in pipeline | Real-time |
| **Tag Assignment** | Auto-applies tags based on source | Real-time |
| **n8n Dispatch** | Sends lead to n8n for processing | Real-time |
| **GHL Sync** | Keeps Supabase ↔ GHL in sync | Continuous |

**You don't touch:** These run automatically after setup.

---

### ⚠️ MANUAL (UI-Based Configuration)

| Component | What It Does | Who | Time |
|-----------|-------------|-----|------|
| **GHL Pipeline** | Define stages for client's workflow | Ops | 30 min |
| **Email Templates** | Write email content/copy | Marketing | 20 min |
| **SMS Templates** | Write SMS content/copy | Marketing | 10 min |
| **GHL Workflows** | Create automation triggers | Ops | 60 min |
| **Calendar Setup** | Configure availability hours | Ops | 15 min |
| **Tags/Fields** | Define custom data fields | Ops | 15 min |

**You must do:** These require human input in GHL UI.

---

### ❌ NOT IMPLEMENTED (Future Roadmap)

| Component | What It Does | Est. Time |
|-----------|-------------|-----------|
| **Lead Scoring** | Auto-rank leads by quality | 1 sprint |
| **Conversion Logic** | Decide lead → customer | 2 sprints |
| **Billing** | Auto-charge customers | 1 sprint |
| **Retention** | Re-engagement campaigns | 2 sprints |

**These are not available yet.** They're on the roadmap for Phase 2+.

---

## Client Type Comparison

### Model 1: Education (Trial-Based)
**Example:** Peskids, Academia

**Flow:** Lead → Free trial → Enrollment → Recurring billing

**Stages:** 7 (New Lead → Active → Renewal)

**Templates:** 4 (Welcome, Confirmation, Reminder, Recovery)

**Time:** 4 hours

**Special Considerations:**
- Parent + student data needed
- Trial class scheduling critical
- Renewal/retention important

---

### Model 2: Service (Booking-Based)
**Example:** Barbería, Restaurant, Beauty

**Flow:** Lead → Appointment → Service → Repeat booking

**Stages:** 4 (New Lead → Booked → Completed → Repeat)

**Templates:** 3 (Welcome, Confirmation, Receipt)

**Time:** 3 hours

**Special Considerations:**
- Calendar management critical
- Repeat customer tracking
- Service type field needed
- No trial phase

---

### Model 3: Service + Billing
**Example:** Academia with payment, SaaS onboarding

**Flow:** Lead → Contract → Payment → Subscription → Renewal

**Stages:** 6 (New Lead → Contract → Invoice → Active → Renewal → Churn)

**Templates:** 4 (Welcome, Invoice, Reminder, Receipt)

**Time:** 4 hours

**Special Considerations:**
- Payment status stages
- Invoice tracking
- Dunning (retry failed payments)
- Subscription management

---

## Readiness Checklist

| Phase | Status | Ready? |
|-------|--------|--------|
| **Infrastructure** | Webhook receivers, Supabase multi-tenant | ✅ READY |
| **Lead Ingestion** | Form → API → Database | ✅ READY |
| **GHL Integration** | Contact creation, opportunity creation | ✅ READY |
| **Automation** | Lead ingest, tag assignment, n8n dispatch | ✅ READY |
| **Email/SMS** | Template framework, workflow system | ✅ READY |
| **Calendar** | GHL calendar, booking links | ✅ READY |
| **Testing** | E2E validation process | ✅ READY |
| **Onboarding Docs** | This playbook + guides | ✅ READY |

**Overall:** ✅ READY FOR SECOND CLIENT

---

## Known Limitations

### Not Included
- ❌ Lead scoring (which leads are hot?)
- ❌ Conversion automation (trial → sale)
- ❌ Billing automation (recurring charges)
- ❌ Multi-language support
- ❌ Custom integrations (CRM besides GHL)

### Workarounds
- Use GHL tags for manual lead prioritization
- Conversion happens in GHL workflows (manual review)
- Stripe webhook for billing (manual setup per client)
- Contact support for special requests

---

## Success Metrics

After 4-hour onboarding, you should have:

✅ **Operational Metrics**
- [ ] 10+ leads ingested successfully
- [ ] 100% lead → contact creation success
- [ ] 100% opportunity creation in pipeline
- [ ] <2s API response time

✅ **Automation Metrics**
- [ ] Welcome email sent within 1 minute of submission
- [ ] Confirmation email sent when appointment scheduled
- [ ] Reminder SMS sent 24 hours before appointment
- [ ] Recovery email sent for no-shows

✅ **Data Quality Metrics**
- [ ] All required fields captured
- [ ] No duplicate leads in GHL
- [ ] GHL ↔ Supabase in sync
- [ ] Audit logs complete for compliance

✅ **Client Satisfaction**
- [ ] All lead flows tested and working
- [ ] Client trained on dashboard
- [ ] Documentation provided
- [ ] Support contact established

---

## Support & Escalation

### Common Issues

| Issue | Cause | Fix | Time |
|-------|-------|-----|------|
| Leads not in GHL | API key invalid or webhook not triggering | Verify Doppler secrets, check webhook logs | 10 min |
| Email not sending | Template missing or workflow disabled | Create template, enable workflow in GHL UI | 15 min |
| Opportunity not created | Missing pipeline ID or stage ID | Verify GOHIGHLEVEL_PESKIDS_PIPELINE_ID env var | 5 min |
| Slow lead ingestion | Database query timeout | Check Supabase database size, add indexes | 20 min |

### Escalation Path

1. **Ops Team (30 min):** Check Doppler, GHL config, webhook logs
2. **Dev Team (1 hour):** Debug API logic, database queries
3. **GHL Support (business hours):** API errors, rate limits, features

---

## Onboarding Checklist

**Before Starting:**
- [ ] Client name and type confirmed
- [ ] Doppler project created
- [ ] GHL location ID obtained
- [ ] Slack channel created for support

**Phase 1–6:**
- [ ] All 6 phases completed
- [ ] All checklist items checked off
- [ ] E2E testing passed

**Post-Onboarding:**
- [ ] Client documentation provided
- [ ] Support contact info given
- [ ] Success metrics measured
- [ ] Lessons learned documented

**Time Tracking:**
- Start time: _______________
- End time: _______________
- **Total:** ___ hours
- Variance from estimate: ___ min

---

## Reference Documents

- **Peskids CLAUDE.md** — Tenant governance patterns
- **Lead Ingestion** — apps/api/lib/peskids/lead-ingest.ts
- **Opportunity Service** — apps/api/lib/peskids/opportunity.ts
- **GHL Setup** — apps/icso/lib/ghl-setup.ts
- **Database Migrations** — supabase/migrations/

---

## Approved By

- **Ops Lead:** _______________________
- **Date:** _______________________

---

**Status:** ✅ READY FOR SECOND CLIENT ONBOARDING

Estimated time: 3–4 hours (fully operational)
