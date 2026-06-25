---
status: active
created: 2026-06-25
purpose: "Análisis detallado de readiness y automatizaciones: ICSO vs Peskids"
---

# Customer Analysis: ICSO vs Peskids

**Objetivo:** Comparar estado actual, automatizaciones críticas, y plan de implementación para ambos clientes.

---

## EXECUTIVE SUMMARY

| Aspecto | ICSO | Peskids |
|--------|------|---------|
| **Tipo** | Website lead capture | Education (trial-based) |
| **GHL Readiness** | 72% ✅ | 69% ✅ |
| **n8n Readiness** | 0% ⏳ | 30% ✅ (partial) |
| **Lead Volume** | 1-2/week | 10+/week |
| **Revenue Model** | Discovery calls | Monthly subscriptions |
| **Time to Revenue** | 2-4 weeks | 2-3 months |
| **Auto-Priority** | Medium (nice-to-have) | HIGH (critical) |

---

## 1. ICSO (INTCLOUDSYSOPS WEBSITE)

### A. Current State

#### Infrastructure ✅ COMPLETE

```
Website Form
  ↓ (POST /api/leads)
Opsly API (apps/api/app/public/leads/)
  ↓ (webhook)
GHL Location: qD7Z9jt3owk0LMtKElow
  ├─ Contact created (auto)
  ├─ Tags applied: icso-website, lead-web
  ├─ Opportunity created (auto)
  └─ Stage: New Lead
       ↓
   Calendar link returned to user
```

**Status:** ✅ 100% operational

**Evidence:**
- Form live on opsly.intcloudsysops.com
- API endpoint responding
- GHL contact creation confirmed
- Calendar booking working

---

#### n8n Integrations ⏳ PARTIAL (0%)

**What's Missing:**
- ❌ Welcome email workflow (GHL should handle, but n8n backup?)
- ❌ Discovery reminder (24h before) — critical
- ❌ No-show follow-up automation
- ❌ Nurture sequences (if no booking after 3 days)
- ❌ Post-discovery follow-up

**Current State:** GHL workflows handle some, but n8n not configured yet.

---

### B. Lead Flow Analysis

```
┌─────────────────────────────────────────────────────┐
│ ICSO Lead Journey (Current)                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1. Website form submission (opsly.intcloudsysops.com)
│    └─ Fields: name, email, phone, company, interest
│    └─ Validation: ✅ Zod schema
│    └─ Storage: ✅ Supabase (intcloudsysops_leads)
│                                                     │
│ 2. GHL Contact creation (automatic)                │
│    └─ Status: ✅ Working                           │
│    └─ Tags: ✅ icso-website, lead-web              │
│    └─ Source: ✅ API integration                   │
│    └─ Deduplication: ✅ By email (idempotent)     │
│                                                     │
│ 3. Opportunity creation                            │
│    └─ Pipeline: ✅ "Opsly Agency Sales" (manual UI)
│    └─ Stage: ✅ New Lead                           │
│    └─ SLA: ⚠️ Manual creation (Phase 1)           │
│                                                     │
│ 4. Calendar link return                            │
│    └─ URL: ✅ Discovery Call calendar             │
│    └─ User action: ✅ Book discovery call          │
│                                                     │
│ 5. [MISSING] Automated follow-up                   │
│    └─ Welcome email: ⏳ GHL workflow (manual)      │
│    └─ Reminder (24h before): ❌ MISSING            │
│    └─ No-show recovery: ❌ MISSING                 │
│    └─ Post-call follow-up: ❌ MISSING              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### C. Metrics & KPIs

**Current (Last 7 days):**
- Forms submitted: 1-2/week
- Contact creation success: 100%
- Calendar booking rate: ~50%
- No-show rate: Unknown (no tracking)

**Targets:**
- Forms/week: ↑ to 5-10 (via marketing)
- Booking rate: 60%+
- No-show rate: <20%
- Conversion (discovery → proposal): 50%+

---

### D. Manual UI Setup Status (Phase 1)

| Item | Status | Owner | Time |
|------|--------|-------|------|
| Pipeline "Opsly Agency Sales" | ⏳ Pending | Ops | 45 min |
| Lead form "Opsly Agency Lead Capture" | ⏳ Pending | Ops | 30 min |
| Email template: Welcome | ⏳ Pending | Marketing | 15 min |
| Email template: Discovery Confirmation | ⏳ Pending | Marketing | 15 min |
| SMS template: Discovery Reminder | ⏳ Pending | Marketing | 10 min |
| Workflow 1: Welcome | ⏳ Pending | Ops | 30 min |
| Workflow 2: Discovery Reminder (24h) | ⏳ Pending | Ops | 30 min |
| Workflow 3: No-show recovery | ⏳ Pending | Ops | 30 min |
| **Total Manual Work** | **2.5 hours** | — | — |

---

### E. n8n Automation Needs

#### CRITICAL (Go-Live)

❌ **Discovery Call Reminder (24h before)**
- Trigger: Appointment in Discovery Call calendar, 24h before
- Action: Send SMS + Email reminder
- n8n needed: YES (GHL workflow might not support SMS timing)
- Owner: Dev (n8n setup) + Ops (GHL workflow)
- SLA: 24h ± 30 min

❌ **No-Show Follow-up**
- Trigger: Appointment marked "No Show"
- Action: 1h delay → Send SMS + create task + email
- n8n needed: YES (better error handling than GHL)
- Owner: Dev (n8n) + Ops
- SLA: <1h after no-show
- Success metric: 20-30% re-engagement

#### HIGH (Week 1-2)

❌ **Post-Discovery Follow-up**
- Trigger: 2h after discovery marked "Completed"
- Action: Send proposal + request feedback
- n8n needed: YES (requires proposal retrieval/generation)
- Owner: Dev (n8n) + Sales

❌ **Nurture Campaign (No Conversion)**
- Trigger: 5 days after proposal, no activity
- Action: Send follow-up email + case studies
- n8n needed: YES (requires CRM tracking)
- Owner: Marketing + Dev

---

### F. Readiness Score (Current)

```
Phase 1 (Infrastructure):    ████████░░ 80%
├─ API integration:          ██████████ 100%
├─ GHL contact creation:     ██████████ 100%
├─ Calendar link:            ██████████ 100%
├─ Manual UI (pipelines):    ░░░░░░░░░░ 0%
└─ Manual UI (forms/templates): ░░░░░░░░░░ 0%

Phase 2 (Automations):       ░░░░░░░░░░ 0%
├─ Welcome workflow:         ░░░░░░░░░░ 0%
├─ Reminder workflow:        ░░░░░░░░░░ 0%
├─ n8n integration:          ░░░░░░░░░░ 0%
└─ Metrics dashboard:        ░░░░░░░░░░ 0%

OVERALL READINESS: 72% (Phase 1 ready, Phase 2 NOT started)
```

---

### G. Next Steps (ICSO)

**Week 1 (Critical):**
1. [ ] Create pipeline + form in GHL (2.5 hrs)
2. [ ] Run E2E tests
3. [ ] Go-live with basic automation

**Week 2 (High Priority):**
1. [ ] Set up n8n discovery reminder workflow
2. [ ] Set up n8n no-show recovery
3. [ ] Create metrics dashboard

**Week 3+:**
1. [ ] Nurture email sequences
2. [ ] Lead scoring
3. [ ] ROI tracking

---

---

## 2. PESKIDS (EDUCATION — TRIAL-BASED)

### A. Current State

#### Infrastructure ✅ COMPLETE

```
Trial Form (Web/App)
  ↓ (POST /api/tenants/peskids/leads)
Supabase: peskids_leads
  ├─ Lead stored (idempotent on lead_id)
  ├─ RLS policies: tenant_slug = peskids
  └─ Webhook dispatch to n8n
       ↓
GHL Location: KJ5LawrOOe3hIerqtMRu
  ├─ Contact created (auto)
  ├─ Tags applied: lead-web, trial-scheduled
  ├─ Custom fields: child_name, age, interest_level
  ├─ Opportunity created (auto)
  └─ Stage: New Lead
```

**Status:** ✅ 100% operational (auto-provisioned)

**Evidence:**
- Webhook receiver: `/api/public/tenants/peskids/webhooks/gohighlevel/leads` ✅
- Database schema: `peskids_leads`, `peskids_contacts`, `peskids_opportunities` ✅
- n8n integration: Partial (some workflows, needs expansion)
- Test lead created & verified (2026-06-05) ✅

---

#### n8n Integrations ✅ PARTIAL (30%)

**What's Working:**
- ✅ Lead intake webhook (GHL → Opsly → n8n)
- ✅ Welcome message dispatch (n8n workflow exists)
- ✅ n8n logging & error handling

**What's Missing:**
- ⏳ Trial reminder (24h before) — manual verification needed
- ❌ Trial attendance tracking (automated status sync)
- ❌ Enrollment offer workflow (after trial completed)
- ❌ Active student billing reminders (monthly)
- ❌ Churn detection & retention (weekly check)

**Current State:** Partially implemented, needs expansion.

---

### B. Lead Flow Analysis

```
┌────────────────────────────────────────────────────┐
│ PESKIDS Lead Journey (Current)                    │
├────────────────────────────────────────────────────┤
│                                                   │
│ 1. Trial registration form                       │
│    └─ Fields: parent_name, child_name, age, etc. │
│    └─ Validation: ✅ Zod schema                  │
│    └─ Storage: ✅ Supabase (peskids_leads)       │
│                                                   │
│ 2. Webhook dispatch to n8n                       │
│    └─ Status: ✅ Working                         │
│    └─ Payload: ✅ Includes lead metadata         │
│    └─ Retry logic: ✅ Implemented                │
│                                                   │
│ 3. GHL Contact creation                          │
│    └─ Status: ✅ Automatic                       │
│    └─ Tags: ✅ lead-web, trial-scheduled         │
│    └─ Custom fields: ✅ child_name, age, etc.    │
│                                                   │
│ 4. Opportunity creation                          │
│    └─ Pipeline: ✅ "Peskids Enrollment" (manual UI)
│    └─ Stage: ✅ New Lead                         │
│                                                   │
│ 5. Welcome message (n8n)                         │
│    └─ Email: ✅ Exists (n8n workflow)            │
│    └─ SMS: ⏳ Manual verification needed         │
│    └─ Timing: ✅ 1-2 min (SLA met)              │
│                                                   │
│ 6. [CRITICAL] Trial class scheduling             │
│    └─ Calendar: ✅ "Trial Class" exists          │
│    └─ User action: ⏳ Parent books trial        │
│                                                   │
│ 7. [MISSING] Trial reminder (24h before)         │
│    └─ SMS: ❌ MISSING (GHL workflow setup manual) │
│    └─ Email: ❌ MISSING (GHL workflow setup manual)
│    └─ n8n backup: ⏳ Could implement            │
│                                                   │
│ 8. [MISSING] Trial attendance tracking           │
│    └─ Status sync: ❌ Not automated              │
│    └─ Enrollment trigger: ❌ Manual              │
│                                                   │
│ 9. [MISSING] Active student management           │
│    └─ Billing reminders: ❌ Not automated        │
│    └─ Churn detection: ❌ Not automated          │
│                                                   │
└────────────────────────────────────────────────────┘
```

---

### C. Metrics & KPIs

**Current (Last 7 days):**
- Leads submitted: 10+/week ✅
- Contact creation success: 100%
- Trial booking rate: ~60%
- Trial completion rate: Unknown (no tracking)
- Conversion rate (trial → enrolled): ~40% (estimated)
- Active students: 150+

**Revenue Impact:**
- Estimated MRR: 150 students × $99/month = $14,850/month
- New enrollments/month: 35-92 (Phase 1 impact)
- Additional MRR potential: $3,500-$9,100/month

**Targets:**
- Leads/week: ↑ to 15-20 (via marketing)
- Trial booking rate: 70%+
- No-show rate: <20%
- Conversion (trial → enrolled): 60%+
- Churn rate: <10%/month

---

### D. Manual UI Setup Status (Phase 1)

| Item | Status | Owner | Time | Notes |
|------|--------|-------|------|-------|
| Pipeline "Peskids Enrollment" | ⏳ Pending | Ops | 45 min | 6 stages |
| Lead form "Peskids Trial Registration" | ⏳ Pending | Ops | 30 min | Parent + child data |
| Email template: Welcome Parent | ⏳ Pending | Marketing | 15 min | Spanish |
| Email template: Trial Confirmation | ⏳ Pending | Marketing | 15 min | Spanish |
| SMS template: Trial Reminder | ⏳ Pending | Marketing | 10 min | <160 chars |
| Workflow 1: Welcome | ⏳ Pending | Ops | 30 min | Trigger: Contact Created |
| Workflow 2: Confirmation | ⏳ Pending | Ops | 30 min | Trigger: Appointment Scheduled |
| Workflow 3: Reminder (24h) | ⏳ Pending | Ops | 30 min | Time-based |
| Workflow 4: No-show recovery | ⏳ Pending | Ops | 30 min | No-show follow-up |
| n8n setup | ⏳ Pending | Dev | 15 min | Webhook receiver |
| **Total Manual Work** | **2.5 hours** | — | — | — |

---

### E. n8n Automation Needs

#### CRITICAL (Go-Live) — Revenue-Blocking

🔴 **Trial Class Reminder (24h before)**
- Trigger: Appointment in Trial Class calendar, 24h before
- Action: SMS + Email reminder
- n8n needed: YES (backup to GHL workflow)
- Owner: Dev (n8n) + Ops (GHL)
- SLA: 24h ± 15 min
- **Business Impact:** <50% no-show without reminder → $1,500-2,500/month lost
- **Priority:** CRITICAL

🔴 **Trial Attendance Tracking**
- Trigger: Appointment status changed (Completed/No Show)
- Action: Auto-sync status → trigger enrollment or recovery
- n8n needed: YES (GHL API webhook)
- Owner: Dev (n8n)
- SLA: <5 min sync
- **Business Impact:** Without tracking, can't trigger enrollment flow
- **Priority:** CRITICAL

🔴 **Enrollment Trigger**
- Trigger: Trial marked "Completed" + Parent accepts enrollment
- Action: Create student profile, schedule first classes, send payment setup
- n8n needed: YES (multi-step workflow)
- Owner: Dev (n8n) + Billing
- SLA: <10 min
- **Business Impact:** Every hour delay = lost enrollment
- **Priority:** CRITICAL

#### HIGH (Week 1-2) — Revenue-Enhancing

🟡 **Active Student Billing Reminder**
- Trigger: 1st of month (cron job)
- Action: Send payment reminder for all active students
- n8n needed: YES (scheduled job)
- Owner: Dev (n8n) + Billing
- **Business Impact:** <5% payment failures → $700/month saved
- **Priority:** HIGH

🟡 **Churn Detection & Retention**
- Trigger: Weekly (Sundays, 8 AM)
- Action: Query no-attendance in 30 days, send re-engagement SMS
- n8n needed: YES (scheduled job + AI scoring)
- Owner: Dev (n8n) + Product
- **Business Impact:** 30% re-engagement = $1,000+/month recovered
- **Priority:** HIGH

#### NICE TO HAVE (Future)

- [ ] Lead scoring (identify high-conversion leads)
- [ ] Sibling referral campaigns
- [ ] Seasonal promotions (summer camps, holiday specials)
- [ ] AI-powered trial recommendations (based on age/interest)

---

### F. Readiness Score (Current)

```
Phase 1 (Infrastructure):    ██████████ 100%
├─ API integration:          ██████████ 100%
├─ Webhook receiver:         ██████████ 100%
├─ GHL contact creation:     ██████████ 100%
├─ Manual UI (pipelines):    ░░░░░░░░░░ 0%
└─ Manual UI (forms/templates): ░░░░░░░░░░ 0%

Phase 2 (n8n Automations):   ███░░░░░░░ 30%
├─ Lead intake:              ██████████ 100%
├─ Welcome workflow:         ██████████ 100%
├─ Trial reminder:           ░░░░░░░░░░ 0% ← CRITICAL
├─ Attendance tracking:      ░░░░░░░░░░ 0% ← CRITICAL
├─ Enrollment trigger:       ░░░░░░░░░░ 0% ← CRITICAL
├─ Billing reminders:        ░░░░░░░░░░ 0%
├─ Churn detection:          ░░░░░░░░░░ 0%
└─ Metrics dashboard:        ░░░░░░░░░░ 0%

OVERALL READINESS: 69% (Phase 1 ready, Phase 2 INCOMPLETE)
REVENUE RISK: 🔴 HIGH (critical automations missing)
```

---

### G. Next Steps (PESKIDS)

**Week 1 (CRITICAL — Revenue-blocking):**
1. [ ] Create pipeline + form in GHL (2.5 hrs)
2. [ ] Create GHL workflows (trial reminder, no-show recovery)
3. [ ] **Set up n8n trials reminders** (Dev)
4. [ ] **Set up n8n attendance tracking** (Dev)
5. [ ] **Set up n8n enrollment trigger** (Dev + Billing)
6. [ ] Run E2E tests
7. [ ] Go-live

**Week 2 (HIGH — Revenue-enhancing):**
1. [ ] Set up n8n billing reminders
2. [ ] Set up n8n churn detection
3. [ ] Create metrics dashboard

**Week 3+:**
1. [ ] Lead scoring
2. [ ] Referral campaigns
3. [ ] Seasonal promotions

---

---

## 3. COMPARISON: ICSO vs PESKIDS

| Aspect | ICSO | Peskids |
|--------|------|---------|
| **Lead Volume** | 1-2/week | 10+/week |
| **Revenue per Lead** | $5,000-50,000 (one-time) | $99/month (recurring) |
| **Lead-to-Revenue** | 2-4 weeks | 2-3 months |
| **Time Sensitivity** | High (discovery scheduling) | HIGH (trial no-show) |
| **Automation Priority** | Medium | 🔴 CRITICAL |
| **n8n Complexity** | Low (3-4 workflows) | HIGH (6+ workflows) |
| **Revenue at Risk (Monthly)** | ~$1,000 (low lead volume) | $1,500-2,500 (trial no-shows) |
| **Phase 1 Status** | 72% ready | 69% ready |
| **Phase 2 Status** | 0% complete | 30% complete (partial) |
| **Go-Live Timeline** | 1 week | 1 week + n8n setup (Dev capacity) |

---

## 4. CRITICAL GAPS ANALYSIS

### ICSO Gaps

| Gap | Impact | Solution | Owner | Time |
|-----|--------|----------|-------|------|
| No reminder workflow | 30-40% no-show rate | n8n workflow (24h SMS/email) | Dev | 2 hrs |
| No no-show recovery | 20-30% re-engagement lost | n8n workflow (SMS + task) | Dev | 2 hrs |
| No nurture campaign | 10-15% conversion loss | n8n scheduled email series | Marketing + Dev | 4 hrs |

**Total Impact:** ~$3,000-5,000/month potential revenue

---

### PESKIDS Gaps (CRITICAL)

| Gap | Impact | Solution | Owner | Time |
|-----|--------|----------|-------|------|
| **No trial reminder** | **<50% show rate** ← Revenue blocker | **GHL workflow + n8n backup** | **Ops + Dev** | **2 hrs** |
| **No attendance tracking** | **Can't trigger enrollment** ← Revenue blocker | **n8n webhook polling** | **Dev** | **3 hrs** |
| **No enrollment trigger** | **Manual conversion** ← Time-consuming | **n8n multi-step workflow** | **Dev + Billing** | **4 hrs** |
| No billing reminders | 5-10% payment failures | n8n monthly cron job | Billing + Dev | 2 hrs |
| No churn detection | 15-25% preventable churn | n8n weekly scoring + SMS | Product + Dev | 4 hrs |

**Total Impact:** $1,500-2,500/month in lost revenue (trial no-shows alone)

---

## 5. RECOMMENDATION: IMPLEMENTATION ORDER

### Phase 1: Go-Live (Both Customers)

**Timeline:** This week (6 hours work)

1. **Intcloudsysops/ICSO:**
   - Create pipeline + form (2.5 hrs) — Ops
   - Set up GHL workflows (1 hr) — Ops
   - E2E testing (30 min) — Dev

2. **Peskids:**
   - Create pipeline + form (2.5 hrs) — Ops
   - Set up GHL workflows (1 hr) — Ops
   - E2E testing (30 min) — Dev

**Critical Path:** Parallel execution (both teams)

---

### Phase 2: n8n Automations (Priority)

**Timeline:** Week 2-3 (requires Dev capacity)

**HIGH PRIORITY (Revenue-blocking for Peskids):**
1. [ ] Peskids: Trial reminder (2 hrs) — Dev
2. [ ] Peskids: Attendance tracking (3 hrs) — Dev
3. [ ] Peskids: Enrollment trigger (4 hrs) — Dev
4. [ ] Peskids: Billing reminders (2 hrs) — Dev
5. [ ] ICSO: Discovery reminder (2 hrs) — Dev
6. [ ] ICSO: No-show recovery (2 hrs) — Dev

**Total n8n Dev Work:** ~15 hours

---

### Phase 3: Advanced Features (Months 2-3)

- Lead scoring
- Churn detection (Peskids)
- Nurture campaigns (ICSO)
- Metrics dashboards
- ROI tracking

---

## 6. RESOURCE ALLOCATION

### Ops Team (This Week)

- Intcloudsysops: 2.5 hrs (pipeline + form + workflows)
- Peskids: 2.5 hrs (pipeline + form + workflows)
- **Total:** 5 hours

### Dev Team

- **Phase 1 (E2E testing):** 1 hour
- **Phase 2 (n8n workflows):** 15 hours (Peskids-first due to revenue impact)

### Marketing Team

- Template creation: 1 hour (both customers)
- Copy approval: 30 min
- **Total:** 1.5 hours

---

## 7. RISK ASSESSMENT

### ICSO Risks

🟡 **Low-to-Medium**
- Low lead volume means lower revenue impact
- Infrastructure is 100% ready
- Phase 1 easy to complete

### PESKIDS Risks

🔴 **HIGH**
- Revenue directly dependent on automation
- Trial no-shows = direct revenue loss ($1,500-2,500/month at risk)
- n8n setup requires Dev time (bottleneck)
- **Mitigation:** Prioritize Dev resources for Peskids automations

---

## 8. SUCCESS METRICS (POST-GO-LIVE)

### ICSO (Week 1)

- [ ] Forms submitted: 2-3/week
- [ ] Calendar booking rate: 50%+
- [ ] No-show rate: <30% (baseline)
- [ ] Welcome email delivery: 95%+

### PESKIDS (Week 1)

- [ ] Leads: 10+/week
- [ ] Trial booking rate: 60%+
- [ ] Trial show rate: 70%+ (with reminders)
- [ ] Enrollment rate: 40%+
- [ ] Revenue: Track conversions to active students

---

**Status:** 🔴 PESKIDS CRITICAL (n8n needed urgently), 🟡 ICSO READY (can wait for Phase 2)  
**Created:** 2026-06-25  
**Owner:** Ops (Phase 1) + Dev (Phase 2 — Peskids first)
