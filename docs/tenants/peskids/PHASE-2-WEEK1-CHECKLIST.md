---
status: draft
owner: operations
last_review: 2026-05-24
type: tenant
tags:
  - opsly/tenant
---

# Phase 2 Week 1 Checklist — N8N + RLS + Lead Capture

**Week:** May 24 - May 31, 2026  
**Goal:** Automated lead capture + multi-user security ready  
**Status:** Starting NOW

---

## ✅ Day 1 (Friday, May 24)

### Morning: N8N Setup (2h)
- [ ] **9:00** SSH to VPS: `ssh vps-dragon@100.120.151.91`
- [ ] **9:15** Run N8N setup script:
  ```bash
  ./scripts/setup-n8n-tenant.sh --vps-host 100.120.151.91 --tenant peskids
  ```
- [ ] **9:45** Verify N8N UI loads: https://peskids.op-sly.com/n8n/
- [ ] **10:00** Test webhook endpoint: `curl -X POST https://peskids.op-sly.com/webhooks/test -d '{"test":true}'`
- [ ] **Commit:** `feat(infra): setup n8n tenant container for peskids`

### Afternoon: Lead Form Webhook (2h)
- [ ] **14:00** Get webhook trigger URL from N8N dashboard
- [ ] **14:15** Create N8N workflow `lead-capture`:
  - Webhook trigger (POST)
  - Parse JSON body: `{ full_name, email, phone, source }`
  - Insert to `leads` table
  - Return 200 OK response
- [ ] **15:00** Test with cURL:
  ```bash
  curl -X POST https://peskids.op-sly.com/webhooks/lead-capture \
    -H "Content-Type: application/json" \
    -d '{
      "full_name": "Test User",
      "email": "test@example.com",
      "phone": "555-1234",
      "source": "web"
    }'
  ```
- [ ] **15:30** Verify lead appears in Supabase dashboard
- [ ] **Commit:** `feat(n8n): lead-capture workflow — form to leads table`

---

## ✅ Day 2 (Saturday, May 25)

### Morning: Hot Lead Alert Workflow (2h)
- [ ] **9:00** Create N8N workflow `hot-lead-alert`:
  - Trigger: leads table change (webhook from Supabase)
  - Condition: source = 'web'
  - Action 1: Discord message to owner
  - Action 2: Email to sierrasantiago90@gmail.com
- [ ] **10:00** Test: submit test lead, verify Discord alert within 2 min
- [ ] **Commit:** `feat(n8n): hot-lead-alert workflow`

### Afternoon: Update Landing Page (2h)
- [ ] **14:00** Get N8N webhook URL for lead-capture workflow
- [ ] **14:15** Update `apps/peskids/app/page.tsx` (landing) form:
  - Change form submit from static to POST to N8N webhook
  - Add loading state during submission
  - Show "Thank you!" message on success
  - Show error message on failure
- [ ] **15:00** Test locally:
  ```bash
  npm run dev  # port 3004
  # Fill form → should POST to N8N → redirect to success page
  ```
- [ ] **15:30** Deploy to VPS (auto-deploy on git push to main)
- [ ] **Commit:** `feat(peskids): landing page form → n8n webhook`

---

## ✅ Day 3 (Sunday, May 26)

### Full Day: RLS Policies (6h)

#### Morning: Setup (3h)
- [ ] **9:00** Create migration file:
  ```bash
  npx supabase migration new add_rls_policies_peskids
  ```
- [ ] **9:30** Write RLS policies in SQL:
  - `admin_get_all_data()` — owner (sierrasantiago90@gmail.com) reads all
  - `staff_read_own_leads()` — staff sees leads they created
  - `teacher_read_own_classes()` — teachers see only their classes
  - `parent_read_own_children()` — parents see only their children
- [ ] **11:30** Apply locally:
  ```bash
  npx supabase db push
  ```

#### Afternoon: Testing (3h)
- [ ] **14:00** Write test queries for each role:
  ```sql
  -- Test as admin
  SELECT * FROM leads;  -- Should return all
  
  -- Test as staff member
  SELECT * FROM leads WHERE created_by = current_user_id;  -- Only own
  
  -- Test as parent
  SELECT * FROM students WHERE parent_id = current_user_id;  -- Only own kids
  ```
- [ ] **15:00** Verify RLS enforcement (should error on unauthorized access)
- [ ] **16:00** Test with admin dashboard (should show all data)
- [ ] **Commit:** `feat(db): RLS policies for multi-user tenant isolation`

---

## ✅ Day 4-5 (May 27-28) — Buffer / Refinement

### If Ahead of Schedule:
- [ ] Start Teacher Dashboard (see WEEK 2)
- [ ] Create additional N8N workflows (daily digest)
- [ ] Write Vitest for RLS behavior

### If Behind:
- [ ] Debug N8N webhook connectivity
- [ ] Refine lead capture validation (required fields, duplicate checking)
- [ ] Test RLS policies more thoroughly

---

## 📊 Success Criteria (End of Week 1)

- [ ] N8N container running on VPS
- [ ] Lead form → N8N webhook → Supabase (verified with test lead)
- [ ] Hot lead alert sent to Discord within 2 minutes
- [ ] Landing page form works end-to-end
- [ ] RLS policies applied and tested
- [ ] All code committed to `feat/peskids-phase2`
- [ ] Zero errors in `npm run type-check`

---

## 🔗 Key URLs & Credentials

| Resource | URL / Location | Notes |
|----------|---|---|
| N8N UI | https://peskids.op-sly.com/n8n/ | Create workflows here |
| Landing page | https://peskids.op-sly.com | Test lead form |
| Admin dashboard | https://peskids.op-sly.com/admin | View captured leads |
| Supabase | Console → project | Monitor `leads` table |
| Discord webhook | Doppler (peskids/dev config) | N8N will use this |
| VPS SSH | vps-dragon@100.120.151.91 | Over Tailscale |

---

## 🚨 Blockers / Issues

Track any issues here as you go:

| Issue | Status | Resolution |
|-------|--------|-----------|
| (To be filled in) | — | — |

---

## 📝 Notes

- **Commit early, commit often** — Small, focused commits are easier to debug
- **Test locally first** — Use `npm run dev` before pushing to VPS
- **N8N docs:** https://docs.n8n.io/try-it-out/ (great for learning)
- **Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security
- **Ask for help:** DM or update this checklist with blockers

---

## 📞 Next Checkpoint

**End of Week 1 (May 31):**
- [ ] All Week 1 tasks complete
- [ ] Week 2 Kickoff: Teacher Dashboard + WhatsApp integration

If all Week 1 items done by May 30, can start Week 2 early!

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
