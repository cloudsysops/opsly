---
status: draft
owner: qa
created: 2026-06-10
purpose: "Identify blockers to complete lead conversion - no fixes, only identification"
---

# PIPELINE GAP ANALYSIS

**Objective:** Identify everything blocking a lead from submission to conversion (ICSO + Peskids).

**Timeline:** 5 minutes (analysis only, no fixes)

---

## ICSO PIPELINE (Lead Capture Only)

```
Website Form
     ↓
/api/leads endpoint
     ↓
GHL Contact Created
     ↓
Pipeline Stage Set
     ↓
[STOPS HERE]
```

### Status by Component

#### 1. Contact Form → API

**Status:** ✅ **READY**

- ContactForm component converts `mailto:` to POST `/api/leads`
- Form has success/error feedback
- API route validates fields (name, email, message)
- Tested and merged in PR #528

**Gap:** None

---

#### 2. API → GHL Contact

**Status:** ✅ **READY**

- Uses `@intcloudsysops/services/gohighlevel` client
- Creates contact with firstName, lastName, email
- Auto-applies source tag
- Handles errors gracefully

**Gap:** None

---

#### 3. GHL Contact → Pipeline

**Status:** ✅ **READY**

- Contact created in "Opsly Agency Sales" pipeline
- Initial stage: "New Lead"

**Gap:** None

---

#### 4. Lead to Conversion (ICSO)

**Status:** ❌ **NOT IMPLEMENTED**

- No workflow to move leads through pipeline
- No email/SMS follow-ups
- No calendar booking integration
- No conversion metrics

**Gap:** **CRITICAL** — Manual follow-up only

---

## PESKIDS PIPELINE (Full Funnel)

```
Lead Entry (Web/GHL/n8n)
     ↓ [READY]
Supabase Storage
     ↓ [READY]
GHL Contact + Tags
     ↓ [READY]
Pipeline Stages
     ↓ [PARTIAL]
n8n Workflows
     ↓ [PARTIAL]
Email/SMS Follow-up
     ↓ [MANUAL]
Calendar Booking
     ↓ [MANUAL]
Trial Class
     ↓ [MANUAL]
Conversion/Enrollment
     ↓ [BROKEN]
Billing/Recurring
     ↓ [NOT IMPL]
```

---

## DETAILED GAP BREAKDOWN

### 🟢 READY (No Gaps)

#### Lead Ingestion
- ✅ GHL webhook receiver (`/api/public/tenants/peskids/webhooks/gohighlevel/leads`)
- ✅ n8n webhook receiver (`/api/public/tenants/peskids/webhooks/n8n/trigger`)
- ✅ Stripe webhook receiver (`/api/public/tenants/peskids/webhooks/stripe/events`)
- ✅ Multi-tenant isolation (tenant_slug validation)
- ✅ Webhook idempotency (no duplicates)

**Time to fix:** N/A (working)

---

#### Database Storage
- ✅ Supabase schema per tenant (`peskids`)
- ✅ Tables: peskids_leads, peskids_contacts, peskids_opportunities
- ✅ RLS policies (tenant isolation)
- ✅ Webhook logs table

**Time to fix:** N/A (working)

---

#### GHL Integration
- ✅ API client: Create contacts
- ✅ API client: Apply tags
- ✅ API client: Update pipeline stages
- ✅ API provisioning script (auto-creates tags/fields/calendars)
- ✅ Private integration (credentials configured)

**Time to fix:** N/A (working)

---

### 🟡 PARTIAL (Partially Implemented, Manual Steps Needed)

#### GHL Workflows (4 of 4 Spec'd, 0 of 4 Implemented)

| Workflow | Status | Gap |
|----------|--------|-----|
| Welcome Lead | ❌ MANUAL | Must create in GHL UI (trigger: Contact Created) |
| Trial Confirmation | ❌ MANUAL | Must create in GHL UI (trigger: Appointment Scheduled) |
| Trial Reminder | ❌ MANUAL | Must create in GHL UI (trigger: 24h before appt) |
| No-show Recovery | ❌ MANUAL | Must create in GHL UI (trigger: Status = No Show) |

**Specification:** Complete in `docs/tenants/peskids/GHL-WORKFLOW-TEMPLATES.md`

**What blocks:** Email/SMS follow-ups not triggered automatically

**Time to fix:** 1 hour (drag-drop in GHL UI)

---

#### GHL Email/SMS Templates

| Template | Status | Gap |
|----------|--------|-----|
| Welcome Parent | ❌ MANUAL | Must create in GHL Email Templates |
| Trial Confirmation | ❌ MANUAL | Must create in GHL Email Templates |
| Trial Reminder | ❌ MANUAL | Must create in GHL SMS Templates |

**Specification:** Complete in `docs/tenants/peskids/GHL-WORKFLOWS.md`

**What blocks:** Automated follow-up emails/SMS not sent

**Time to fix:** 30 minutes (copy specs, create in GHL UI)

---

#### n8n Workflow Templates

**Status:** Framework ready, templates missing

**What exists:**
- ✅ Docker Compose per tenant
- ✅ Webhook receiver endpoint
- ✅ Execution logging
- ✅ OAuth framework

**What's missing:**
- ❌ Starter workflow templates (for import)
- ❌ Lead intake workflow (must build manually)
- ❌ Lead scoring workflow (must build manually)
- ❌ Conversion decision workflow (must build manually)

**What blocks:** Customers must build n8n workflows from scratch

**Time to fix:** 2 sprints (design templates, test, document)

---

#### Calendar Booking Integration

**Status:** Calendars exist, no booking flow

**What exists:**
- ✅ GHL calendars created ("Trial Class", "Assessment")
- ✅ 30-min slot duration configured
- ✅ Schedule rules applied (M-F 9-5)

**What's missing:**
- ❌ Portal calendar widget (customers can't see availability)
- ❌ Calendar API for self-service booking
- ❌ Booking notification to parent
- ❌ Calendar sync to n8n (appointment status)

**What blocks:** Calendar bookings manual or require GHL UI access

**Time to fix:** 1 sprint (embed GHL calendar widget or build custom booking)

---

### 🔴 BROKEN (Not Implemented, Needs Design)

#### Lead Scoring

**Status:** ❌ NOT IMPLEMENTED

**What's needed:**
- Lead qualification rules (age, location, interest)
- Auto-scoring in n8n workflow
- Score threshold for "hot lead" tag
- Manual override option

**What blocks:** Can't prioritize leads by conversion likelihood

**Time to fix:** 1 sprint (design scoring rules, implement in n8n)

---

#### Conversion Decision Logic

**Status:** ❌ NOT IMPLEMENTED

**What's needed:**
- Trial attendance tracking (mark "completed" or "no-show")
- Parent feedback collection (convert or not?)
- Conversion workflow trigger (move to "Enrolled")
- Enrollment form or confirmation email

**What blocks:** No automated path from "Trial Class" → "Enrolled"

**Time to fix:** 2 sprints (feedback form, workflow, Stripe subscription linkage)

---

#### Billing Integration

**Status:** ⚠️ PARTIAL (Stripe ready, Peskids mapping missing)

**What exists:**
- ✅ Stripe API integration
- ✅ Subscription creation endpoint
- ✅ Invoice generation
- ✅ Usage tracking framework

**What's missing:**
- ❌ Peskids-specific subscription setup (no plan configured)
- ❌ Parent payment method entry (UI missing)
- ❌ Automated recurring charges for monthly plan
- ❌ Dunning (auto-retry on failed payments)
- ❌ Invoice email customization

**What blocks:** No monetization; trials are free, no conversion to paying

**Time to fix:** 1 sprint (Peskids pricing tiers, parent payment UI, recurring charge)

---

#### Retention & Renewal

**Status:** ❌ NOT IMPLEMENTED

**What's needed:**
- "Active Student" stage automation
- Renewal reminder 30 days before expiry
- Churn detection (no attendance in 4+ weeks)
- Win-back campaign for churned students

**What blocks:** No visibility into student retention metrics

**Time to fix:** 2 sprints (metrics dashboard, renewal workflow, churn alerts)

---

## GAP SUMMARY TABLE

| Component | Status | Gap Type | Fix Time |
|-----------|--------|----------|----------|
| **Lead Ingestion** | ✅ READY | None | — |
| **GHL Contacts** | ✅ READY | None | — |
| **GHL Workflows** | 🟡 PARTIAL | Manual UI | 1h |
| **Email/SMS** | 🟡 PARTIAL | Manual UI | 30min |
| **n8n Templates** | 🟡 PARTIAL | Missing catalog | 2 sprints |
| **Calendar Booking** | 🟡 PARTIAL | No UI | 1 sprint |
| **Lead Scoring** | 🔴 BROKEN | Not designed | 1 sprint |
| **Conversion Logic** | 🔴 BROKEN | Not designed | 2 sprints |
| **Billing** | 🟡 PARTIAL | Setup missing | 1 sprint |
| **Retention** | 🔴 BROKEN | Not designed | 2 sprints |

---

## CRITICAL BLOCKERS (Must Fix Before Revenue)

| Blocker | Impact | Est. Fix |
|---------|--------|----------|
| **GHL Workflows** | No auto follow-up | 1 hour (UI) |
| **Billing Setup** | No monetization | 1 sprint |
| **Conversion Decision** | Leads stuck in "Trial Class" | 2 sprints |

---

## TONIGHT'S PRIORITIES (For Cristian)

1. **ICSO:** Verify lead capture works (Form → API → GHL) ✅
2. **Peskids:** Verify lead flow works (Supabase → GHL → n8n) ✅
3. **Identify:** What's blocking conversion (this analysis)
4. **Plan:** What to fix in which order

---

## DO NOT ATTEMPT TONIGHT

❌ Fix GHL workflows (1 hour, but manual UI — do tomorrow)  
❌ Build n8n templates (2 sprints — roadmap item)  
❌ Build calendar booking UI (1 sprint — roadmap item)  
❌ Implement lead scoring (1 sprint — roadmap item)  
❌ Build conversion workflow (2 sprints — roadmap item)  
❌ Setup Peskids billing (1 sprint — roadmap item)  

---

## NEXT STEPS (After Tonight)

**Tomorrow:**
- [ ] Create GHL workflows (1 hour, spec exists)
- [ ] Create email/SMS templates (30 min, spec exists)

**This Sprint:**
- [ ] n8n workflow templates
- [ ] Calendar booking UI
- [ ] Peskids billing integration

**Next Sprint:**
- [ ] Lead scoring
- [ ] Conversion decision logic
- [ ] Retention workflows
