---
status: active
owner: operations
created: 2026-06-25
purpose: "Step-by-step implementation guide for GHL Phase 1 (all 3 customers)"
---

# Phase 1 Implementation Guide

**Quick Start:** Follow these steps to implement Phase 1 infrastructure for all 3 GHL customers (Intcloudsysops, Peskids, ICSO).

**Time Estimate:** 4-5 hours total (mostly manual UI work)

---

## Overview: What is Phase 1?

Phase 1 sets up the **infrastructure** for lead ingestion:

✅ **Automated (0 manual work):**
- Database tables & RLS policies
- Webhook receivers
- API integrations
- Tags auto-provisioned
- Custom fields auto-provisioned
- Calendars created

⚠️ **Manual UI Required (5-6 hours):**
- GHL Pipelines (3 × 45 min)
- Lead forms (3 × 30 min)
- Email/SMS templates (3 × 30 min)
- GHL workflows (3 × 45 min)

---

## Step 1: Run Phase 1 Orchestrator (Automated)

This command provisions all infrastructure:

```bash
# Dry-run (see what will happen)
./scripts/ghl-phase1-execute.sh --dry-run

# LIVE provisioning (create resources in GHL)
./scripts/ghl-phase1-execute.sh --execute
```

**What it does:**
1. ✅ Verifies Doppler secrets are configured
2. ✅ Provisions tags, custom fields, calendars via GHL API
3. ✅ Confirms webhook endpoints are available
4. ✅ Generates readiness report

**Expected Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GHL Phase 1 Orchestrator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pre-flight Checks
✓ doppler CLI found
✓ Doppler secret available: GOHIGHLEVEL_INTCLOUDSYSOPS_API_KEY
✓ Doppler secret available: GOHIGHLEVEL_PESKIDS_API_KEY

Provisioning: intcloudsysops
✓ Tags auto-provisioned
✓ Custom fields auto-provisioned
✓ Calendar created
Provision step complete for intcloudsysops

Provisioning: peskids
✓ Tags auto-provisioned
✓ Custom fields auto-provisioned
✓ Trial Class calendar created
✓ Assessment calendar created
Provision step complete for peskids

Phase 1 Orchestration Complete!
Log file: logs/ghl-phase1-20260625_120000.log
```

---

## Step 2: Manual UI Setup (Per Customer)

After running the orchestrator, complete the manual UI steps in GHL for each customer.

### Customer 1: Intcloudsysops / ICSO (Agency + Website)

**Time:** 2.5 hours  
**Location:** `qD7Z9jt3owk0LMtKElow` (shared for both Agency and Website)

**In GHL Console (https://app.gohighlevel.com):**

#### 2.1 Create Pipeline

1. Navigate: **Opportunities** → **Pipelines**
2. **New Pipeline:** "Opsly Agency Sales"
3. **Add Stages** (in order):
   - New Lead
   - Contacted
   - Discovery Scheduled
   - Proposal Sent
   - Negotiation
   - Won
   - Lost
4. Click **Save**
5. **Document stage IDs** (needed for API):
   ```
   New Lead: [copy ID]
   Contacted: [copy ID]
   ... etc
   ```
   → Add to Doppler or `.env.local`

#### 2.2 Create Lead Form

1. Navigate: **Funnels** → **Forms**
2. **New Form:** "Opsly Agency Lead Capture"
3. **Fields:**
   - First Name (required)
   - Last Name (required)
   - Email (required)
   - Phone (required)
   - Company (optional)
   - Service Interest (optional, dropdown)
4. **Post-submission action:** Redirect to calendar link
5. Click **Publish**

#### 2.3 Email Templates

**Template 1: Welcome**
- **Name:** "Opsly — Welcome Lead"
- **Trigger:** Contact Created
- **Subject:** "Welcome to Opsly! Here's what happens next"
- **Content:** Brief intro + next step (discovery call)
- **CTA:** [Schedule Discovery] (link to calendar)

**Template 2: Confirmation**
- **Name:** "Opsly — Discovery Confirmation"
- **Trigger:** Appointment Scheduled
- **Subject:** "Your discovery call with Opsly is confirmed"
- **Content:** Date, time, team member intro
- **CTA:** [Reschedule if needed]

#### 2.4 SMS Template

- **Name:** "Opsly — Discovery Reminder"
- **Text:** "Hi {{contact.first_name}}, reminder: your discovery call with Opsly is tomorrow at {{appointment.time}}. Reply YES to confirm."
- **Max 160 chars**

#### 2.5 GHL Workflows

**Workflow 1: Welcome**
- **Trigger:** Contact Created
- **Actions:** Delay 2 min → Send email (Welcome) → Add tag `welcome_sent`

**Workflow 2: Reminder**
- **Trigger:** Time-based (24h before appointment)
- **Actions:** Send SMS (Reminder) → Add tag `discovery_reminded`

**Workflow 3: No-show Recovery**
- **Trigger:** Appointment Status = No Show
- **Actions:** Wait 1h → Send SMS → Create task → Add tag `no_show`

### Customer 2: Peskids (Tenant)

**Time:** 2.5 hours

**In GHL Console (same location as Intcloudsysops):**

#### 2.1 Create Pipeline

1. Navigate: **Opportunities** → **Pipelines**
2. **New Pipeline:** "Peskids Enrollment"
3. **Stages:**
   - New Lead
   - Contacted
   - Trial Scheduled
   - Trial Completed
   - Enrolled
   - Active Student
   - Renewal
4. **Save** and document stage IDs

#### 2.2 Create Form

1. **New Form:** "Peskids Trial Registration"
2. **Fields:**
   - Parent First Name (required)
   - Parent Last Name (required)
   - Parent Email (required)
   - Parent Phone (required)
   - Child Name (required)
   - Child Age (required, number)
   - Interest Level (optional, dropdown)
3. **Post-submission:** Redirect to calendar

#### 2.3 Email Templates

**Template 1: Welcome**
- **Name:** "Peskids — Welcome Parent"
- **Subject:** "¡Bienvenido a Peskids! Tu clase de prueba está aquí"
- **Content:** Welcome + trial class info + calendar link

**Template 2: Confirmation**
- **Name:** "Peskids — Trial Confirmation"
- **Subject:** "Tu clase de prueba está confirmada"
- **Content:** Date, time, location, what to bring

#### 2.4 SMS Template

- **Name:** "Peskids — Trial Reminder"
- **Text:** "Hola {{contact.first_name}}, te recordamos tu clase de prueba mañana a las {{appointment.time}}. Lleva traje de baño y gorro. Confirma: [link]"

#### 2.5 GHL Workflows

**Workflow 1: Welcome**
- **Trigger:** Contact Created
- **Actions:** Delay 2 min → Send email

**Workflow 2: Confirmation**
- **Trigger:** Appointment Scheduled (Trial Class calendar)
- **Actions:** Delay 1 min → Send email → Update stage to "Trial Scheduled"

**Workflow 3: Reminder**
- **Trigger:** Time-based (24h before appointment)
- **Actions:** Send SMS

**Workflow 4: No-show Recovery**
- **Trigger:** Appointment Status = No Show
- **Actions:** Wait 1h → Send SMS → Create task

---

## Step 3: E2E Testing

After completing manual UI setup, validate everything works:

```bash
# Test specific customer
./scripts/ghl-phase1-test-e2e.sh --customer peskids

# Test all customers
./scripts/ghl-phase1-test-e2e.sh

# Verbose output
./scripts/ghl-phase1-test-e2e.sh --verbose
```

**Test Coverage:**
- ✅ Doppler access
- ✅ Webhook endpoints
- ✅ Database schema
- ✅ GHL API connection
- ✅ Pipeline configuration
- ✅ Calendar configuration
- ✅ Lead submission
- ✅ Database persistence
- ✅ Email templates
- ✅ Webhook handlers

**Expected Output:**
```
Total Tests: 30
Passed: 30
Failed: 0

✓ All tests passed!
```

---

## Step 4: Go-Live Checklist

### Pre-Launch (Day Before)

- [ ] All infrastructure provisioned (scripts run)
- [ ] All manual UI steps completed
- [ ] E2E tests passing
- [ ] Team trained on GHL console
- [ ] Support contact assigned
- [ ] Monitoring configured

### Launch Day

- [ ] Team standing by
- [ ] Webhook endpoint responding (`curl` test)
- [ ] All alerts configured
- [ ] Client notified

### First 24 Hours

- [ ] Monitor lead volume
- [ ] Check email delivery
- [ ] Look for errors in logs
- [ ] Quick response to issues
- [ ] Daily check-in with client

### Week 1 Review

- [ ] Collect metrics:
  - Leads per day
  - Contact creation success rate
  - Email delivery rate
  - Pipeline stage progression
- [ ] Client satisfaction survey
- [ ] Lessons learned documented
- [ ] Plan Phase 2 features

---

## Troubleshooting

### Issue: "Doppler secret missing"

**Fix:**
```bash
# Add missing secret
doppler secrets set GOHIGHLEVEL_PESKIDS_API_KEY \
  --project ops-intcloudsysops --config prd

# Verify
doppler secrets get GOHIGHLEVEL_PESKIDS_API_KEY \
  --project ops-intcloudsysops --config prd
```

### Issue: "GHL API connection failed"

**Check:**
1. API key is correct in Doppler
2. API key hasn't expired
3. API key has required scopes (contacts.write, opportunities.readonly, calendars.write)
4. Location ID is correct

### Issue: "Lead not appearing in GHL"

**Debug:**
1. Check webhook logs: `tail -f logs/webhook.log | grep {tenant}`
2. Verify webhook was received
3. Check database: `psql -c "SELECT * FROM platform.{tenant}_leads LIMIT 1"`
4. Check GHL contact search

### Issue: "Email not sending"

**Check:**
1. Email template is published (not draft)
2. Workflow trigger is enabled
3. Merge tags are correct
4. Check GHL email logs

---

## Timeline

| Phase | Duration | Status | Owner |
|-------|----------|--------|-------|
| **Pre-Phase 1** | — | ✅ Done | Dev |
| **Phase 1 Infra** | 30 min | 🟡 Today | Ops |
| **Phase 1 Manual** | 4-5 hours | 🟡 Today | Ops + Marketing |
| **Phase 1 Testing** | 1 hour | 🟡 Today | Dev |
| **Phase 2 Enhancements** | 3.5 hours | ⏳ Next week | Ops + Dev |
| **Phase 3 Advanced** | TBD | ⏳ Future | Product |

---

## Success Metrics (Target)

### Day 1 (Go-Live)
- ✅ Leads flowing in
- ✅ Contacts created in GHL
- ✅ Welcome emails sent
- ✅ 0 critical errors

### Week 1
- ✅ 50+ leads processed
- ✅ 100% contact creation success
- ✅ 95%+ email delivery
- ✅ Calendar bookings working

### Month 1
- ✅ 200+ leads total
- ✅ Conversion metrics measured
- ✅ Client satisfied
- ✅ Ready for Phase 2

---

## Key Files

**Master Docs:**
- `docs/blueprints/CUSTOMER-FOLLOWUP-MASTER.md` — Central hub
- `docs/tenants/SECOND-CLIENT-ONBOARDING-PLAYBOOK.md` — Process
- `docs/tenants/SECOND-CLIENT-READINESS-ASSESSMENT.md` — Assessment

**Implementation Scripts:**
- `scripts/ghl-phase1-execute.sh` — Auto-provisioning
- `scripts/ghl-phase1-test-e2e.sh` — Validation tests
- `scripts/ghl-provision-intcloudsysops.sh` — Agency provisioning
- `scripts/ghl-provision-peskids.sh` — Peskids provisioning

**Configuration:**
- `docs/examples/intake/intcloudsysops.json` — Agency manifest
- `docs/examples/intake/peskids.json` — Peskids manifest

---

## Support & Questions

**Can't find something?** Refer to:
- `docs/blueprints/CUSTOMER-FOLLOWUP-MASTER.md` → Customer status & action items
- `docs/superpowers/specs/TEMPLATE-next-client-blueprint.md` → Generic template
- `docs/superpowers/specs/2026-06-25-icso-website-enhancement-design.md` → ICSO Phase 2

**Need help?** Contact Ops Lead or post in #ops-critical Slack channel.

---

## Next Steps

After Phase 1 is complete and tested:

1. **Phase 2** — Enhancements (emails, workflows, metrics)
   - Reference: `docs/superpowers/specs/2026-06-25-icso-website-enhancement-design.md`

2. **Phase 3** — Advanced features (lead scoring, conversion logic, etc.)

3. **Onboard Next Client** — Use template
   - Reference: `docs/superpowers/specs/TEMPLATE-next-client-blueprint.md`

---

**Status:** 🟡 READY FOR PHASE 1  
**Last Updated:** 2026-06-25  
**Owner:** Operations  
**Review:** After Phase 1 complete
