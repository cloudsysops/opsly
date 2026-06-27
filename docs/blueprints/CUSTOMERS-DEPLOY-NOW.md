---
status: LIVE EXECUTION COMMAND
created: 2026-06-25
owner: all teams
purpose: "Master entry point for Peskids + ICSO Phase 1 + Phase 2 deployment"
---

# 🚀 CUSTOMERS DEPLOY NOW — Master Execution Command

**Status:** ✅ **ALL SYSTEMS READY — EXECUTE IMMEDIATELY**

**Objective:** Go-live 2 customers (Peskids + Intcloudsysops/ICSO) with full automation  
**Timeline:** 5-6 hours (parallel execution)  
**Revenue at Risk:** $1.5-2.5K/month (Peskids without trial reminder)  
**Owner:** Ops + Marketing + Dev  

---

## 🎯 QUICK START (5 MIN READ)

### You Have 3 Parallel Tracks

**Track 1: Ops — GHL Manual UI Setup (2.5 hrs × 2 customers = 5.5 hrs serial)**
- Create 2 pipelines (Intcloudsysops + Peskids)
- Create 2 lead forms
- Verify email/SMS templates
- Set up GHL workflows

**Track 2: Dev — n8n Automation Deploy (3 hrs parallel with Track 1)**
- Deploy 3 Peskids critical workflows
- Configure GHL webhooks
- Run e2e tests
- Activate workflows

**Track 3: Marketing — Template Review (30 min)**
- Copy-edit email templates (EN + ES)
- Verify SMS character counts
- Final QA

### Timeline with Parallel Execution

```
09:00 ────────────────────────────── 14:30
│     Track 1: Ops (5.5 hrs)          │
│     ├─ ICSO: Pipelines/Forms (2.5h) │
│     ├─ Peskids: Pipelines/Forms (2.5h)
│     └─ E2E Testing (30 min)         │
│                                     │
│     Track 2: Dev (3 hrs)           │
│     ├─ Deploy Trial Reminder (1h)   │
│     ├─ Deploy Attendance (1h)       │
│     ├─ Deploy Enrollment (1h)       │
│     └─ Monitoring setup (30 min)    │
│                                     │
│     Track 3: Marketing (30 min)    │
│     ├─ Template QA                  │
│     └─ Final sign-off               │
└────────────────────────────────────┘
         🎉 GO-LIVE 🎉
```

**Total Real Time:** 3-5.5 hours (with parallel work)

---

## 📋 CHOOSE YOUR ROLE

### If You're Ops Lead

**Start Here:** `docs/blueprints/PHASE1-EXECUTION-CHECKLIST.md`

1. Open checklist
2. Task 1.1-1.5: Intcloudsysops setup (2.5 hrs)
3. Task 2.1-2.5: Peskids setup (2.5 hrs)
4. Task 3.1: Run E2E tests (30 min)
5. Sign-off when complete

**Files you need:**
- `docs/examples/intake/intcloudsysops-manifest.json`
- `docs/examples/intake/peskids-manifest.json`
- `docs/blueprints/PHASE1-IMPLEMENTATION-GUIDE.md` (reference)

**Time:** 5.5 hours  
**Status:** Ready to start now

---

### If You're Dev Lead

**Start Here:** `docs/examples/n8n/PESKIDS-N8N-DEPLOYMENT.md`

1. Review deployment guide
2. Deploy 3 Peskids workflows (3 hrs total)
   - Trial Reminder (1 hr)
   - Attendance Tracking (1 hr)
   - Enrollment Trigger (1 hr)
3. Configure webhooks in GHL
4. Run validation tests
5. Activate all 3 workflows

**Files you need:**
- `docs/examples/n8n/peskids-trial-reminder-workflow.json`
- `docs/examples/n8n/peskids-attendance-tracking-workflow.json`
- `docs/examples/n8n/peskids-enrollment-trigger-workflow.json`
- `scripts/ghl-phase1-test-e2e.sh` (validation)

**Time:** 3 hours (can run parallel with Ops)  
**Status:** Ready to start now  
**CRITICAL:** Test trial reminder before go-live

---

### If You're Marketing Lead

**Start Here:** Email template files

1. Review and finalize email templates:
   - `docs/examples/email-templates/INTCLOUDSYSOPS-EMAIL-TEMPLATES.md` (EN)
   - `docs/examples/email-templates/PESKIDS-EMAIL-TEMPLATES.md` (ES)

2. Verify SMS templates:
   - Character count < 160
   - Merge tags match GHL field names
   - Spanish vs English formatting

3. Input into GHL console during Ops setup

**Time:** 30 minutes  
**Status:** Content ready, just needs QA

---

### If You're Leadership

**Read:** This document + `docs/blueprints/PHASE1-PHASE2-STATUS.md`

**Key Metrics:**
- 📈 Revenue at risk: $1.5-2.5K/month (Peskids)
- 📊 Timeline: 5-6 hours to go-live
- ✅ All prerequisites: Complete
- 🔴 Critical blockers: None
- 🟢 Ready: Yes, execute today

**What to do:**
- [ ] Approve start-now (2 teams)
- [ ] Ensure team availability
- [ ] Check back at completion

---

## 🔄 THE 4-STEP EXECUTION

### Step 1: Start Tracks in Parallel (09:00)

**Ops Team:** Open checklist, start Task 1.1  
**Dev Team:** Open n8n deployment guide, start workflow 1  
**Marketing:** Finalize templates, ready for input

```bash
# Ops
open docs/blueprints/PHASE1-EXECUTION-CHECKLIST.md

# Dev
open docs/examples/n8n/PESKIDS-N8N-DEPLOYMENT.md
```

---

### Step 2: Mid-Point Check-In (11:30)

**Ops Report:**
- [ ] ICSO pipeline + form done?
- [ ] Peskids pipeline + form done?
- [ ] Templates ready for input?

**Dev Report:**
- [ ] Trial Reminder deployed?
- [ ] Attendance Tracking deployed?
- [ ] Enrollment Trigger deployed?

**Marketing Report:**
- [ ] All templates QA'd and approved?

---

### Step 3: Converge & Test (12:00-14:00)

**Ops:** Finishes manual GHL setup + runs E2E tests  
**Dev:** Finishes workflow deployment + runs validation  
**Marketing:** Final email/SMS verification in GHL

```bash
# E2E Test (Ops delegates to Dev)
./scripts/ghl-phase1-test-e2e.sh --verbose

# n8n Test (Dev)
# Manually test each workflow with dummy data
```

---

### Step 4: Go-Live (14:00+)

**Checklist:**
- [ ] All GHL manual UI complete
- [ ] All 3 n8n workflows active
- [ ] E2E tests: 30/30 passing
- [ ] All 3 workflows tested with dummy data
- [ ] Team trained and confident
- [ ] Support contact assigned

**Action:** Turn on leads, monitor first 24h

---

## 📊 REAL-TIME STATUS

| Component | Status | Owner | ETA |
|-----------|--------|-------|-----|
| **Phase 1 Docs** | ✅ Done | Dev | — |
| **Phase 1 Manifests** | ✅ Done | Dev | — |
| **Phase 1 Templates** | ✅ Ready | Marketing | Today |
| **Phase 1 Manual UI** | ⏳ Pending | Ops | 09:00-14:30 |
| **Phase 1 E2E Tests** | ⏳ Pending | Dev | 12:30-13:00 |
| **Phase 2 n8n Workflows** | ✅ Built | Dev | 09:00-12:00 |
| **Phase 2 Deployment** | ⏳ Pending | Dev | 09:00-12:00 |
| **Phase 2 Tests** | ⏳ Pending | Dev | 12:00-13:00 |
| **Go-Live Checklist** | ⏳ Pending | All | 14:00 |

**Overall:** 🟡 95% Ready, 5% Execution Pending

---

## 🚨 CRITICAL ALERTS

### 🔴 MUST NOT MISS (Revenue Blocking)

**Peskids Trial Reminder SMS:**
- Business Impact: <50% show rate without it = **$1.5-2.5K/month loss**
- Workflow: `peskids-trial-reminder-workflow.json`
- Test: Create appointment for tomorrow, run workflow manually, verify SMS sent
- Status: ✅ Built | ⏳ Needs deployment + test
- Owner: Dev
- Action: Deploy + test before accepting real leads

**If trial reminder fails:**
- [ ] Disable workflow
- [ ] Fall back to GHL native SMS
- [ ] Create incident, notify leadership
- [ ] Fix and re-test within 1 hour

---

### 🟡 HIGH PRIORITY (Data Integrity)

**Attendance Tracking:**
- Blocks enrollment without it
- Test: Mark test appointment "Completed" → verify enrollment email
- Owner: Dev
- Action: Test before accepting real leads

**Enrollment Trigger:**
- Blocks student creation without it
- Test: Move contact to "Enrolled" → verify student created in Supabase
- Owner: Dev
- Action: Test before accepting real leads

---

## 📁 COMPLETE FILE REFERENCE

### Master Documents
- `CUSTOMERS-DEPLOY-NOW.md` — This file (master command)
- `docs/blueprints/PHASE1-PHASE2-STATUS.md` — Real-time dashboard
- `docs/blueprints/GO-LIVE-COMMAND.md` — One-pager overview
- `docs/blueprints/CUSTOMER-FOLLOWUP-MASTER.md` — Central tracker

### Execution Guides
- `docs/blueprints/PHASE1-EXECUTION-CHECKLIST.md` — **Ops starts here** (interactive checklist)
- `docs/blueprints/PHASE1-IMPLEMENTATION-GUIDE.md` — Detailed GHL steps (reference)
- `docs/examples/n8n/PESKIDS-N8N-DEPLOYMENT.md` — **Dev starts here** (deployment guide)

### Configuration
- `docs/examples/intake/intcloudsysops-manifest.json` — ICSO spec
- `docs/examples/intake/peskids-manifest.json` — Peskids spec

### Templates (Ready to Copy/Paste)
- `docs/examples/email-templates/INTCLOUDSYSOPS-EMAIL-TEMPLATES.md` — 2 HTML emails + SMS (English)
- `docs/examples/email-templates/PESKIDS-EMAIL-TEMPLATES.md` — 2 HTML emails + SMS (Spanish)

### n8n Workflows (Ready to Import)
- `docs/examples/n8n/peskids-trial-reminder-workflow.json` — SMS reminder 24h before
- `docs/examples/n8n/peskids-attendance-tracking-workflow.json` — Sync appointment status
- `docs/examples/n8n/peskids-enrollment-trigger-workflow.json` — Create student profile

### Scripts
- `scripts/ghl-phase1-execute.sh` — Validate infrastructure
- `scripts/ghl-phase1-test-e2e.sh` — Run 30+ E2E tests
- `scripts/ghl-configure-pipelines.sh` — Pipeline config validation

### Reference Specs
- `docs/blueprints/N8N-AUTOMATION-GUARANTEES.md` — Automation requirements by customer
- `docs/blueprints/CUSTOMER-ANALYSIS-ICSO-PESKIDS.md` — Readiness analysis
- `docs/superpowers/specs/TEMPLATE-next-client-blueprint.md` — Template for future clients

---

## 🎯 SUCCESS CRITERIA

**Phase 1 Complete:**
- [ ] All GHL pipelines created (2)
- [ ] All forms created + tested (2)
- [ ] All email templates in GHL (4)
- [ ] All SMS templates in GHL (2)
- [ ] All workflows created + enabled (7)
- [ ] E2E tests: 30/30 passing
- [ ] Team trained

**Phase 2 Complete:**
- [ ] All 3 n8n workflows deployed
- [ ] All webhooks registered in GHL
- [ ] Trial reminder tested + working
- [ ] Attendance tracking tested + working
- [ ] Enrollment trigger tested + working
- [ ] Monitoring + Slack alerts active
- [ ] Team trained

**Go-Live:**
- [ ] Both phases complete
- [ ] All tests passing
- [ ] Support contact assigned
- [ ] Real leads accepted
- [ ] First 24h monitored

---

## 🔗 QUICK LINKS

| Role | Start Here | Time |
|------|-----------|------|
| **Ops** | `PHASE1-EXECUTION-CHECKLIST.md` | 5.5 hrs |
| **Dev** | `PESKIDS-N8N-DEPLOYMENT.md` | 3 hrs |
| **Marketing** | Email templates | 30 min |
| **Leadership** | This file + Dashboard | 5 min |

---

## 📞 SUPPORT & ESCALATION

| Issue | Slack | Action |
|-------|-------|--------|
| GHL pipeline questions | @ops-lead in #ops-critical | Reference PHASE1-IMPLEMENTATION-GUIDE.md |
| n8n deployment questions | @dev-lead in #ops-critical | Reference PESKIDS-N8N-DEPLOYMENT.md |
| Email template questions | @marketing-lead | Check template files |
| Blocked/Stuck | @all in #ops-critical | Post error, reference docs |

**Response time goal:** <30 min for critical issues

---

## ✅ FINAL CHECKLIST (Before Starting)

- [ ] All team members have access to docs
- [ ] Ops has GHL admin access (both locations)
- [ ] Dev has n8n admin access + Doppler token
- [ ] Marketing has email copy ready
- [ ] Slack #ops-critical channel open
- [ ] Database snapshots taken (backup before changes)
- [ ] On-call schedule for first 24h

**When all checked:** Click "Execute" button →

---

## 🚀 EXECUTE

```bash
# Ops Team
open docs/blueprints/PHASE1-EXECUTION-CHECKLIST.md

# Dev Team
open docs/examples/n8n/PESKIDS-N8N-DEPLOYMENT.md

# Start Now — No More Waiting
```

---

**Status:** 🟢 **ALL SYSTEMS READY**  
**Created:** 2026-06-25  
**Owner:** Ops + Dev + Marketing  
**Next Step:** Choose your role above and follow the link

**This is it. You're ready. Execute. 🎯**
