# PESKids Scope Document
**Version:** 1.0  
**Status:** Active Development  
**Last Updated:** 2026-06-02  
**Author:** Claude Code Agent Session

---

## Executive Summary

**PESKids** (Contractor Growth variant) is a platform connecting student evaluation workflows across forms, submissions, and teacher feedback. The goal is to replace disparate spreadsheet-based grading with an integrated portal that provides actionable insights for student improvement.

**Critical Timeline:** 30–60 day deadline for Contractor Growth revenue generation.

---

## Problem Statement

### Current Pain Points
- Admins manually manage forms, submissions, and grading across separate tools (forms builder + spreadsheets)
- No integrated feedback loop for students to understand their performance
- Teacher dashboard lacks submission visibility and grading efficiency
- Lack of actionable insights for students on how to improve

### Desired Outcome
- Single integrated portal for forms, submissions, grading, and feedback
- Real-time visibility into student submissions and grades
- Automated feedback generation to guide student improvement
- Admin efficiency gains from workflow consolidation

---

## Feature Set (MVP)

### 1. Forms Builder
- **Create/Edit Forms:** Drag-and-drop fields (text, multiple choice, rubric, file upload)
- **Field Types:** 
  - Text input
  - Multiple choice (single/multi-select)
  - Rubric/scoring (1–5 scale)
  - File upload (image, PDF, document)
  - Date picker
- **Form Metadata:** Title, description, deadline, submission limit
- **Field Organization:** Sections/grouping, conditional logic (basic)
- **Publication:** Share link, QR code, embedded widget
- **Versioning:** Draft / published states

### 2. Submissions Management
- **Student Portal:** 
  - Submit form responses via direct link or embedded widget
  - Save drafts, submit final responses
  - View submission status (submitted, graded, feedback pending)
- **Admin Dashboard:** 
  - Bulk view all submissions for a form
  - Filter by status, submission date, student
  - Quick preview of responses
  - Export to CSV/JSON
- **Webhook Triggers:** Notify external systems (n8n, Slack) on submission creation/grade changes
- **Audit Logging:** Track submission creation, edits, grading actions

### 3. Teacher Dashboard
- **Submissions Queue:**
  - Paginated list of pending/graded submissions
  - Sort by date, student, status
  - Inline submission preview
- **Grading Interface:**
  - View form structure + student responses side-by-side
  - Input grades (numeric, rubric, text feedback)
  - Auto-save grades
  - Mark as "requires revision" vs. "complete"
- **Bulk Operations:** Grade multiple submissions, set deadline extensions
- **Performance Analytics:** Class-level stats (avg grade, submission rates, common errors)

### 4. Student Feedback & Insights
- **Feedback Loop:**
  - Display grade + rubric breakdown
  - AI-generated actionable suggestions (e.g., "Focus on paragraph structure")
  - Link to learning resources (optional, phase 2)
- **Progress Tracking:** Grade history over time (chart visualization)
- **Revision Prompts:** "Resubmit based on feedback" workflow

### 5. Admin Portal
- **Form Management:** Create, edit, duplicate, archive forms
- **User Management:** Add teachers, manage permissions (viewer, editor, admin)
- **Webhook Configuration:** Set up webhooks for external integrations
- **Audit & Compliance:** View all actions, export audit logs
- **Settings:** Branding, email templates, payment/billing (if applicable)

---

## Technical Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React (TypeScript) | Portal, Admin, Teacher Dashboard |
| **API** | Node.js/TypeScript | RESTful + OpenAPI docs |
| **Database** | PostgreSQL (Supabase) | Multi-tenant via RLS |
| **Auth** | JWT (Supabase Auth) | Role-based access control |
| **File Storage** | Supabase Storage | Form submissions, exports |
| **Real-time** | Supabase Realtime | Live submission updates, grade notifications |
| **Webhooks** | Custom HTTP | n8n, Slack, external systems |
| **AI** | OpenAI API | Feedback generation (phase 1+) |
| **Email** | Doppler-managed secrets | Notifications, feedback summaries |
| **Monitoring** | Supabase Logs + Guardian Grid | Error tracking, secret scanning |

---

## Data Model (Core Entities)

### Forms
```sql
-- table: public.peskids_forms
CREATE TABLE peskids_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
  deadline TIMESTAMPTZ,
  submission_limit INT DEFAULT NULL, -- NULL = unlimited
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users NOT NULL
);

-- table: public.peskids_form_fields
CREATE TABLE peskids_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.peskids_forms NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT CHECK (field_type IN ('text', 'multiple_choice', 'rubric', 'file', 'date')) NOT NULL,
  required BOOLEAN DEFAULT false,
  options JSONB, -- for multiple_choice, rubric scales
  section TEXT, -- grouping fields
  order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Submissions
```sql
-- table: public.peskids_submissions
CREATE TABLE peskids_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.peskids_forms NOT NULL,
  tenant_id UUID REFERENCES public.tenants NOT NULL,
  student_id UUID, -- can be NULL for anonymous submissions
  responses JSONB NOT NULL, -- field_id -> response mapping
  status TEXT CHECK (status IN ('submitted', 'graded', 'revision_requested')) DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- table: public.peskids_grades
CREATE TABLE peskids_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.peskids_submissions NOT NULL,
  field_id UUID REFERENCES public.peskids_form_fields NOT NULL,
  grade NUMERIC(5,2), -- numeric score
  feedback TEXT,
  generated_feedback TEXT, -- AI-generated suggestions
  graded_by UUID REFERENCES auth.users NOT NULL,
  graded_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policies
- Students see only their own submissions and grades
- Teachers see submissions for forms they manage
- Admins see all data for their tenant
- Multi-tenant isolation via `tenant_id`

---

## Implementation Roadmap

### Phase 1: MVP (Weeks 1–3) — Core Functionality
**Goal:** Ship functional forms → submissions → grading loop

#### Week 1: Forms Builder + API
- [ ] Build forms table schema (forms, fields, options)
- [ ] Create REST API: POST/GET/PUT/DELETE forms
- [ ] Build React form builder UI (drag-and-drop)
- [ ] Submission endpoint: POST /api/peskids/forms/{formId}/submissions

#### Week 2: Teacher Dashboard + Grading
- [ ] Build teacher dashboard layout (submissions queue)
- [ ] Grading interface (view submission + input grades)
- [ ] Auto-save grades to `peskids_grades` table
- [ ] Basic filters (status, date range)

#### Week 3: Student Portal + Feedback
- [ ] Student submission form (auto-populate from form definition)
- [ ] Grade display + feedback view
- [ ] Basic validation (required fields, file size limits)
- [ ] Deploy to production (Vercel/Supabase)

**Acceptance Criteria:**
- ✅ End-to-end form submission → grading → feedback visibility
- ✅ Multi-tenant isolation (RLS enforced)
- ✅ Mobile-responsive UI
- ✅ Type-safe API (OpenAPI docs)

### Phase 2: Admin Portal + Webhooks (Weeks 4–5)
**Goal:** Admin controls + external integrations

#### Week 4: Admin Portal
- [ ] Form management (create, edit, duplicate, archive)
- [ ] User management (add teachers, set roles)
- [ ] Audit logs (view all actions)
- [ ] Settings (branding, email templates)

#### Week 5: Webhooks + Help Desk
- [ ] Webhook configuration endpoint
- [ ] Webhook event triggers (submission created, grade updated)
- [ ] Help desk system (ticketing, FAQ, live chat widget)
- [ ] Email notifications (submission received, grade ready, feedback summary)

**Acceptance Criteria:**
- ✅ Teachers can be added/removed
- ✅ Webhooks reliable (retry logic, logs)
- ✅ Help desk functional (ticket creation, resolution tracking)

### Phase 3: Intelligence + Polish (Weeks 6+)
**Goal:** AI-driven insights, advanced analytics, performance

- AI feedback generation (OpenAI API)
- Class-level performance dashboards
- Revision workflows ("resubmit based on feedback")
- Advanced filters (student performance trends, submission velocity)
- Export workflows (bulk grade export, report generation)
- Analytics dashboard (admin view of form effectiveness)

---

## Support Model

### Help Desk System (Self-Hosted Ticketing)
- **Ticket Management:** Admin/support team view all student/teacher support requests
- **Live Chat Widget:** Quick-answer bot (FAQ-based) with escalation to human
- **Knowledge Base:** FAQ, video tutorials, form-building guides
- **Email Support:** Monitored alias for direct inquiries
- **Tiers:**
  - **Tier 1:** Automated bot (FAQ matching)
  - **Tier 2:** Live support during business hours
  - **Tier 3:** Escalation to PESKids admin team

### SLA (Initial)
- First response: < 4 hours
- Resolution: 24–48 hours (depending on complexity)

---

## Success Metrics (30–60 Days)

### Revenue Metrics
- [ ] Contractor Growth MVP launched
- [ ] 5–10 pilot customers onboarded
- [ ] Minimum $X MRR recurring (define target)
- [ ] Churn rate < 10% in first month

### Product Metrics
- [ ] Form submission success rate > 95%
- [ ] Grade submission latency < 2 seconds
- [ ] Mobile usability score > 80 (Lighthouse)
- [ ] Uptime > 99.5%

### Adoption Metrics
- [ ] 50+ forms created (across pilot customers)
- [ ] 500+ submissions processed
- [ ] Help desk response time < 4 hours
- [ ] NPS > 40 (feedback from pilot users)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Database scaling (high submission volume) | High | Use PostgreSQL connection pooling; plan for read replicas month 2 |
| File upload bottleneck | Medium | Implement chunked upload; set 50MB per file limit initially |
| AI cost explosion (feedback generation) | Medium | Cache feedback templates; use rate limiting; monitor spend daily |
| Help desk overwhelm | Medium | Pre-write FAQ; use bot for 80% of queries; hire 1 contractor by week 6 |
| Multi-tenant data leakage | Critical | Enforce RLS in all queries; audit with Guardian Grid weekly |
| Deadline miss | Critical | Scope ruthlessly; ship MVP by day 21; iterate on phase 2 |

---

## Dependencies & Blockers

### External
- Supabase project fully configured (auth, DB, storage, realtime)
- OpenAI API key provisioned (for phase 2+ feedback)
- Doppler secrets management live
- Email provider configured (Postmark or similar)

### Internal
- Designer review of UI mockups (week 1)
- Legal: ToS, Privacy Policy (SaaS standard)
- Billing integration (if free trial needed; defer if not)

---

## Communication & Handoff

**Daily Standups:** 15 min async (Slack #peskids-dev)  
**Weekly Review:** Demo + roadmap sync (Friday 10am PT)  
**Escalation Path:** Design → Product → Exec team

---

## Appendix: OpenAPI Endpoints (MVP)

```
POST   /api/peskids/forms                 — Create form
GET    /api/peskids/forms/{formId}        — Get form definition
PUT    /api/peskids/forms/{formId}        — Update form
DELETE /api/peskids/forms/{formId}        — Archive form

POST   /api/peskids/forms/{formId}/submissions — Submit response
GET    /api/peskids/submissions?formId=X  — List submissions
GET    /api/peskids/submissions/{id}      — Get submission + grades

POST   /api/peskids/submissions/{id}/grades — Grade submission
PUT    /api/peskids/grades/{gradeId}      — Update grade + feedback

GET    /api/peskids/admin/users           — List tenant users
POST   /api/peskids/admin/webhooks        — Register webhook
```

---

## Next Steps

1. **Design Review** (Today): Validate UI mockups with stakeholders
2. **Kick-off Meeting** (Tomorrow): Confirm timeline, assign ownership
3. **Week 1 Sprint** (Starting): Build forms builder + submission API
4. **Daily Demo** (Friday): Show working forms end-to-end

---

*For questions or updates, contact the PESKids product team or file an issue in #peskids-dev.*
