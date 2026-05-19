# Peskids Sprint 01 — MVP Foundation

**Sprint Goal:** Define and validate the Peskids MVP surface. By end of Sprint 01, owner will have seen wireframes, forms, dashboard spec, and said "yes, build this."

**Sprint Duration:** 7 days (May 19–26, 2026)  
**Team:** Codex + Cursor (shared 1 developer)  
**Capacity:** ~5 days developer time  
**Outcome:** All documentation + wireframes ready for owner sign-off

---

## Tasks

### Task 1: Create Landing Page Wireframe
**Owner:** Design/Product  
**Time:** 0.5 days  
**Status:** todo

- Sketch/Figma wireframe showing:
  - Hero section: "Manage your after-school program"
  - Lead form embedded (above fold)
  - 3 benefit sections (bullet points)
  - CTA: "See dashboard"
  - Footer with email/support
- Link in DEMO-SCRIPT.md
- Decision: Static HTML or Figma mockup? (Static HTML for faster)

**Acceptance:**
- [ ] Wireframe created and reviewed
- [ ] Lead form placement clear
- [ ] Mobile-responsive layout sketched
- [ ] Copy approved by owner (TBD)

---

### Task 2: Define Lead Capture Form Fields & Validation
**Owner:** Codex  
**Time:** 0.5 days  
**Status:** todo

Create detailed spec in FORMS-SPEC.md:
- Field: name (required, min 2 chars, max 50)
- Field: email (required, valid email)
- Field: phone (optional, valid phone format)
- Field: grade_interested (required, enum: K–5, 6–8, 9–12)
- Field: referral_source (optional, enum: Google, Friend, Social, Other)

**Validation rules:**
```
name: required, min:2, max:50, alpha+space
email: required, valid-email
phone: optional, phone-format
grade: required, enum
source: optional, enum
```

**On submit:**
- Insert into `leads` table
- Emit `lead.created` event
- Show thank you page with dashboard link
- Any email notification is future/manual and not part of Sprint 01

**Acceptance:**
- [ ] All fields documented
- [ ] Validation rules clear
- [ ] DB table schema defined
- [ ] Event payload example in EVENT-CONTRACT.md

---

### Task 3: Define Parent Feedback Form Fields & Validation
**Owner:** Codex  
**Time:** 0.5 days  
**Status:** todo

Create spec in FORMS-SPEC.md:
- Field: child_name (required, min 2, max 50)
- Field: satisfaction (required, int 1-5 scale)
- Field: suggestion (optional, max 500 chars)
- Field: contact_me_back (optional, checkbox)

**Validation rules:**
```
child_name: required, min:2, max:50
satisfaction: required, int 1-5
suggestion: optional, max:500
contact: optional, boolean
```

**On submit:**
- Insert into `feedback` table
- Emit `feedback.created` event
- If satisfaction < 3: alert admin
- Show thank you page
- Link to dashboard (optional)

**Acceptance:**
- [ ] Fields documented
- [ ] Validation rules clear
- [ ] Alert rule defined (satisfaction < 3)
- [ ] Event payload in EVENT-CONTRACT.md
- [ ] Form is embeddable (can be in Portal or standalone)

---

### Task 4: Define Dashboard Specification (5 Cards Minimum)
**Owner:** Cursor  
**Time:** 1 day  
**Status:** todo

Create DASHBOARD-SPEC.md with:

**Card 1: New Leads This Week**
- Purpose: Quick count of fresh opportunities
- Data source: `leads` table filtered by created_at >= this Monday
- Fields: count (big number), list with name + email + phone
- Empty state: "No new leads this week"
- Future: auto-fetch from CRM

**Card 2: Active Students**
- Purpose: Enrollment overview
- Data source: `students` table filtered by status = "active"
- Fields: count (big number), breakdown by grade
- Empty state: "No students yet"
- Future: sync from payment system

**Card 3: Parent Feedback (Recent)**
- Purpose: Show latest feedback
- Data source: `feedback` table ordered by created_at desc, limit 5
- Fields: child name, satisfaction (1-5 stars), snippet of suggestion
- Empty state: "No feedback yet"
- Future: sentiment detection

**Card 4: Pending Follow-ups**
- Purpose: Show what needs action
- Data source: `followups` table filtered by status = "pending"
- Fields: count, list with contact name + due date + type
- Empty state: "All caught up!"
- Future: smart reminders

**Card 5: This Week's Trend**
- Purpose: Show growth/velocity
- Data source: leads + students aggregated by day
- Fields: line chart (enrollments over 7 days)
- Empty state: "Need more data"
- Future: predictive alerts

**Acceptance:**
- [ ] All 5 cards documented
- [ ] Data sources identified
- [ ] Empty states defined
- [ ] Queries scoped (no heavy aggregation)
- [ ] Wireframe/layout included
- [ ] Mobile layout considered

---

### Task 5: Draft Event Contract for Opsly Integration
**Owner:** Codex  
**Time:** 0.5 days  
**Status:** todo

Create EVENT-CONTRACT.md defining:

**Event: lead.created**
```json
{
  "event_type": "lead.created",
  "lead_id": "uuid",
  "tenant_id": "peskids",
  "created_at": "2026-05-20T10:00:00Z",
  "name": "Maria Rodriguez",
  "email": "maria@example.com",
  "phone": "+1234567890",
  "grade_interested": "K-5",
  "referral_source": "Google"
}
```
- Producer: Landing form → API
- Consumer: Dashboard, follow-up workflow, Opsly analytics
- Retry: At least once, 3 retries
- Privacy: No PII in logs (only tenant context)

Similar templates for:
- `lead.updated`
- `feedback.created`
- `followup.created`
- `followup.completed`
- `student.created`
- `weekly_report.requested`
- `weekly_report.generated`

**Acceptance:**
- [ ] 7+ events documented
- [ ] Payload examples provided
- [ ] Producer/consumer clear
- [ ] Retry policy defined
- [ ] Privacy notes included

---

### Task 6: Write Demo Script (Spanish + English)
**Owner:** Product  
**Time:** 1 day  
**Status:** todo

Create DEMO-SCRIPT.md for reading to owner:

**Structure (10 min total):**
1. **Current state** (1 min): How owner manages leads now
2. **Proposed MVP** (1 min): What Peskids will do
3. **Landing page** (1 min): Show wireframe, explain "where leads come from"
4. **Dashboard** (3 min): Show 5 cards, explain each
5. **Lead form** (1 min): Simple 5-field form
6. **Feedback form** (1 min): Simple parent survey
7. **Follow-up system** (1 min): How owner tracks next steps
8. **What's NOT included** (1 min): No WhatsApp, no AI, no auto-send (approval-first)
9. **Timeline** (0.5 min): Sprint 01 (docs/wireframes), Sprint 02 (build), Sprint 03 (launch)
10. **Close** (0.5 min): "Questions? Ready to move forward?"

**Language:**
- Spanish: Natural, clear (no jargon)
- English: Professional, no jargon

**Acceptance:**
- [ ] Script reads aloud in ~10 minutes
- [ ] No technical jargon
- [ ] All wireframes/specs referenced
- [ ] Owner questions anticipated
- [ ] Bilingual versions complete

---

## Out of Scope (Sprint 01)

❌ Actual web development  
❌ Database implementation  
❌ API coding  
❌ Webhook setup  
❌ WhatsApp/SMS API  
❌ AI features  
❌ Multi-language production  
❌ Advanced segmentation  
❌ Teacher management  
❌ Student reporting  

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Owner unavailable for feedback | Medium | High | Schedule call now, async review option |
| Wireframe/spec misalignment | Medium | Medium | Weekly review, iterate fast |
| Data schema incomplete | Low | Medium | Start with simple schema, expand later |
| Form validation too complex | Low | Low | Keep forms <5 fields, simple validation |
| Demo script too long | Low | Low | Time it, cut non-essential parts |

---

## Verification Checklist

**Before end of Sprint 01:**
- [ ] MVP-BACKLOG.md complete (9 epics)
- [ ] SPRINT-01.md complete (this doc, 6 tasks)
- [ ] DASHBOARD-SPEC.md complete (5+ cards)
- [ ] FORMS-SPEC.md complete (4 forms)
- [ ] EVENT-CONTRACT.md complete (7+ events)
- [ ] DEMO-SCRIPT.md complete (10 min, bilingual)
- [ ] Wireframes created (landing, dashboard, forms)
- [ ] All specs reviewed by team
- [ ] Owner watched demo, gave feedback
- [ ] All changes in `docs/tenants/peskids/` (no code changes)
- [ ] `git status` shows only `.md` files and wireframes
- [ ] No runtime/secret changes detected

---

## Demo Checklist (Before Owner Call)

**1 hour before demo:**
- [ ] Have wireframes open (Figma or HTML)
- [ ] Have DEMO-SCRIPT.md visible
- [ ] Have owner's current process documented (how they track leads now)
- [ ] Have FORMS-SPEC.md open (to show form examples)
- [ ] Have DASHBOARD-SPEC.md open (to show card layouts)
- [ ] Test audio/video (Zoom, Teams, Meet)
- [ ] Have backup plan if screen share fails (email wireframes)

**During demo:**
- [ ] Start with current state: "Right now you're doing X"
- [ ] Show each wireframe and explain purpose
- [ ] Ask: "Anything missing?"
- [ ] Get feedback on:
  - Form fields (too many? too few?)
  - Dashboard cards (most important?)
  - Timeline (realistic?)
  - Priorities (what's critical for launch?)

**After demo:**
- [ ] Send wireframes + specs in email (PDF or Figma link)
- [ ] Ask owner to mark up within 3 days
- [ ] Schedule follow-up to discuss feedback

---

## Owner Questions (If Blocked)

**Use these ONLY if unclear:**

1. "What's the #1 pain point this should solve?" → Answer: visibility + tracking
2. "How often would you check the dashboard?" → Answer: at least daily
3. "Who else needs access (staff/teachers)?" → Answer: just admin initially

**Do NOT ask:**
- "What infrastructure do you want?"
- "Should we use React or Vue?"
- "Do you want multi-language?"

---

## Success Definition

✅ **Sprint 01 is successful when:**
1. All 6 documentation files are complete
2. Owner has seen wireframes and said "yes, this is what we need"
3. No blockers remain for Sprint 02 (building the actual system)
4. Team is confident about implementation (specs are clear)
5. Timeline is realistic (7 days was enough time)

---

## Next Step (After Owner Approval)

**Move to Sprint 02:** Start building actual landing page, forms, and dashboard using the specs.

No more planning. Only execution from here.
