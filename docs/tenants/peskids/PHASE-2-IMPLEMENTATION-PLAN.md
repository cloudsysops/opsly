# Phase 2 Implementation Plan — Peskids CRM & Multi-Tenant Features

**Timeline:** 2 weeks (May 24 - Jun 7, 2026)  
**Owner:** cboteros1@gmail.com (product) + Sierra (operations)  
**Status:** Ready to start  
**Branch:** `feat/peskids-phase2`

---

## 🎯 Phase 2 Objectives

Enable Peskids to operate as a **full-featured CRM** with:
- ✅ Automated lead capture from web forms (currently static)
- ✅ Hot lead alerts (real-time notifications)
- ✅ Follow-up reminders (daily digest)
- ✅ Teacher dashboard (class + feedback management)
- ✅ WhatsApp integration (two-way messaging)
- ✅ Multi-user support (staff, teachers, parents with RLS)

---

## 📋 Work Breakdown (Ordered by Priority)

### Week 1: N8N Workflows + Lead Capture

#### 1. N8N Setup (Day 1 — 2h)
- [ ] Deploy N8N container (`tenant_peskids`) on VPS
- [ ] Connect to Supabase (jkwykpldnitavhmtuzmo)
- [ ] Test basic webhook trigger
- [ ] **Commit:** `feat(n8n): setup tenant-peskids container`

#### 2. Lead Form → Supabase Webhook (Day 1-2 — 4h)
- [ ] Create N8N workflow: `lead-capture`
  - Trigger: webhook from landing page form
  - Action: insert into `leads` table
  - Validation: email + phone required
  - Response: "Thank you" + 200 OK
- [ ] Update landing page form to POST to N8N webhook URL
- [ ] Test end-to-end (form submission → leads table)
- [ ] **Commit:** `feat(n8n): lead-capture workflow`

#### 3. Hot Lead Alert Workflow (Day 2-3 — 4h)
- [ ] Create N8N workflow: `hot-lead-alert`
  - Trigger: new lead in leads table (polling or webhook)
  - Condition: `source = 'web'` (qualify leads)
  - Action: Discord notification + email to owner
  - Notification includes: name, email, phone, source
- [ ] Test with sample lead
- [ ] **Commit:** `feat(n8n): hot-lead-alert workflow`

#### 4. RLS Policies (Day 3-4 — 3h)
- [ ] Create `admin_get_all_data()` — owner can read all tables
- [ ] Create `staff_read_own_leads()` — staff can read leads they created
- [ ] Create `teacher_read_own_classes()` — teacher can read their classes only
- [ ] Create `parent_read_own_children()` — parent sees own kids + feedback only
- [ ] Apply policies to: leads, students, classes, feedback, followups
- [ ] Test policies with sample queries
- [ ] **Commit:** `feat(db): RLS policies for multi-user support`

### Week 2: Dashboards + WhatsApp

#### 5. Teacher Dashboard (Day 1-2 — 6h)
- [ ] Create route: `/app/teacher/dashboard`
- [ ] Components:
  - [ ] ClassCard (class name, enrollment count, next session)
  - [ ] FeedbackList (recent feedback on my classes)
  - [ ] SubmissionStats (feedback submitted this week)
  - [ ] QuickActions (submit feedback, download report)
- [ ] RLS: teachers see only own classes
- [ ] Test: log in as teacher, verify data isolation
- [ ] **Commit:** `feat(peskids): teacher dashboard`

#### 6. Parent Portal Preview (Day 2-3 — 5h) [OPTIONAL - Only if Timeline Allows]
- [ ] Create route: `/app/admin/parent-preview`
- [ ] Components:
  - [ ] StudentCard (name, grade, classes, recent feedback)
  - [ ] UpcomingClasses (next 3 sessions)
  - [ ] FeedbackHistory (last 5 submissions)
- [ ] Admin sees as "preview" — what parents will see in standalone app
- [ ] **Commit:** `feat(peskids): parent portal preview dashboard`

#### 7. Jelou WhatsApp Integration (Day 3-5 — 8h)
- [ ] Get Jelou credentials from Doppler
- [ ] Create N8N workflow: `whatsapp-inbound`
  - Trigger: webhook from Jelou (inbound message)
  - Action: store message in `messages` table
  - Fields: `sender_phone`, `message_text`, `channel` (whatsapp), `status` (pending_approval)
- [ ] Create N8N workflow: `whatsapp-outbound`
  - Trigger: message table `status` changed to 'approved'
  - Action: send via Jelou API
  - Set `sent_at` timestamp on success
- [ ] Add messaging UI to admin dashboard (preview mode)
  - Show inbound messages
  - Option to approve/reject before sending reply
- [ ] Test: send message to Peskids WhatsApp → admin dashboard
- [ ] **Commit:** `feat(n8n): whatsapp integration via jelou`

#### 8. Daily Follow-Up Digest (Day 5 — 3h)
- [ ] Create N8N workflow: `followup-digest-daily`
  - Trigger: cron at 08:00 AM daily
  - Query: all `followups` with `due_at` ≤ today, `status` != 'completed'
  - Group by: `assigned_to`
  - Format: markdown table (task, due date, priority)
  - Action: Discord message + email to owner
- [ ] Test with sample followups
- [ ] **Commit:** `feat(n8n): daily follow-up digest`

---

## 🔄 Parallel Work

While N8N + RLS are being built, consider:
- **Code cleanup:** Update Peskids components to use RLS-safe queries
- **Testing:** Write Vitest for teacher dashboard permissions
- **Docs:** Update ARCHITECTURE.md with new workflows

---

## 🧪 Testing Strategy

### Unit Tests
- RLS policy behavior (Vitest with `supabase-test-client`)
- Dashboard components (render with mock data)
- Form validation (lead capture schema)

### Integration Tests (Manual for now)
1. **Lead capture flow:** Form → webhook → N8N → Supabase → alert
2. **Teacher access:** Login as teacher → see only own classes
3. **Parent isolation:** Parent email → see only their children
4. **WhatsApp round-trip:** Message in → admin sees → approves → message out

### E2E Tests (Future)
- Playwright: Lead form submission → admin dashboard
- Playwright: Teacher login → submit feedback → alert sent

---

## 📦 Deployment

### Local Testing
```bash
npm run dev  # port 3004
# Test lead form POST to N8N webhook
# Test teacher login
```

### VPS Deployment (Automatic on main merge)
- GitHub Actions will rebuild Peskids image
- N8N container restart (preserves workflows)
- RLS policies deployed via migration

---

## 🚨 Critical Path

**Do not skip (all required for Phase 2 completion):**
1. ✅ Lead capture webhook (enables form → data flow)
2. ✅ Hot lead alert (validates workflow automation)
3. ✅ RLS policies (required for multi-user security)
4. ✅ Teacher dashboard (validates role-based UI)
5. ✅ WhatsApp integration (client-facing feature)

**Nice to have (if timeline permits):**
- Parent portal preview
- Daily digest workflow
- Advanced filtering on dashboards

---

## 📝 Acceptance Criteria

Phase 2 is COMPLETE when:

- [ ] Lead form submissions flow to Supabase automatically (no manual entry)
- [ ] Owner receives hot lead alerts within 2 minutes of form submission
- [ ] Teacher can log in and see only their classes (RLS verified)
- [ ] Teacher can submit feedback on a class
- [ ] WhatsApp message sends via Jelou and appears in admin dashboard
- [ ] All code committed and pushed to `feat/peskids-phase2`
- [ ] Tests pass: `npm run type-check && npm run test --workspace=peskids`
- [ ] Documentation updated in `docs/tenants/peskids/`

---

## 🎯 Success Metrics

| Metric | Target | Verification |
|--------|--------|--------------|
| Lead-to-alert latency | < 2 min | N8N workflow execution log |
| Form submission rate | 100% → Supabase | Dashboard lead count vs. analytics |
| RLS enforcement | 0 data leaks | Query results by role |
| WhatsApp delivery | 100% | Jelou API success rate + admin logs |
| System uptime | > 99% | VPS health check |

---

## 📞 Blockers & Mitigations

| Blocker | Impact | Mitigation |
|---------|--------|-----------|
| Jelou API limits | Can't send > 100 msgs/day | Start with test account, upgrade when needed |
| N8N container memory | Workflows timeout | Monitor Docker stats, increase memory if needed |
| Supabase RLS complexity | Slower queries | Use indexed columns, test query plans |
| WhatsApp number not verified | Can't send messages | Pre-register with Jelou before Phase 2 starts |

---

## 🔗 References

- **N8N docs:** https://docs.n8n.io/
- **Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security
- **Jelou docs:** [Provided by product owner]
- **Peskids schema:** `docs/tenants/peskids/DATA-MODEL.md`
- **Extraction plan:** `docs/tenants/peskids/EXTRACTION-PLAN.md` (reference for multi-tenant design)

---

## 🚀 Next Immediate Step

**TODAY:** Set up N8N container on VPS, test webhook connectivity.

See `scripts/setup-n8n-tenant.sh` (to be created) for automated setup.
