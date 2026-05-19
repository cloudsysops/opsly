# Peskids MVP Plan — Grounded in Operational Blueprint

**Purpose:** Define MVP scope, grounded in Opsly Operational Blueprint principles  
**Status:** Ready for Phase 1 (Design)  
**Updated:** 2026-05-19

---

## MVP Thesis

**Hypothesis:** After-school program owners can organize and grow their business using a simple web platform that shows all leads, feedback, and follow-ups in one place.

**MVP validates:** Can we prove this with 20–30 real users using a 5-card dashboard + 3 forms, without auto-send, without AI?

---

## MVP Principles (Blueprint-Aligned)

### 1. **Approval-First Only**
- ❌ No auto-messaging to parents
- ❌ No auto-enrollment
- ❌ No background workflows
- ✅ Owner explicitly clicks "follow-up" button
- ✅ Owner sees what will be sent BEFORE we send
- ✅ Owner can withdraw approval mid-send

**Why:** Builds trust. No surprises. Owner controls their business.

### 2. **Minimal Data Burden**
- Collect only what's operationally necessary
- 5-question lead form (name, email, phone, grade, source)
- 1-question weekly feedback (satisfaction rating)
- No analytics tracking parent behavior
- No predictive scoring (yet)

**Why:** Privacy-first. Parent trust. GDPR-friendly.

### 3. **Real-Time Visibility**
- New leads appear in dashboard within 2 seconds
- Feedback alerts show within 1 second
- No batch jobs; no "wait until tomorrow"
- Owner sees what's happening NOW

**Why:** Operational need. Owner needs to know if a lead came in while they were in a class.

### 4. **Event-Driven (Blueprint Validated)**
- Every user action = event in Opsly event bus
- Events are immutable, logged, replayable
- Other services can subscribe (billing, reporting, future AI)
- No brittle API contracts

**Why:** Operational safety. If something breaks, we can replay and recover.

### 5. **Multi-Tenant Isolation (Blueprint Validated)**
- Peskids Tenant A's data never mixes with Tenant B
- RLS at database layer enforces this
- No cross-tenant bugs possible
- Events include tenant_id

**Why:** Operational safety. Legal requirement. Build trust.

---

## MVP Scope

### What's Included

#### Landing Page
- Hero: "Manage your after-school program"
- Lead capture form (5 fields)
- 3 benefit bullets
- CTA: "View dashboard"
- Mobile-responsive

#### Admin Dashboard (5 Cards)
1. **New Leads This Week** — Count + list (name, email, phone, grade)
2. **Active Students** — Count + breakdown by grade
3. **Parent Feedback** — Recent ratings (1-5 stars) + snippets
4. **Pending Follow-ups** — Count + due dates (alert if overdue)
5. **This Week's Trend** — Simple line chart (leads per day)

#### Lead Capture Form
- 5 fields: name, email, phone, grade, referral source
- Client-side validation
- POST to `/api/leads`
- Event: `lead.created`
- Confirmation page with dashboard link

#### Parent Feedback Form
- 3 fields: child name, satisfaction (1-5), suggestion
- On-demand or weekly via email
- POST to `/api/feedback`
- Event: `feedback.created`
- If satisfaction < 3: alert admin

#### Follow-up Tracking
- Admin creates follow-up from lead/feedback detail
- Due date + notes
- Dashboard shows pending + overdue
- Mark complete → event `followup.completed`
- Suggest next follow-up date (manual input)

#### Weekly Report
- Manual summary: "12 leads this week, 2 new students, avg satisfaction 4.2"
- Email template (no auto-generation yet)
- Owner fills in metrics + sends manually

### What's NOT Included

- ❌ WhatsApp integration
- ❌ Email auto-send
- ❌ SMS messaging
- ❌ AI message generation
- ❌ Payment processing / billing
- ❌ Teacher portals
- ❌ Student accounts
- ❌ Multi-language (English only for MVP; Spanish demo script exists)
- ❌ Advanced segmentation
- ❌ Predictive scoring
- ❌ Integrations with other CRMs

---

## Technical Architecture (Operational Blueprint)

### Database (Supabase)

**Tables:**
```sql
leads
├─ id, tenant_id, name, email, phone
├─ grade_interested, referral_source
├─ created_at, status, admin_notes

students
├─ id, tenant_id, name, grade
├─ status (active/inactive), parent_email
├─ enrollment_date

feedback
├─ id, tenant_id, child_name, satisfaction
├─ suggestion, contact_wanted, parent_email
├─ created_at

followups
├─ id, tenant_id, contact_id, contact_type
├─ type (call/email/sms/in-person)
├─ due_date, status, notes, created_at
```

**RLS Policies:**
- All queries filtered by `auth.uid()` → tenant_id
- Admin can see only own tenant's data
- No cross-tenant queries possible

### API (Next.js)

**Endpoints:**
```
POST   /api/leads              (public, no auth)
POST   /api/feedback           (public, no auth)
POST   /api/followups          (admin auth)
PATCH  /api/followups/:id      (admin auth)
GET    /api/dashboard          (admin auth)
```

**Auth:** Supabase Auth (email/password)

### Events (Opsly Event Bus)

**9 Events emitted:**
```
lead.created
lead.updated
feedback.created
feedback.alert (if satisfaction < 3)
followup.created
followup.completed
student.created
weekly_report.requested
weekly_report.generated
```

**Contract:** EVENT-CONTRACT.md

### Frontend (Next.js + React)

**Pages:**
- `/` — Landing page + lead form
- `/thanks` — Confirmation page
- `/admin` — Dashboard (RLS protected)
- `/admin/leads/:id` — Lead detail view
- `/admin/feedback/:id` — Feedback detail view
- `/admin/followups/:id` — Follow-up detail view

**Real-time updates:**
- Supabase Realtime subscriptions (WebSocket)
- New lead appears in dashboard within 2 seconds
- Feedback alert shows within 1 second

---

## Timeline

### Phase 1: Design & Validation (7 days)
**Sprint:** SPRINT-01.md

- Wireframes (landing, dashboard, forms)
- Form specs (fields, validation, events)
- Dashboard spec (5 cards, SQL queries)
- Event contract
- Demo script
- **Owner approval required before Phase 2**

### Phase 2: Build MVP (7 days)
- Landing page HTML/CSS
- Lead form implementation
- Database schema + RLS
- Admin dashboard
- Feedback form
- Follow-up tracking UI
- Event emissions
- Email template

### Phase 3: Launch & First Users (7 days)
- Deploy to production
- First owner uses dashboard
- Capture first 20+ leads
- Monitor for bugs
- Ops Agent watches logs/metrics
- Metrics collection

---

## Acceptance Criteria (MVP Success)

**Phase 1 ✅**
- [ ] Owner watches demo, says "yes, build this"
- [ ] All specs reviewed + approved
- [ ] No blockers identified

**Phase 2 ✅**
- [ ] Landing page loads in <2s
- [ ] Lead form submits successfully
- [ ] Database RLS tested + enforced
- [ ] Dashboard shows real data
- [ ] Events flow to Opsly event bus
- [ ] Weekly report email works
- [ ] No security vulnerabilities

**Phase 3 ✅**
- [ ] 20+ leads captured
- [ ] 3+ students enrolled
- [ ] Owner uses dashboard daily
- [ ] Zero data breaches
- [ ] Approval-first workflow is natural
- [ ] Owner gives thumbs up

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Owner unavailable for demo** | High | Schedule 1 week in advance; async feedback option |
| **Database RLS is complex** | Medium | Use template from Opsly; test with 2+ tenants |
| **Event bus delivery unreliable** | Medium | At-least-once semantics; consumer idempotency |
| **Real-time updates fail** | Low | Fall back to 5-second poll; acceptable UX |
| **Approval workflow feels clunky** | Medium | Iterate UX based on Phase 3 feedback |

---

## Success Metrics

### Quantitative

- **Phase 1:** 0 blockers, 1 owner approval
- **Phase 2:** 0 production bugs, <2s page load
- **Phase 3:** 20+ leads, 3+ students, 95%+ uptime

### Qualitative

- **Phase 1:** Owner says "this solves our problem"
- **Phase 2:** Developers say "specs were clear"
- **Phase 3:** Owner says "I use this every day"

---

## Operational Insights (Blueprint Validation)

**What we'll learn for Opsly:**

1. ✅ Multi-tenant RLS is operationally viable
2. ✅ Event contracts work for real services
3. ✅ Approval-first is feature, not bug
4. ✅ Real-time dashboards scale simply
5. ❓ How much should approval workflows automate?
6. ❓ What's the right granularity for events?

**Findings feed into:**
- Opsly Operational Blueprint v0.2
- Next tenant's onboarding playbook
- Architecture decisions for multi-tenant core

---

## Not in MVP (But Planned)

### Phase 4+ (Future Sprints)
- Multi-language (Spanish, Portuguese)
- WhatsApp integration (approval-first)
- AI suggestions (for follow-ups, feedback categorization)
- Webhooks for 3rd-party CRM sync
- Payment/billing integration
- Teacher portal
- Student progress tracking
- Automated weekly report
- Predictive lead scoring
- Sentiment analysis of feedback

### Post-MVP (Year 2+)
- Standalone extraction (run Peskids without Opsly)
- Multi-org support (multiple owners per Peskids tenant)
- API versioning + stability for 3rd-party devs

---

## Approval Gates

**Gate 1 (End of Phase 1):** Owner approves design
**Gate 2 (End of Phase 2):** QA approves no security issues
**Gate 3 (Launch):** Ops clears production deployment

---

## References

- README.md — Overview + phases
- BLUEPRINT-MAPPING.md — How Peskids aligns with Opsly
- EXTRACTION-PLAN.md — Future independence timeline
- MVP-BACKLOG.md — 9 epics, acceptance criteria
- SPRINT-01.md — 7-day phase 1 plan
- DASHBOARD-SPEC.md — 5-card dashboard detail
- FORMS-SPEC.md — 4 forms with validation
- EVENT-CONTRACT.md — 9 events and integration
- DEMO-SCRIPT.md — Owner presentation script
