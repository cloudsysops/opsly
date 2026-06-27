---
status: template
owner: operations
purpose: "Cookie-cutter blueprint for new client onboarding (copy & customize)"
---

# Template: Next Client Blueprint

**Instructions:** Copy this file, replace `{CLIENT}` with your client name/slug, and follow the sections below.

---

## Quick Start (Copy This)

```bash
# 1. Copy this template
cp docs/superpowers/specs/TEMPLATE-next-client-blueprint.md \
   docs/superpowers/specs/2026-06-XX-{CLIENT}-ghl-blueprint.md

# 2. Replace placeholders
sed -i 's/{CLIENT}/your-client-name/g' docs/superpowers/specs/2026-06-XX-{CLIENT}-ghl-blueprint.md

# 3. Fill in sections marked [CUSTOMISE]
# 4. Commit and add to CUSTOMER-FOLLOWUP-MASTER.md
```

---

# {CLIENT} — GoHighLevel Blueprint

**Status:** 🟡 Planning  
**Created:** 2026-06-25  
**Owner:** Operations  
**Client Type:** [CUSTOMISE: Education | Service | Billing]

---

## Executive Summary

**What is {CLIENT}?**  
[CUSTOMISE: 1-2 sentences describing the client's business]

**What do they need?**  
[CUSTOMISE: Lead capture, booking, invoicing, etc.]

**Timeline:** 3-4 hours to operational

---

## Client Profile

| Field | Value |
|-------|-------|
| **Client Name** | {CLIENT} |
| **Client Slug** | {client-slug} |
| **Business Type** | [CUSTOMISE: Education / Service / Billing / Hybrid] |
| **Lead Model** | [CUSTOMISE: Trial-based / Booking-based / Subscription] |
| **Location ID** | [CUSTOMISE: Get from GHL] |
| **Lead Volume Est.** | [CUSTOMISE: Leads/week] |
| **Target Launch** | [CUSTOMISE: Date] |

---

## Phase 1: Infrastructure (30 minutes)

### Supabase Setup

1. **Database Schema**
   - [ ] Copy migration template: `supabase/migrations/template_client_leads.sql`
   - [ ] Rename: `{client}_leads`, `{client}_contacts`, `{client}_opportunities`
   - [ ] Update schema name in migration file
   - [ ] Run migration: `supabase db push`

2. **RLS Policies**
   - [ ] Copy RLS policies from `peskids` migrations
   - [ ] Update tenant_slug check to `{client-slug}`
   - [ ] Test policies with sample insert

3. **Tables to Create**
   - [ ] `{client}_leads` — incoming form submissions
   - [ ] `{client}_contacts` — GHL contacts synced
   - [ ] `{client}_opportunities` — pipeline opportunities

### Environment Variables

Add to Doppler (ops-intcloudsysops / prd):

```
# GHL Configuration
GOHIGHLEVEL_{CLIENT}_LOCATION_ID={location_id}
GOHIGHLEVEL_{CLIENT}_API_KEY={api_key}
GOHIGHLEVEL_{CLIENT}_PIPELINE_ID={pipeline_id}
GOHIGHLEVEL_{CLIENT}_CALENDAR_ID={calendar_id}

# Webhook Security
GOHIGHLEVEL_{CLIENT}_WEBHOOK_SECRET={random_secret}
```

### Webhook Receiver

- [ ] Create endpoint: `/api/public/tenants/{client-slug}/webhooks/gohighlevel/leads`
- [ ] Copy from `peskids` webhook handler
- [ ] Update tenant_slug validation
- [ ] Add webhook secret check

### Verification

```bash
# Test webhook receiver
curl -X POST http://localhost:3000/api/public/tenants/{client-slug}/webhooks/gohighlevel/leads \
  -H "Content-Type: application/json" \
  -d '{"lead_id":"test","email":"test@example.com"}'

# Expected: 200 OK, no errors
```

---

## Phase 2: GHL Configuration (45 minutes)

### Pipeline Setup

**In GHL UI:**

1. Create new pipeline: "{CLIENT} {Business Model}"
   - [ ] Name: [CUSTOMISE: e.g. "Academia Enrollment" or "Barbería Booking"]
   - [ ] Stages: [CUSTOMISE: Choose based on model]

**Education Model (7 stages):**
```
1. New Lead
2. Contacted
3. Trial Scheduled
4. Trial Completed
5. Enrolled
6. Active Student
7. Renewal
```

**Service Model (4 stages):**
```
1. New Lead
2. Booked
3. Service Complete
4. Repeat Customer
```

**Document stage IDs:**
```
Stage Name              | Stage ID
────────────────────────┼──────────
New Lead               | abc123
Contacted              | def456
Trial/Booking          | ghi789
... (continue)
```

### Tags Setup

Create tags in GHL:

[CUSTOMISE: Choose relevant tags]

**Education:**
- `lead-web` — from web form
- `lead-phone` — phone inquiry
- `trial-scheduled` — trial booked
- `trial-completed` — attended trial
- `enrolled` — became student
- `active-student` — paying
- `renewal-due` — renewal period

**Service:**
- `lead-web` — from web form
- `booking-confirmed` — appointment scheduled
- `service-completed` — attended
- `repeat-customer` — booked again

**Document tag IDs:**
```
Tag Name               | Tag ID
──────────────────────┼──────────
lead-web             | tag_123
lead-phone           | tag_456
... (continue)
```

### Custom Fields

Add to contacts in GHL:

[CUSTOMISE: Based on business model]

**Education:**
- `student_name` — student's full name
- `age` — student age
- `parent_phone` — parent contact
- `interest_level` — high/medium/low

**Service:**
- `service_type` — what service (haircut, meal, etc.)
- `preferred_time` — morning/afternoon/evening
- `subscription_status` — active/paused

### Calendar Setup

Create calendar in GHL:

[CUSTOMISE: Based on availability]

```
Calendar Name: {CLIENT} Appointments
Availability: M-F, 9 AM – 5 PM [CUSTOMISE]
Slot Duration: 30 min [CUSTOMISE]
Timezone: Colombia [CUSTOMISE]
```

### Verification

- [ ] Pipeline visible in GHL Opportunities
- [ ] All tags created
- [ ] Custom fields showing in contact form
- [ ] Calendar available for booking

---

## Phase 3: Email & SMS Templates (30 minutes)

### Email Template 1: Welcome

**Name in GHL:** "{CLIENT} — Welcome"  
**Trigger:** Contact Created

[CUSTOMISE: Write welcome email copy]

**Template outline:**
```
Subject: [CUSTOMISE]
Body:
  - Greeting with client name
  - Brief intro to {CLIENT}
  - What happens next
  - CTA: Book appointment / Confirm interest
```

### Email Template 2: Confirmation

**Name in GHL:** "{CLIENT} — Confirmation"  
**Trigger:** Appointment Scheduled

[CUSTOMISE: Write confirmation email copy]

**Template outline:**
```
Subject: [CUSTOMISE]
Body:
  - Appointment details (date, time, location)
  - What to bring / how to prepare
  - Team member intro
  - Cancellation link
```

### SMS Template: Reminder

**Name in GHL:** "{CLIENT} — Reminder"  
**Trigger:** 24h before appointment

[CUSTOMISE: Write SMS (max 160 chars)]

```
Hola {{contact.first_name}}, te recordamos tu cita 
mañana a las {{appointment.time}}. Confirma: [link]
```

### Verification

- [ ] All templates created in GHL
- [ ] Templates published (not draft)
- [ ] Merge tags correct ({{contact.first_name}}, etc.)
- [ ] Test send to test email works

---

## Phase 4: GHL Workflows (45 minutes)

### Workflow 1: Welcome

**Name in GHL:** "{CLIENT} — Welcome"  
**Trigger:** Contact Created  
**Actions:**
1. Delay: 2 minutes
2. Send email: "Welcome" template
3. Add tag: `welcome_sent`

- [ ] Enabled (toggle ON)
- [ ] Test: Create contact → verify email within 5 min

### Workflow 2: Confirmation

**Name in GHL:** "{CLIENT} — Confirmation"  
**Trigger:** Appointment Scheduled  
**Actions:**
1. Delay: 1 minute
2. Send email: "Confirmation" template
3. Add tag: `confirmation_sent`

- [ ] Enabled
- [ ] Test: Book appointment → verify email within 2 min

### Workflow 3: Reminder

**Name in GHL:** "{CLIENT} — Reminder"  
**Trigger:** Time-based (24h before appointment)  
**Actions:**
1. Send SMS: "Reminder" template
2. Add tag: `reminder_sent`

- [ ] Enabled
- [ ] Test: Manual trigger or wait 24h

### Workflow 4: No-show Recovery (Optional)

**Name in GHL:** "{CLIENT} — No-show Recovery"  
**Trigger:** Appointment Status Changed (status = No Show)  
**Actions:**
1. Wait: 1 hour
2. Send SMS: "Reschedule link"
3. Create task: "Follow up with {contact.name}"
4. Add tag: `no_show`

- [ ] Enabled
- [ ] Test: Mark appointment as no-show → verify SMS + task within 1 hour

### Verification

- [ ] All workflows enabled
- [ ] No failed executions in logs
- [ ] All emails/SMS sent on schedule
- [ ] Tags applied correctly

---

## Phase 5: n8n Setup (15 minutes)

[CUSTOMISE if using n8n for advanced workflows]

### Option A: Use n8n (Async Processing)

1. **Docker Container**
   ```bash
   cp docker-compose.n8n-template.yml docker-compose.n8n-{client-slug}.yml
   # Edit: TENANT_SLUG={client-slug}, ports, etc.
   docker-compose up -d n8n-{client-slug}
   ```

2. **Webhook Receiver**
   - Create n8n workflow: "Lead Intake"
   - Trigger: `/webhook/lead-created`
   - Parse GHL payload
   - Test with sample webhook

### Option B: Skip n8n

If using GHL workflows only, skip this step. n8n is for advanced logic only.

---

## Phase 6: End-to-End Testing (30 minutes)

### Test Case 1: Full Flow

1. **Submit lead** (form or manual)
   - [ ] Form submits without error
   - [ ] Success message displays

2. **Verify database**
   - [ ] Check `{client}_leads` table
   - [ ] Verify `tenant_slug = {client-slug}`
   - [ ] Verify all fields populated

3. **Verify GHL**
   - [ ] Contact created in GHL
   - [ ] Tags applied (e.g., `lead-web`)
   - [ ] Opportunity in pipeline
   - [ ] Stage = "New Lead"

4. **Verify emails**
   - [ ] Welcome email received (<5 min)
   - [ ] Email content correct
   - [ ] Merge tags replaced (name, etc.)

5. **Verify workflows**
   - [ ] All workflow logs showing success
   - [ ] No failures
   - [ ] Proper timing (delays working)

### Test Case 2: Appointment Booking

1. **Click calendar link**
   - [ ] Calendar loads
   - [ ] Time slots available

2. **Book appointment**
   - [ ] Appointment created
   - [ ] Calendar shows booking

3. **Verify emails**
   - [ ] Confirmation email sent
   - [ ] Reminder email scheduled

4. **Verify opportunity**
   - [ ] Stage updated (if workflow connected)
   - [ ] Tags updated

### Test Case 3: No-show Recovery

1. **Mark as no-show** in GHL
2. **Verify SMS** sent within 2 min
3. **Verify task** created for ops

### Sign-Off

- [ ] All test cases passed ✅
- [ ] No errors in logs
- [ ] Client ready for live traffic

---

## Launch Checklist

### Pre-Launch (Day Before)

- [ ] All infrastructure tested
- [ ] All GHL config verified
- [ ] All workflows enabled
- [ ] Team trained on dashboard
- [ ] Support contact assigned
- [ ] Monitoring configured

### Launch Day

- [ ] Team standing by
- [ ] Metrics dashboard live
- [ ] Webhook endpoint responding
- [ ] Alert channels configured
- [ ] Client notified

### First 24 Hours

- [ ] Monitor lead volume
- [ ] Verify email delivery
- [ ] Check for errors in logs
- [ ] Respond to any issues
- [ ] Daily check-in with client

### First Week

- [ ] 50+ leads processed
- [ ] >95% email delivery
- [ ] Workflows functioning
- [ ] Metrics being tracked
- [ ] Weekly sync with client

---

## Monitoring & Alerts

### Key Metrics to Track

```
Leads/day: [CUSTOMISE target]
Email delivery rate: 95%+
Workflow success rate: 100%
API response time: <500ms
```

### Alert Conditions

| Alert | Threshold | Action |
|-------|-----------|--------|
| Lead volume drop | <50% of avg | Check webhook |
| Email failures | >5% | Check GHL |
| Workflow failures | Any | Page ops |
| Slow API | >1s response | Scale API |

### Logs Location

- **Webhook logs:** `platform.webhook_logs`
- **Email logs:** GHL email delivery logs
- **Workflow logs:** GHL workflow logs
- **API logs:** Server logs

---

## Documentation to Create

After launch, create these docs:

- [ ] Team runbook: How to use dashboard
- [ ] Troubleshooting guide: Common issues
- [ ] API documentation: Integration details
- [ ] Admin guide: GHL configuration walkthrough
- [ ] Metrics guide: How to read dashboard

---

## Post-Launch Roadmap (Phase 2+)

- [ ] Lead scoring (auto-rank quality)
- [ ] Conversion automation (trial → sale)
- [ ] Billing integration (if applicable)
- [ ] Email sequences (nurture campaign)
- [ ] Retention workflows

---

## Success Criteria

✅ **Day 1:**
- [ ] Leads flowing in
- [ ] Contacts created in GHL
- [ ] Welcome emails sent
- [ ] 0 critical errors

✅ **Week 1:**
- [ ] 50+ leads processed
- [ ] 100% contact creation success
- [ ] 95%+ email delivery
- [ ] Calendar bookings working

✅ **Month 1:**
- [ ] 200+ leads total
- [ ] Conversion metrics measured
- [ ] Client satisfied
- [ ] Ready for Phase 2

---

## Support Escalation

**Tier 1 (Ops):** 30 min
- Check webhook logs
- Verify GHL config
- Check Doppler secrets

**Tier 2 (Dev):** 1 hour
- Debug API logic
- Check database queries
- Review workflow logs

**Tier 3 (Product):** 2+ hours
- Architecture decisions
- New feature design
- Client roadmap

---

## Quick Reference

**Key Files to Update:**

```bash
# Add to CUSTOMER-FOLLOWUP-MASTER.md
docs/blueprints/CUSTOMER-FOLLOWUP-MASTER.md

# Update environment
doppler secrets set GOHIGHLEVEL_{CLIENT}_API_KEY ...

# Add webhook receiver
apps/api/app/public/tenants/{client-slug}/webhooks/...

# Create migrations
supabase/migrations/{date}_{client}_schema.sql
```

**Quick Commands:**

```bash
# Test webhook
curl -X POST http://localhost:3000/api/public/tenants/{client-slug}/webhooks/gohighlevel/leads

# Check logs
tail -f logs/webhook.log | grep {client-slug}

# Database check
psql -d opsly -c "SELECT * FROM {client}_leads LIMIT 1;"

# Run E2E test
./scripts/smoke-{client}-e2e.sh
```

---

## Summary

**Time estimate:** 3-4 hours total

**Phases:**
1. Infrastructure: 30 min ✅
2. GHL Config: 45 min ✅
3. Templates: 30 min ✅
4. Workflows: 45 min ✅
5. n8n Setup: 15 min ✅
6. Testing: 30 min ✅

**Ready to launch on day 1 after Phases 1-6 complete**

---

## Questions?

Refer to:
- **Peskids Model:** `docs/superpowers/specs/2026-06-24-peskids-tenant-settings-design.md`
- **Playbook:** `docs/tenants/SECOND-CLIENT-ONBOARDING-PLAYBOOK.md`
- **Assessment:** `docs/tenants/SECOND-CLIENT-READINESS-ASSESSMENT.md`
- **Master Tracker:** `docs/blueprints/CUSTOMER-FOLLOWUP-MASTER.md`

---

**Last Updated:** 2026-06-25  
**Next Review:** After first client uses template
