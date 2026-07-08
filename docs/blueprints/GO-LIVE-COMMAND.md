---
status: READY TO EXECUTE
created: 2026-06-25
owner: operations
purpose: "One-page command for Phase 1 go-live execution"
---

# 🚀 GO-LIVE COMMAND — Phase 1 Execution

**Effective Date:** Today (2026-06-25)  
**Timeline:** 5.5 hours  
**Status:** ✅ ALL SYSTEMS GO

---

## QUICK START (READ THIS FIRST)

You have **2 customers ready to launch**:

| Customer | Manual Work | Critical Path |
|----------|------------|----------------|
| **Intcloudsysops/ICSO** | 2.5 hrs | Pipeline → Form → Templates → Workflows |
| **Peskids** | 2.5 hrs | Pipeline → Form → Templates → Workflows + n8n |

**All documentation, templates, and manifests are ready.**

**Start here:** `docs/blueprints/PHASE1-EXECUTION-CHECKLIST.md` ← Follow this checklist step by step

---

## WHAT'S READY (No scripts needed — manual GHL UI work)

✅ **Intcloudsysops/ICSO (Agency)**
- Location: `qD7Z9jt3owk0LMtKElow` (shared with website)
- Lead model: Discovery calls → Proposal → Won/Lost
- Infrastructure: Auto-provisioned (tags, fields, calendars)
- Pending: Pipeline + form + email/SMS templates + 3 workflows (2.5 hrs)

✅ **Peskids (Education)**
- Location: `KJ5LawrOOe3hIerqtMRu` (separate)
- Lead model: Trial class → Enrollment → Active student
- Infrastructure: Auto-provisioned (tags, fields, calendars)
- Pending: Pipeline + form + email/SMS templates + 4 workflows (2.5 hrs)
- **CRITICAL:** Trial reminder must be working before go-live

---

## YOUR 5-STEP GAMEPLAN

### Step 1: Open Checklist (5 min)

```bash
open docs/blueprints/PHASE1-EXECUTION-CHECKLIST.md
```

→ This is your step-by-step guide. Follow it section by section.

---

### Step 2: Do Intcloudsysops/ICSO Setup (2.5 hours)

**Login to GHL:** https://app.gohighlevel.com

**Account:** Intcloudsysops / ICSO (Location `qD7Z9jt3owk0LMtKElow`)

**Follow checklist tasks 1.1 → 1.5:**

| Task | Time | What to do |
|------|------|-----------|
| 1.1 | 45 min | Create pipeline "Opsly Agency Sales" (7 stages) |
| 1.2 | 30 min | Create form "Opsly Agency Lead Capture" |
| 1.3 | 20 min | Create 2 email templates (Welcome, Confirmation) |
| 1.4 | 10 min | Create SMS template (Discovery Reminder) |
| 1.5 | 45 min | Create 3 workflows (Welcome, Reminder, No-Show) |

**Reference files:**
- `docs/examples/intake/intcloudsysops-manifest.json` — Config manifest
- `docs/examples/email-templates/INTCLOUDSYSOPS-EMAIL-TEMPLATES.md` — Copy templates

---

### Step 3: Do Peskids Setup (2.5 hours)

**Login to GHL:** https://app.gohighlevel.com

**Account:** Peskids (Location `KJ5LawrOOe3hIerqtMRu`)

**Follow checklist tasks 2.1 → 2.5:**

| Task | Time | What to do |
|------|------|-----------|
| 2.1 | 45 min | Create pipeline "Peskids Enrollment" (6 stages) |
| 2.2 | 30 min | Create form "Peskids Trial Registration" |
| 2.3 | 20 min | Create 2 email templates (Welcome, Confirmation) |
| 2.4 | 10 min | Create SMS template (Trial Reminder) |
| 2.5 | 60 min | Create 4 workflows (Welcome, Confirmation, Reminder, No-Show) |

**⭐ CRITICAL:** Peskids trial reminder (Workflow 3 in 2.5) **MUST be tested** before go-live

**Reference files:**
- `docs/examples/intake/peskids-manifest.json` — Config manifest
- `docs/examples/email-templates/PESKIDS-EMAIL-TEMPLATES.md` — Copy templates (en español)

---

### Step 3b: LLM Gateway Smoke Test (5 min)

Verify the LLM Gateway is reachable and routing is working before going live:

```bash
# Health check
doppler run --project ops-intcloudsysops --config prd -- \
  curl -s https://llm.op-sly.com/health | jq '.status'
# Expected: "ok"

# Routing test — Sonnet (production default)
doppler run --project ops-intcloudsysops --config prd -- \
  curl -s -X POST https://llm.op-sly.com/v1/chat \
    -H "Content-Type: application/json" \
    -H "x-tenant-slug: peskids" \
    -H "x-llm-model: sonnet" \
    -d '{"messages":[{"role":"user","content":"ping"}],"request_id":"go-live-smoke"}' \
  | jq '.model'
# Expected: "claude-sonnet-4-6"
```

**If LLM Gateway fails:** Non-blocking for core lead capture. Log the issue and continue. AI features degrade gracefully to template fallbacks.

---

### Step 4: Run Validation Tests (30 min)

After completing all manual setup:

```bash
cd /home/user/opsly

# Run E2E tests
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
2. Refer to "Troubleshooting Guide" in checklist
3. Fix the issue in GHL console
4. Re-run tests

---

### Step 5: Go-Live (Sign-Off)

Once everything passes:

1. **Sign checklist** → Fill in names/dates in "Go-Live Readiness" section
2. **Notify team** → Email: "Phase 1 live, standing by for leads"
3. **Monitor first 24h** → Watch lead volume, email delivery, SMS sends

---

## TIME BREAKDOWN

| Phase | Time | Owner |
|-------|------|-------|
| **Intcloudsysops/ICSO** | 2.5 hrs | Ops + Marketing |
| **Peskids** | 2.5 hrs | Ops + Marketing |
| **Testing** | 0.5 hrs | Dev |
| **Buffer** | 0 hrs | (aggressive but doable) |
| **TOTAL** | **5.5 hrs** | **All hands** |

**Parallel execution recommended:** Ops handles pipelines/forms, Marketing writes templates, Dev runs tests = faster

---

## WHAT EACH ROLE DOES

### Ops (Operations Lead)
- [ ] Task 1.1: Create Intcloudsysops pipeline
- [ ] Task 1.2: Create Intcloudsysops form
- [ ] Task 1.5a: Create Intcloudsysops workflows (first 2)
- [ ] Task 2.1: Create Peskids pipeline
- [ ] Task 2.2: Create Peskids form
- [ ] Task 2.5a: Create Peskids workflows (first 2)
- [ ] Verify all GHL configurations in console

### Marketing (Content/Email)
- [ ] Task 1.3: Write Intcloudsysops email templates
- [ ] Task 1.4: Write Intcloudsysops SMS template
- [ ] Task 2.3: Write Peskids email templates (en español)
- [ ] Task 2.4: Write Peskids SMS template (en español)
- [ ] Proofread all copy in GHL

### Dev (Engineering)
- [ ] Task 1.5: Create Intcloudsysops workflow #3 (No-Show Recovery)
- [ ] Task 2.5: Create Peskids workflow #4 (No-Show Recovery)
- [ ] Task 3.1: Run E2E tests
- [ ] Debug any test failures
- [ ] **CRITICAL:** Test Peskids trial reminder workflow manually

---

## CRITICAL SUCCESS FACTORS

✅ **Intcloudsysops/ICSO Must Have:**
- [ ] Pipeline with all 7 stages
- [ ] Form submitting leads
- [ ] Welcome email sending within 2 min
- [ ] Discovery reminder SMS at 24h before

✅ **Peskids Must Have:**
- [ ] Pipeline with all 6 stages
- [ ] Form submitting leads
- [ ] Welcome email sending within 2 min
- [ ] **Trial reminder SMS at 24h before (CRITICAL — revenue at risk)**
- [ ] E2E tests all passing

✅ **Go-Live Criteria:**
- [ ] 100% checklist completion
- [ ] E2E tests: 30/30 passed
- [ ] Team trained and confident
- [ ] Support contact assigned
- [ ] Monitoring alerts configured

---

## QUICK REFERENCE

### File Locations

| File | Purpose |
|------|---------|
| `PHASE1-EXECUTION-CHECKLIST.md` | **Start here** — Step-by-step guide |
| `intcloudsysops-manifest.json` | Intcloudsysops config spec |
| `peskids-manifest.json` | Peskids config spec |
| `INTCLOUDSYSOPS-EMAIL-TEMPLATES.md` | Email/SMS copy (EN) |
| `PESKIDS-EMAIL-TEMPLATES.md` | Email/SMS copy (ES) |
| `PHASE1-IMPLEMENTATION-GUIDE.md` | Detailed GHL instructions |
| `CUSTOMER-FOLLOWUP-MASTER.md` | Master tracker + roadmap |

### GHL Links

- **Intcloudsysops/ICSO:** https://app.gohighlevel.com/location/qD7Z9jt3owk0LMtKElow
- **Peskids:** https://app.gohighlevel.com/location/KJ5LawrOOe3hIerqtMRu

### Key Secrets (in Doppler)

```bash
doppler run --project ops-intcloudsysops --config prd -- env | grep GHL
```

Expected:
```
GOHIGHLEVEL_INTCLOUDSYSOPS_API_KEY=xxx
GOHIGHLEVEL_PESKIDS_API_KEY=xxx
```

---

## RISK MITIGATION

### If Intcloudsysops/ICSO fails:
- Low volume (1-2 leads/week) → Can skip temporarily
- Fall back to manual lead entry
- Ops continues to test in staging

### If Peskids fails:
- **CRITICAL** — Trial reminder is revenue-blocking
- Must fix before accepting leads
- Do not go-live without trial reminder automation working

### If testing fails:
1. Check GHL console for misconfiguration
2. Review merge tags in email templates
3. Verify workflow triggers are enabled
4. Test manually with dummy lead
5. Escalate to GHL support if needed

---

## SUCCESS LOOK-LIKE

After completion:

✅ **Lead flows from form → GHL contact automatically**
✅ **Welcome email sent within 2 minutes**
✅ **Trial reminder SMS sent 24h before (Peskids only)**
✅ **No manual intervention needed**
✅ **E2E tests confirm all flows working**
✅ **Team trained and ready to support**
✅ **Go-live announced to leadership**

---

## NEXT PHASE (Week 2-3)

Once Phase 1 is live:

🟡 **Phase 2 — n8n Automations (Peskids Priority)**
- Trial reminder (2 hrs) ⭐
- Attendance tracking (3 hrs) ⭐
- Enrollment trigger (4 hrs) ⭐
- Billing + churn (6 hrs)

🟡 **Phase 2 — ICSO Enhancements (Week 3+)**
- Discovery reminder (already in GHL workflows)
- No-show recovery (already in GHL workflows)
- Post-discovery follow-up (2 hrs)
- Nurture campaigns (2 hrs)

---

## CONTACT & ESCALATION

| Issue | Contact |
|-------|---------|
| GHL console questions | Ops Lead |
| Email template issues | Marketing Lead |
| Test failures | Dev Lead |
| Stuck? | Post in #ops-critical Slack |

---

## FINAL CHECKLIST

Before declaring Phase 1 complete:

- [ ] All manual UI tasks done (✓ Intcloudsysops + ✓ Peskids)
- [ ] E2E tests passing (30/30)
- [ ] Test leads flowing through both pipelines
- [ ] Welcome emails verified in inbox
- [ ] SMS reminders tested (at least 1 test)
- [ ] Team trained on GHL console
- [ ] Support contact assigned
- [ ] Monitoring/alerts configured
- [ ] Sign-off form completed
- [ ] Announcement sent to leadership

---

🎯 **STATUS: READY TO EXECUTE**

**Start with:** `docs/blueprints/PHASE1-EXECUTION-CHECKLIST.md`

**Questions?** Refer to `PHASE1-IMPLEMENTATION-GUIDE.md` for detailed instructions.

**Let's go! 🚀**
