---
status: ready-to-execute
created: 2026-06-25
owner: operations
purpose: "Interactive checklist for Phase 1 manual UI setup"
---

# Phase 1 Execution Checklist — Ready to Execute Now

**Objective:** Complete GHL manual UI setup for 2 customers to reach go-live

**Timeline:** 5.5 hours total (This week)  
**Owner:** Ops + Marketing + Dev  
**Status:** ✅ All prerequisites met — **READY TO START**

---

## Pre-Execution Validation

Before starting, confirm all prerequisites:

- [ ] **Access:** You have admin access to both GHL accounts
  - Intcloudsysops/ICSO: Location `qD7Z9jt3owk0LMtKElow`
  - Peskids: Location `KJ5LawrOOe3hIerqtMRu`
- [ ] **Infrastructure:** Scripts have already auto-provisioned:
  - ✅ Tags (auto-created)
  - ✅ Custom fields (auto-created)
  - ✅ Calendars (auto-created)
- [ ] **Documentation:** You have these files ready:
  - `docs/examples/intake/intcloudsysops-manifest.json`
  - `docs/examples/intake/peskids-manifest.json`
  - `docs/examples/email-templates/INTCLOUDSYSOPS-EMAIL-TEMPLATES.md`
  - `docs/examples/email-templates/PESKIDS-EMAIL-TEMPLATES.md`
  - `docs/blueprints/PHASE1-IMPLEMENTATION-GUIDE.md`

---

## Customer 1: Intcloudsysops / ICSO (Agency)

**Location ID:** `qD7Z9jt3owk0LMtKElow`  
**Total Time:** 2.5 hours  
**Owner:** Ops + Marketing

### Task 1.1: Create Pipeline (45 min)

**What:** Create "Opsly Agency Sales" pipeline with 7 stages  
**Where:** GHL Console → Opportunities → Pipelines  
**Reference:** `intcloudsysops-manifest.json` (pipeline section)

**Steps:**
1. Click **New Pipeline** → Name: `Opsly Agency Sales`
2. Add these 7 stages (in order):
   - [ ] New Lead
   - [ ] Contacted
   - [ ] Discovery Scheduled
   - [ ] Proposal Sent
   - [ ] Negotiation
   - [ ] Won
   - [ ] Lost
3. Save pipeline
4. **IMPORTANT:** Copy each stage ID and save to `.env.local` or Doppler:
   ```
   GHL_ICSO_STAGE_NEW_LEAD=xxx
   GHL_ICSO_STAGE_CONTACTED=xxx
   GHL_ICSO_STAGE_DISCOVERY_SCHEDULED=xxx
   GHL_ICSO_STAGE_PROPOSAL_SENT=xxx
   GHL_ICSO_STAGE_NEGOTIATION=xxx
   GHL_ICSO_STAGE_WON=xxx
   GHL_ICSO_STAGE_LOST=xxx
   ```

**✓ Completed:** Date/Time ___________

---

### Task 1.2: Create Lead Form (30 min)

**What:** Create "Opsly Agency Lead Capture" form  
**Where:** GHL Console → Funnels → Forms  
**Reference:** `intcloudsysops-manifest.json` (form section)

**Steps:**
1. Click **New Form** → Name: `Opsly Agency Lead Capture`
2. Add these fields (in order):
   - [ ] First Name (text, required)
   - [ ] Last Name (text, required)
   - [ ] Email (email, required)
   - [ ] Phone (phone, required)
   - [ ] Company (text, optional)
   - [ ] Service Interest (dropdown, optional)
3. Configure post-submission:
   - Action: **Redirect to URL**
   - URL: [calendar booking link]
4. Click **Publish**
5. Test form with dummy lead

**✓ Completed:** Date/Time ___________

---

### Task 1.3: Email Templates (20 min)

**What:** Create 2 email templates  
**Where:** GHL Console → Email → Templates  
**Reference:** `INTCLOUDSYSOPS-EMAIL-TEMPLATES.md`

**Template 1: Welcome Lead**
- [ ] Name: `Opsly — Welcome Lead`
- [ ] Subject: `Welcome to Opsly! Here's what happens next`
- [ ] Copy from: `INTCLOUDSYSOPS-EMAIL-TEMPLATES.md` Template 1
- [ ] Test with preview

**Template 2: Discovery Confirmation**
- [ ] Name: `Opsly — Discovery Confirmation`
- [ ] Subject: `Your discovery call with Opsly is confirmed`
- [ ] Copy from: `INTCLOUDSYSOPS-EMAIL-TEMPLATES.md` Template 2
- [ ] Test with preview

**✓ Completed:** Date/Time ___________

---

### Task 1.4: SMS Template (10 min)

**What:** Create SMS reminder template  
**Where:** GHL Console → SMS → Templates

**Template: Discovery Reminder**
- [ ] Name: `Opsly — Discovery Reminder`
- [ ] Copy from: `INTCLOUDSYSOPS-EMAIL-TEMPLATES.md` SMS section
- [ ] Test character count (< 160)

**✓ Completed:** Date/Time ___________

---

### Task 1.5: GHL Workflows (45 min)

**What:** Create 3 automation workflows  
**Where:** GHL Console → Workflows

**Workflow 1: Welcome Sequence**
- [ ] Name: `Welcome Sequence`
- [ ] Trigger: **Contact Created**
- [ ] Actions:
  1. Delay 2 minutes
  2. Send email: `Opsly — Welcome Lead`
  3. Add tag: `lead-web`
- [ ] Enable workflow

**Workflow 2: Discovery Reminder**
- [ ] Name: `Discovery Reminder`
- [ ] Trigger: **Time-based** (24 hours before appointment)
- [ ] Actions:
  1. Send SMS: `Opsly — Discovery Reminder`
  2. Add tag: `discovery-reminded`
- [ ] Enable workflow

**Workflow 3: No-Show Recovery**
- [ ] Name: `No-Show Recovery`
- [ ] Trigger: **Appointment Status = No Show**
- [ ] Actions:
  1. Delay 1 hour
  2. Send SMS: "Nos perdimos tu discovery call. ¿Podemos reagendar? Link: {{reschedule_link}}"
  3. Create task: "Follow-up: {{contact.name}}"
  4. Add tag: `no-show-recovered`
- [ ] Enable workflow

**✓ Completed:** Date/Time ___________

---

## Customer 2: Peskids (Education)

**Location ID:** `KJ5LawrOOe3hIerqtMRu`  
**Total Time:** 2.5 hours  
**Owner:** Ops + Marketing

### Task 2.1: Create Pipeline (45 min)

**What:** Create "Peskids Enrollment" pipeline with 6 stages  
**Where:** GHL Console → Opportunities → Pipelines  
**Reference:** `peskids-manifest.json` (pipeline section)

**Steps:**
1. Click **New Pipeline** → Name: `Peskids Enrollment`
2. Add these 6 stages (in order):
   - [ ] New Lead
   - [ ] Contacted
   - [ ] Trial Scheduled
   - [ ] Trial Completed
   - [ ] Enrolled
   - [ ] Active Student
3. Save pipeline
4. **IMPORTANT:** Copy each stage ID and save:
   ```
   GHL_PESKIDS_STAGE_NEW_LEAD=xxx
   GHL_PESKIDS_STAGE_CONTACTED=xxx
   GHL_PESKIDS_STAGE_TRIAL_SCHEDULED=xxx
   GHL_PESKIDS_STAGE_TRIAL_COMPLETED=xxx
   GHL_PESKIDS_STAGE_ENROLLED=xxx
   GHL_PESKIDS_STAGE_ACTIVE_STUDENT=xxx
   ```

**✓ Completed:** Date/Time ___________

---

### Task 2.2: Verify/Create Lead Form (30 min)

**What:** Create or verify "Peskids Trial Registration" form  
**Where:** GHL Console → Funnels → Forms  
**Reference:** `peskids-manifest.json` (form section)

**Steps:**
1. Check if form already exists (might be named generically)
2. If not, create **New Form** → Name: `Peskids Trial Registration`
3. Add these fields (in order):
   - [ ] Parent First Name (text, required)
   - [ ] Parent Last Name (text, required)
   - [ ] Parent Email (email, required)
   - [ ] Parent Phone (phone, required)
   - [ ] Child First Name (text, required)
   - [ ] Child Age (number, required, min:3, max:18)
   - [ ] Interest Level (dropdown, optional)
4. Configure post-submission:
   - Action: **Redirect to URL**
   - URL: [calendar booking link]
5. Click **Publish**
6. Test form with dummy lead

**✓ Completed:** Date/Time ___________

---

### Task 2.3: Email Templates (20 min)

**What:** Create 2 email templates in Spanish  
**Where:** GHL Console → Email → Templates  
**Reference:** `PESKIDS-EMAIL-TEMPLATES.md`

**Template 1: Welcome Parent**
- [ ] Name: `Peskids — Welcome Parent`
- [ ] Subject: `¡Bienvenido a Peskids! Tu clase de prueba está aquí`
- [ ] Copy from: `PESKIDS-EMAIL-TEMPLATES.md` Template 1
- [ ] Test with preview

**Template 2: Trial Confirmation**
- [ ] Name: `Peskids — Trial Confirmation`
- [ ] Subject: `Tu clase de prueba está confirmada`
- [ ] Copy from: `PESKIDS-EMAIL-TEMPLATES.md` Template 2
- [ ] Test with preview

**✓ Completed:** Date/Time ___________

---

### Task 2.4: SMS Template (10 min)

**What:** Create SMS reminder template in Spanish  
**Where:** GHL Console → SMS → Templates

**Template: Trial Reminder**
- [ ] Name: `Peskids — Trial Reminder`
- [ ] Copy from: `PESKIDS-EMAIL-TEMPLATES.md` SMS section
- [ ] Test character count (< 160)

**✓ Completed:** Date/Time ___________

---

### Task 2.5: GHL Workflows (60 min)

**What:** Create 4 automation workflows  
**Where:** GHL Console → Workflows

**Workflow 1: Welcome Parent**
- [ ] Name: `Welcome Parent`
- [ ] Trigger: **Contact Created**
- [ ] Actions:
  1. Delay 2 minutes
  2. Send email: `Peskids — Welcome Parent`
  3. Add tag: `lead-web`
- [ ] Enable workflow

**Workflow 2: Trial Confirmation**
- [ ] Name: `Trial Confirmation`
- [ ] Trigger: **Appointment Scheduled** (Trial Class calendar)
- [ ] Actions:
  1. Delay 1 minute
  2. Send email: `Peskids — Trial Confirmation`
  3. Update stage: `Trial Scheduled`
  4. Add tag: `trial-class`
- [ ] Enable workflow

**Workflow 3: Trial Reminder (24h before) ⭐ CRITICAL**
- [ ] Name: `Trial Reminder`
- [ ] Trigger: **Time-based** (24 hours before appointment)
- [ ] Actions:
  1. Send SMS: `Peskids — Trial Reminder`
  2. Add tag: `trial-reminded`
- [ ] Enable workflow
- [ ] **VERIFY:** Test by scheduling a dummy appointment

**Workflow 4: No-Show Recovery**
- [ ] Name: `No-Show Recovery`
- [ ] Trigger: **Appointment Status = No Show**
- [ ] Actions:
  1. Delay 1 hour
  2. Send SMS: "¡Nos perdimos en tu clase de prueba! ¿Hay algún problema? Podemos reagendar. Link: {{reschedule_link}}"
  3. Create task: "Seguimiento: {{contact.name}}"
  4. Add tag: `no-show-recovery`
- [ ] Enable workflow

**✓ Completed:** Date/Time ___________

---

## Final Validation (30 min)

### Task 3.1: E2E Testing (30 min)

**What:** Run end-to-end tests to validate everything works

**Run automated tests:**
```bash
./scripts/ghl-phase1-test-e2e.sh --verbose
```

**Expected output:**
```
Total Tests: 30
Passed: 30
Failed: 0

✓ All tests passed!
```

**If tests fail:**
1. Check error message
2. Review the specific GHL configuration
3. Re-run with `--verbose` flag
4. Update checklist with fixes applied

**Manual tests (if automated tests pass):**
- [ ] Submit test lead on Intcloudsysops form → Verify contact created in GHL
- [ ] Submit test lead on Peskids form → Verify contact created in GHL
- [ ] Check email templates render correctly in preview
- [ ] Test SMS character limit in both templates

**✓ Completed:** Date/Time ___________

---

## Go-Live Readiness

Once all tasks are completed, confirm readiness:

### Final Checklist

- [ ] **Intcloudsysops/ICSO:**
  - [ ] Pipeline created with 7 stages
  - [ ] Form created and published
  - [ ] Email templates (2) created and tested
  - [ ] SMS template created
  - [ ] Workflows (3) created and enabled
  - [ ] E2E tests passing

- [ ] **Peskids:**
  - [ ] Pipeline created with 6 stages
  - [ ] Form created/verified and published
  - [ ] Email templates (2) created and tested
  - [ ] SMS template created
  - [ ] Workflows (4) created and enabled
  - [ ] E2E tests passing
  - [ ] **CRITICAL:** Trial reminder workflow tested and confirmed working

- [ ] **Documentation:**
  - [ ] Stage IDs saved to Doppler or `.env.local`
  - [ ] Screenshots captured (optional but recommended)
  - [ ] Team trained on GHL console

- [ ] **Monitoring:**
  - [ ] Slack alerts configured for failures
  - [ ] Support contact assigned
  - [ ] On-call schedule for first week

### Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Operations | _______ | _____ | ⬜ Ready |
| Marketing | _______ | _____ | ⬜ Ready |
| Dev | _______ | _____ | ⬜ Ready |

---

## Troubleshooting Guide

### Issue: "Form not creating contacts in GHL"

**Debug:**
1. Check form post-submission action (should redirect to calendar, NOT external URL)
2. Verify webhook endpoint is receiving form submissions
3. Test with browser console: Check for CORS errors
4. Check Doppler for GHL API key and location ID

**Fix:** Usually a webhook receiver issue — see `docs/blueprints/PHASE1-IMPLEMENTATION-GUIDE.md`

---

### Issue: "Email template not sending"

**Debug:**
1. Verify template is **published** (not draft)
2. Check workflow trigger is enabled
3. Test merge tags: `{{contact.first_name}}`, `{{appointment.time}}`, etc.
4. Check GHL email logs for bounces

**Fix:** Merge tags may need adjustment based on your GHL setup

---

### Issue: "SMS template not sending"

**Debug:**
1. Verify SMS credits available in GHL
2. Check template character count (must be < 160)
3. Verify workflow is enabled
4. Test phone number format (should include country code)

**Fix:** Usually SMS service not enabled — contact GHL support

---

## Success Metrics

**Phase 1 Complete when:**

✅ 100% of checklist items completed  
✅ All E2E tests passing  
✅ Test leads flowing through both pipelines  
✅ Welcome emails sending automatically  
✅ SMS reminders scheduled correctly  
✅ Team trained and confident  

**Timeline:**
- Start: Today (2026-06-25)
- Target completion: Today (5.5 hours)
- Go-live: Tonight or tomorrow morning

---

**Next Step:** Week 2-3 = Phase 2 n8n Automations (prioritize Peskids trial reminder + attendance tracking)

**Reference Files:**
- `docs/blueprints/PHASE1-IMPLEMENTATION-GUIDE.md` — Detailed step-by-step
- `docs/blueprints/CUSTOMER-FOLLOWUP-MASTER.md` — Master tracker
- `docs/examples/intake/intcloudsysops-manifest.json` — ICSO config
- `docs/examples/intake/peskids-manifest.json` — Peskids config

---

**Status:** 🟢 **READY TO EXECUTE — ALL PREREQUISITES MET**

**Generated:** 2026-06-25  
**Owner:** Operations Team  
**Review:** After each customer completion
