# Peskids MVP Execution Backlog

**What this is:** The complete set of work needed to launch Peskids MVP — organizing leads, tracking students, collecting parent feedback, and enabling follow-up workflows. This backlog breaks strategy into executable epics.

**MVP goal:** Give Peskids owner visibility and control. "I can see all my leads, students, and feedback in one place. I can follow up without losing track."

---

## Epic 1: Landing / Web Presence

**User Story:** "As a potential parent, I want to learn about Peskids and request more information."

**Acceptance Criteria:**
- Static landing page explaining what Peskids does
- Lead capture form visible above the fold
- Clear CTA: "Get started"
- Mobile-responsive
- Fast load time (<2s)

**Data Needed:**
- Copy (value prop, benefits, social proof)
- Lead form fields: name, email, phone, grade-interested, referral-source
- Admin email for submissions

**Implementation Notes:**
- Standalone static site (not in Opsly Portal yet)
- Host on Vercel or similar
- Link to admin dashboard from landing

**Risks:**
- Copywriting delays
- Slow hosting/CDN
- SEO not configured (defer to later)

**Priority:** P0  
**Status:** todo  
**Estimated LOE:** 2 days  
**Owner:** Product/Design (wireframes), Cursor/Codex (build)

---

## Epic 2: Lead Capture

**User Story:** "As a potential parent, I want to submit my contact info so Peskids can follow up about enrollment."

**Acceptance Criteria:**
- Lead form works on landing page
- Fields: name, email, phone, grade-interested, referral-source (5 fields max)
- Form validation: email, phone format
- On submit: confirmation message + link to dashboard
- Admin receives notification (email initially)
- Lead appears in dashboard within 5 min

**Data Needed:**
- Supabase table: `leads` (name, email, phone, grade, source, created_at, admin_notes)
- Email service: Resend or SendGrid
- Event: `lead.created`

**Implementation Notes:**
- Database insert on form submit
- Emit event for Opsly integration
- No automation yet (manual review)

**Risks:**
- Email service delays
- Database schema mismatch
- GDPR/privacy compliance (capture ONLY what needed)

**Priority:** P0  
**Status:** todo  
**Estimated LOE:** 2 days  
**Owner:** Codex (API + form)

---

## Epic 3: Parent Feedback

**User Story:** "As a parent, I want to share quick feedback about my child's experience so the owner can improve the program."

**Acceptance Criteria:**
- Feedback form accessible from dashboard or emailed link
- Fields: child-name, satisfaction (1-5 scale), suggestion (text)
- Required: child-name, satisfaction
- On submit: "Thank you!" message
- Admin sees feedback in dashboard same day
- Negative feedback (<3) triggers admin alert

**Data Needed:**
- Supabase table: `feedback` (child_name, satisfaction, suggestion, created_at, student_id)
- Email template: weekly feedback digest
- Event: `feedback.created`

**Implementation Notes:**
- Form embeddable in Portal or standalone
- Real-time dashboard update
- No AI sentiment analysis yet (manual review)

**Risks:**
- Low response rate (parent engagement)
- Spam/noise in feedback
- Accessibility (form must work on mobile)

**Priority:** P1  
**Status:** todo  
**Estimated LOE:** 1.5 days  
**Owner:** Codex (form + integration)

---

## Epic 4: Admin Dashboard

**User Story:** "As an admin, I want to see all leads, students, and feedback at a glance so I know what to follow up on."

**Acceptance Criteria:**
- Dashboard shows 5 cards minimum:
  - New leads this week (count + list)
  - Active students (count)
  - Parent feedback (recent + sentiment)
  - Pending follow-ups (count + list)
  - This week's trend (enrollments)
- Each card is clickable for details
- Dashboard loads in <3s
- Mobile-responsive
- Filters by date range, status
- CSV export available

**Data Needed:**
- Aggregation queries on leads, students, feedback tables
- Authentication for admin access
- Supabase RLS policies

**Implementation Notes:**
- Build in Portal or standalone admin app
- Real-time updates (WebSocket or 5s poll)
- No AI/automation on cards yet

**Risks:**
- Performance (slow queries on large datasets)
- Mobile responsiveness issues
- Complex filtering logic

**Priority:** P0  
**Status:** todo  
**Estimated LOE:** 3 days  
**Owner:** Cursor/Codex (UI + queries)

---

## Epic 5: Follow-up Workflow

**User Story:** "As an admin, I want to be reminded of follow-ups I need to do and have the system help organize them."

**Acceptance Criteria:**
- Dashboard shows "Pending Follow-ups" card with count + list
- Admin can mark follow-up as "done" or "reschedule"
- Follow-up task can be created manually from lead/feedback
- Follow-up history shows who was contacted, when, outcome
- Simple tracking (no automation yet)

**Data Needed:**
- Supabase table: `followups` (contact_id, type, status, next_date, notes, created_at)
- Event: `followup.created`, `followup.completed`
- Email reminder (optional for MVP: manual check)

**Implementation Notes:**
- No auto-scheduling yet (admin does it manually)
- No WhatsApp/email sending yet (approval-first)
- Simple CRUD for followups

**Risks:**
- Admin burden (still manual)
- Follow-ups get lost if not tracked
- No reminder system (must check dashboard)

**Priority:** P1  
**Status:** planned  
**Estimated LOE:** 2 days  
**Owner:** Codex (CRUD + dashboard integration)

---

## Epic 6: Weekly Owner Report

**User Story:** "As the owner, I want a weekly summary of leads, enrollments, feedback, and what needs follow-up."

**Acceptance Criteria:**
- Report generated every Monday morning
- Sent via email (simple HTML template)
- Includes: new leads, new students, feedback summary, pending follow-ups
- Owner can customize report (what metrics to include)
- Report is also available in dashboard

**Data Needed:**
- Aggregation queries (weekly grouping)
- Email template
- Email service (Resend/SendGrid)
- Scheduled job (cron via Vercel or n8n)

**Implementation Notes:**
- Manual report generation ok for MVP (no AI summary)
- Template-based, simple HTML
- No personalization yet

**Risks:**
- Email delivery reliability
- Report generation takes too long
- Owner doesn't read it

**Priority:** P1  
**Status:** planned  
**Estimated LOE:** 1.5 days  
**Owner:** Codex (template + scheduler)

---

## Epic 7: Content Workflow

**User Story:** "As the owner, I want to track content ideas and what to communicate to parents."

**Acceptance Criteria:**
- Simple content ideas list (extracted from feedback)
- Topics: "Math skills," "Social activities," etc.
- Linked to feedback that generated it
- Owner can mark as "implemented" or "backlog"
- No AI tagging yet (manual)

**Data Needed:**
- Supabase table: `content_ideas` (topic, source, status, created_at)
- Link to feedback records

**Implementation Notes:**
- Very simple (no AI categorization, no automation)
- Just a list + status tracker
- Stretch goal for MVP (may defer to Sprint 02)

**Risks:**
- Owner doesn't maintain list
- Low value perceived
- Scope creep

**Priority:** P2  
**Status:** deferred (stretch goal)  
**Estimated LOE:** 1 day  
**Owner:** Codex (if time allows)

---

## Epic 8: Opsly Integration Events

**User Story:** "As the Opsly platform, I want to receive events from Peskids so I can track usage, provide insights, and eventually automate workflows."

**Acceptance Criteria:**
- All key events emitted to Opsly event bus
- Event schema is consistent (tenant_id, timestamp, etc.)
- Events logged for audit trail
- No events sent to third parties yet
- Payload does not contain PII (except tenant context)

**Data Needed:**
- Event contract (defined below)
- Opsly event bus / webhook endpoint
- Logging infrastructure

**Implementation Notes:**
- Every form submission, status change, etc. emits event
- Events used for analytics/metrics (later)
- Non-blocking: if event send fails, continue normally

**Risks:**
- Payload structure misalignment
- Event flood / spam
- PII leakage in logs

**Priority:** P1  
**Status:** planned  
**Estimated LOE:** 1 day  
**Owner:** Codex (integration + validation)

---

## Epic 9: Future Extraction Readiness

**User Story:** "As Opsly, I want Peskids architecture to be portable so it can eventually become an independent product."

**Acceptance Criteria:**
- Peskids code/config is isolated in `incubator/peskids-mvp` or `apps/peskids`
- Database schema is versioned and portable
- No hard dependencies on Opsly core (only event bus, if that)
- Deployment process is documented
- Code is open-source ready (license, no secrets)

**Data Needed:**
- Code organization (where should Peskids code live?)
- Deployment docs
- License (MIT? Apache?)

**Implementation Notes:**
- Not blocking for MVP (do after user validation)
- Plan for extraction but don't extract yet
- Incubate in Opsly for now

**Risks:**
- Adds complexity early
- Not needed if Peskids doesn't validate
- Architectural decisions made late

**Priority:** P2  
**Status:** planned  
**Estimated LOE:** 2 days (later)  
**Owner:** Architecture (Plan after MVP validates)

---

## Backlog Summary

| Epic | Priority | Status | LOE | Owner | Notes |
|------|----------|--------|-----|-------|-------|
| Landing | P0 | todo | 2d | Design + Cursor | Minimum viable landing page |
| Lead Capture | P0 | todo | 2d | Codex | Form + dashboard (no email auto Sprint 01) |
| Parent Feedback | P1 | todo | 1.5d | Codex | Weekly pulse check |
| Dashboard | P0 | todo | 3d | Cursor | Core feature, 5-card minimum |
| Follow-ups | P1 | planned | 2d | Codex | Manual workflow support |
| Weekly Report | P1 | planned | 1.5d | Codex | Email summary |
| Content | P2 | deferred | 1d | Codex | Stretch goal, Sprint 02 |
| Events | P1 | planned | 1d | Codex | Opsly integration |
| Extraction | P2 | planned | 2d | Arch | Post-MVP |
| WhatsApp inbound | P1 | planned | 3d | Codex | MVP+1; [WHATSAPP-CHANNEL.md](./WHATSAPP-CHANNEL.md) Fase 1 |
| WhatsApp outbound | P2 | deferred | 2d | Codex | Solo con cola `approved` |

**Total MVP LOE:** ~13 days (1 developer, 2 weeks)

---

## Success Definition

✅ **MVP is successful when:**
1. Owner can see all leads + students + feedback in one dashboard
2. Owner can create and track follow-ups
3. Owner receives weekly summary email
4. Parents can submit feedback via form
5. All data integrates with Opsly event bus
6. No WhatsApp API / auto-messaging needed to launch (WhatsApp manual OK)

❌ **What's NOT in MVP:**
- WhatsApp API or automated outbound messaging
- Automated messaging or scheduling
- AI-generated suggestions
- Multi-language support
- Advanced segmentation
- Student grades/reporting
- Teacher management
- Calendar sync
- Social media integration
