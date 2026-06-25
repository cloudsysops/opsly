---
status: active
owner: operations
created: 2026-06-25
purpose: "Central hub for GHL customer provisioning and followup status"
---

# Customer Followup — Master Tracker

**Executive Summary:** Track all 3 GoHighLevel integrations (Agency + 2 Tenants) through provisioning, manual UI setup, and go-live phases.

---

## Dashboard: All Customers

| Customer | Type | Status | Readiness | Manual Items | Lead Volume | Next Step |
|----------|------|--------|-----------|--------------|-------------|-----------|
| **Intcloudsysops/ICSO** | Agency + Website | 🟡 Draft | 72% | 5 pending | 1-2 weekly | Create pipeline + forms |
| **Peskids** | Tenant (Education) | 🟡 Draft | 69% | 5 pending | 10+ weekly | Create pipeline + forms |
| **Future Client** | Tenant | ⏳ Planned | — | — | — | Onboarding playbook ready |

---

## Customer 1: Intcloudsysops / ICSO (Agency + Website)

### Overview

**Role:** Commercial layer + Website lead capture (same GHL location)  
**Location ID:** `qD7Z9jt3owk0LMtKElow` (shared)  
**Lead Sources:** 
- ICSO website form (opsly.intcloudsysops.com)  
- Discovery call calendar booking  
**Integration Type:** Private API (Doppler: `GOHIGHLEVEL_*`)

### Current State

✅ **Auto-Provisioned:**
- Tags for lead source tracking
- Custom fields for contact info
- Discovery Call calendar (30-min slots, M-F 9-5)
- Location metadata

⚠️ **Manual Setup Pending:**
1. Pipeline: "Opsly Agency Sales" (7 stages: New Lead → Lost)
2. Lead Form: "Opsly Agency Lead Capture"
3. Email Template: "Opsly — Welcome Lead"
4. Email Template: "Opsly — Discovery Confirmation"
5. SMS Template: "Opsly — Discovery Reminder"

### Readiness Score

**Current:** 72% (13/18 components)  
**Blocker:** Manual UI items (5 forms/templates)

**Dependency:** None — can go live once manual items completed (4 hours)

### Action Items

- [ ] **Ops:** Create GHL pipeline with 7 stages (60 min)
- [ ] **Ops:** Create lead capture form in GHL (30 min)
- [ ] **Marketing:** Write 2 email templates (20 min)
- [ ] **Marketing:** Write SMS template (10 min)
- [ ] **Dev:** E2E test (form → contact → opportunity) (30 min)

**Owner:** Operations Lead  
**Target:** End of week (3 hours total)

### Success Metrics (Post-Launch)

- ✅ Leads from ICSO website auto-created in GHL
- ✅ Welcome email sent within 1 min
- ✅ Discovery calendar available
- ✅ <2s API response time

---

## Customer 2: Peskids (Tenant — Education)

### Overview

**Role:** Education pilot, trial-based enrollment model  
**Location ID:** `KJ5LawrOOe3hIerqtMRu`  
**Lead Source:** Multiple (web form, n8n intake, API)  
**Integration Type:** Webhook + Private API (Doppler: `GOHIGHLEVEL_PESKIDS_*`)

### Current State

✅ **Auto-Provisioned (11/16):**
- Tags: trial-class, enrolled, active-student, renewal, etc.
- Custom fields: child_name, age, interest, parent_phone
- Trial Class calendar
- Assessment calendar
- Webhook receiver at `/api/public/tenants/peskids/webhooks/gohighlevel/leads`
- Test contact created + verified (NrUuROsRKUe0u1GP8IgD)

⚠️ **Manual Setup Pending (5):**
1. Pipeline: "Peskids Enrollment" (6 stages)
2. Lead Form: "Peskids Trial Registration"
3. Email Template: "Peskids — Welcome Parent"
4. Email Template: "Peskids — Trial Confirmation"
5. SMS Template: "Peskids — Trial Reminder"

### Readiness Score

**Current:** 69% (11/16 components)  
**Blocker:** Manual UI items (5 forms/templates)  
**Non-blocker:** Form names don't match API (generic Form 0/1/2 issue)

### Outstanding Tasks from Operator Report (2026-06-05)

| Task | Status | Why |
|------|--------|-----|
| Form "Peskids Lead Capture" E2E | ⏳ Pending | API can't verify name (IAM issue) — needs UI test |
| Email template verification | ⏳ Not verified this session | Manual creation done; names not confirmed in UI |
| SMS template verification | ⏳ Not verified | Manual creation done; needs screenshot |
| Basic follow-up flow | ⏳ Pending | GHL workflows or n8n handoff not verified |
| Screenshots (before/after) | ❌ Not captured | Browser session interrupted |

### Action Items

- [ ] **Ops:** Create Peskids Enrollment pipeline (6 stages) (45 min)
- [ ] **Ops:** Create/rename lead form in GHL (20 min)
- [ ] **Marketing:** Verify + refine 2 email templates (20 min)
- [ ] **Marketing:** Verify + refine SMS template (10 min)
- [ ] **Dev:** Test form E2E (submit → webhook → n8n) (30 min)
- [ ] **Ops:** Capture screenshots of Contact, Pipeline, Forms, Templates (15 min)
- [ ] **Dev:** Verify n8n lead intake workflow activation (20 min)

**Owner:** Operations Lead  
**Target:** Next sprint (3 hours manual, 2 hours automated)

### Success Metrics (Post-Launch)

- ✅ 10+ leads/week ingested (web form, n8n, API)
- ✅ 100% contact creation success
- ✅ 100% opportunity creation in pipeline
- ✅ Welcome email sent within 1-2 min
- ✅ Trial confirmation email working
- ✅ SMS reminder sent 24h before appointment
- ✅ n8n webhook processing leads
- ✅ <2s API response time

---

## Future Client: Template & Onboarding

### Onboarding Playbook

**Reference:** `docs/tenants/SECOND-CLIENT-ONBOARDING-PLAYBOOK.md`

**Time Estimate:** 3–4 hours (fully operational)

**Client Types Ready to Onboard:**
- ✅ Education (trial-based) — 4 hours
- ✅ Service (booking-based) — 3 hours
- ⚠️ Billing (subscription) — 4 hours (Stripe setup required)

**Readiness Assessment:** `docs/tenants/SECOND-CLIENT-READINESS-ASSESSMENT.md` (Score: 85/100)

### Template Files to Copy

When onboarding second client:

```bash
# Supabase migrations (use Peskids as template)
cp apps/peskids/migrations/* supabase/migrations/

# Webhook handler (customize for new tenant_slug)
cp apps/api/app/public/tenants/peskids/webhooks/gohighlevel/leads/route.ts \
   apps/api/app/public/tenants/{new_slug}/webhooks/gohighlevel/leads/route.ts

# Update environment in Doppler
doppler secrets set GOHIGHLEVEL_{NEW_SLUG}_API_KEY --project ops-intcloudsysops --config prd

# Run provision script
./scripts/ghl-provision-{new_slug}.sh --execute
```

### Pre-Onboarding Checklist

- [ ] Client type confirmed (education/service/hybrid)
- [ ] GHL location ID obtained
- [ ] Doppler project created
- [ ] Slack channel for support
- [ ] Kickoff meeting scheduled

---

## Cross-Customer Roadmap

### Phase 1: Foundational (This Sprint) ✅

| Item | Intcloudsysops/ICSO | Peskids | Status |
|------|---------|------|--------|
| Infrastructure | ✅ Done | ✅ Done | Complete |
| Lead Ingestion | ✅ Done | ✅ Done | Complete |
| GHL Integration | ✅ Done | ✅ Done | Complete |
| Manual UI (pipelines/forms) | ⏳ 4h | ⏳ 4h | In Progress |

### Phase 2: Automation & Enhancements (Next Sprint)

| Item | Intcloudsysops/ICSO | Peskids | Estimate |
|------|---------|------|----------|
| Email Templates | ⏳ 20 min | ⏳ 20 min | 40 min |
| SMS Templates | ⏳ 10 min | ⏳ 10 min | 20 min |
| GHL Workflows | ⏳ 60 min | ⏳ 60 min | 2 hours |
| Metrics Dashboard (Intcloudsysops/ICSO only) | ⏳ 2 hours | — | 2 hours |

### Phase 3: Advanced Features (TBD)

- [ ] Lead scoring
- [ ] Conversion automation
- [ ] Billing/subscription (Agency only)
- [ ] Retention campaigns
- [ ] Multi-location support (Peskids)

---

## Critical Path

### Week 1 (This Week) 🔥

1. **Ops** — Create 2 pipelines (Intcloudsysops/ICSO, Peskids)
   - Estimate: 1.5 hours
   - Owner: Ops Lead
   - Blocker: None

2. **Marketing** — Write 4 email + 2 SMS templates
   - Estimate: 1 hour
   - Owner: Marketing
   - Blocker: Ops pipelines first

3. **Dev** — E2E testing (both customers)
   - Estimate: 1.5 hours
   - Owner: Dev Lead
   - Blocker: Manual UI complete

### Week 2

4. **Ops** — Activate GHL workflows
   - Estimate: 2 hours

5. **Dev** — Build metrics dashboards
   - Estimate: 4 hours

6. **Product** — Plan Phase 2 features
   - Estimate: 2 hours

---

## Communication & Escalation

### Daily Stand-up (Ops + Dev)

**Time:** 9 AM PST  
**Duration:** 15 min  
**Topics:**
- Manual UI progress (% complete)
- E2E test results
- Blockers
- Lead volume per customer

### Weekly Review (All)

**Time:** Friday 2 PM PST  
**Duration:** 30 min  
**Topics:**
- Readiness score updates
- Lessons learned
- Roadmap adjustments
- Next sprint planning

### Escalation Path

1. **Ops issue (30 min)** → Ops Lead → Dev Lead
2. **GHL API issue (1 hour)** → Dev Lead → GHL Support
3. **Design decision (2 hours)** → Product Lead → Architecture Review

---

## Success Criteria (End of Sprint)

✅ **Agency (Intcloudsysops)**
- [ ] Pipeline created + visible in GHL
- [ ] Lead form live
- [ ] 5 test leads created successfully
- [ ] Welcome email sent within 1 min

✅ **Peskids**
- [ ] Pipeline created + visible in GHL
- [ ] Lead form live + E2E tested
- [ ] 10+ leads processed
- [ ] n8n workflows activated
- [ ] SMS reminder verified

✅ **ICSO**
- [ ] Email templates added
- [ ] Workflows created + tested
- [ ] Metrics dashboard live
- [ ] 100% email delivery

---

## Appendix: Reference Docs

- **Peskids Operator Report:** `docs/artifacts/provisioning/peskids-operator-report.md`
- **Peskids Tenant Settings Design:** `docs/superpowers/specs/2026-06-24-peskids-tenant-settings-design.md`
- **Peskids Checklist:** `docs/tenants/peskids/IMPLEMENTATION-CHECKLIST.md`
- **Second Client Playbook:** `docs/tenants/SECOND-CLIENT-ONBOARDING-PLAYBOOK.md`
- **Readiness Assessment:** `docs/tenants/SECOND-CLIENT-READINESS-ASSESSMENT.md`
- **GHL Accounts Snapshot:** `docs/reports/GHL-ACCOUNTS-SNAPSHOT.md`

---

**Status:** 🟡 ACTIVE (Phase 1 in progress)  
**Last Updated:** 2026-06-25  
**Maintainer:** Operations Team  
**Review Cycle:** Weekly
