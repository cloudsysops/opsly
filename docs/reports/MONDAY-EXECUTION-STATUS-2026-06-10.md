---
status: monday-execution
mission: Week 1 Day 1 - Peskids Smoke Test & Customer Handoff
date: 2026-06-10
owner: Primary Engineer
---

# MONDAY EXECUTION — 2026-06-10

**Status:** ✅ **READY FOR MONDAY MORNING START**

**Goal:** Validate Peskids passes all critical checks before customer review

---

## PRE-EXECUTION CHECKLIST (Saturday 2026-06-07)

| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Peskids build passes | ✅ | Auto | Fixed Next.js 15 async searchParams |
| Type-check: 34 workspaces | ✅ | Auto | All passing |
| Smoke test: 10 tests | ✅ | Auto | 7 PASS, 3 WARN (non-blocking) |
| Git branch synced | ✅ | Auto | PR #513 created (draft) |
| Customer handoff pkg | ✅ | Manual | Ready, needs credentials |
| Support runbook | ✅ | Manual | 8 scenarios documented |
| Automation scripts | ✅ | Manual | Both scripts ready to execute |

---

## MONDAY MORNING CHECKLIST (06:00 start)

### 1. Review Documentation (30 min)

**Goal:** Team alignment on Week 1 plan

```bash
# Read in this order:
1. docs/reports/WEEK-1-EXECUTION-READY-2026-06-07.md (overview)
2. docs/tenants/peskids/CUSTOMER-LAUNCH-CHECKLIST.md (customer view)
3. docs/runbooks/CLIENT-LAUNCH-RUNBOOK.md (troubleshooting)
```

**Acceptance:** ✅ Team understands day-by-day plan

---

### 2. Run Smoke Test (30 min)

**Goal:** Verify Peskids ready before customer demo

```bash
# Run the test
./scripts/smoke-test-peskids.sh

# Expected output:
# ✅ PESKIDS READY FOR CUSTOMER REVIEW
# 7 PASS / 3 WARN / 0 FAIL
```

**What's tested:**
1. Type-check (34 workspaces)
2. Build (Next.js compilation)
3. Migrations (9 SQL files)
4. RLS Policies (7/8 tables)
5. n8n Workflows (config location TBD)
6. Tenant Config (JSON valid)
7. Environment Template (68 variables)
8. API Routes (14 endpoints)
9. Linting (≤10 warnings)
10. Documentation (4 files)

**If FAIL:** Fix immediately before customer call

**Acceptance:** ✅ Smoke test returns PASS

---

### 3. Prepare Customer Handoff Package (1 hour)

**Goal:** Customer has all info needed for Tuesday review

```bash
# Template location:
docs/tenants/peskids/CUSTOMER-LAUNCH-CHECKLIST.md

# Before sending, populate:
[ ] {customer-email@example.com} → real customer email
[ ] {temporary-password} → strong password (14+ chars)
[ ] {ICSO_GHL_LOCATION_ID} → from customer's GHL account
[ ] Support email: support@opsly.com (verify active)
[ ] Review URLs are correct:
    - Landing: https://peskids.op-sly.com
    - Admin: https://peskids.op-sly.com/admin
    - API: https://api.op-sly.com/api/peskids/*
```

**Contents customer receives:**
- ✅ Login credentials
- ✅ 5-minute quick start guide
- ✅ FAQ (pricing, features, cancellation)
- ✅ What happens next (timeline)
- ✅ Support contact + SLA
- ✅ Week 2 roadmap preview

**Acceptance:** ✅ Credentials populated, URLs verified

---

### 4. Schedule Customer Review Call (30 min)

**Goal:** Demo scheduled for Tuesday morning

```
Target time: Tuesday 10:00 AM (1-2 PM customer time if international)
Duration: 30 min (walkthrough + feedback)
Attendees:
  - Primary Engineer (demo)
  - Product Lead (questions)
  - Customer (feedback)

Agenda:
  1. Welcome + intro (2 min)
  2. Feature demo: lead capture flow (8 min)
  3. Show dashboard (5 min)
  4. Collect feedback (10 min)
  5. Discuss Week 2 priorities (5 min)
```

**Before call:**
- [ ] Customer received handoff checklist
- [ ] Customer tried quick start (5-min flow)
- [ ] Customer logged into admin
- [ ] Document any issues they found

**Acceptance:** ✅ Call scheduled, customer confirmed

---

### 5. ICSO GHL Verification (30 min)

**Goal:** Confirm ICSO GHL location is ready for Tuesday provisioning

```bash
# Verify GHL account has:
[ ] Active location (gohighlevel.com → Locations)
[ ] API key generated (Settings → API Integration)
[ ] Pipeline exists (CRM → Pipelines)
[ ] At least 1 pipeline stage

# Document for Tuesday:
ICSO_GHL_LOCATION_ID = [from GHL account]
ICSO_GHL_API_KEY = [from Settings → API]
ICSO_GHL_PIPELINE_ID = [from CRM → Pipelines]
ICSO_GHL_PIPELINE_STAGE_ID = [from pipeline stages]
```

**Acceptance:** ✅ All 4 GHL IDs documented

---

## END-OF-DAY STATUS (17:00)

```
MONDAY EXECUTION CHECKLIST:

[ ] 06:00 - Team review documentation
[ ] 06:30 - Run smoke test (PASS expected)
[ ] 07:00 - Prepare customer handoff
[ ] 08:00 - Schedule customer call (Tuesday confirmed)
[ ] 08:30 - Verify ICSO GHL ready
[ ] 09:00 - Send customer handoff email

END-OF-DAY SUMMARY:
[ ] Smoke test: ✅ PASS
[ ] Customer credentials: ✅ Sent
[ ] Review call: ✅ Scheduled for Tuesday
[ ] ICSO prep: ✅ GHL IDs documented
```

---

## SUCCESS CRITERIA

✅ **MONDAY IS SUCCESS IF:**

1. Smoke test returns ✅ PASS (not WARN)
2. Customer receives handoff package with real credentials
3. Customer review call scheduled for Tuesday 10:00 AM
4. No production issues found (error logs clean)
5. ICSO GHL location verified and IDs documented

---

## BLOCKERS & ESCALATION

**If any occur, escalate immediately:**

| Blocker | Impact | Resolution | Time |
|---------|--------|-----------|------|
| Smoke test FAIL | 🔴 Critical | Fix issue + re-run | 15-60 min |
| Customer unreachable | 🟠 High | Reschedule to Wed | Same day |
| GHL location missing | 🟠 High | Use fallback location | 30 min |
| Production error | 🔴 Critical | Investigate logs | 15-30 min |

**Escalation path:**
- L1: Primary Engineer (immediate)
- L2: CTO (if >15 min unfixed)
- L3: Product Lead (customer communication)

---

## TUESDAY PREP (End of Monday)

```
Before Tuesday morning:
[ ] Customer has tested quick start
[ ] Customer has scheduled Tuesday call
[ ] ICSO GHL IDs are documented
[ ] Support team reviewed CLIENT-LAUNCH-RUNBOOK.md
[ ] Provisioning script (onboard-new-client.sh) tested locally
```

---

## NOTES FOR TEAM

- **Keep it simple:** This is validation week, not perfection week
- **Customer feedback drives Week 2:** Listen more than pitch
- **Document issues:** Any bugs found = Week 2 priority
- **No scope creep:** Week 1 = smoke test + customer review only

---

**Document Status:** Ready for Monday execution  
**Last Updated:** 2026-06-07 (Pre-execution)  
**Owner:** Primary Engineer / Product Lead  
**Next Review:** 2026-06-10 EOD (Monday)

---

## QUICK REFERENCE

| Time | Task | Duration | Owner | Goal |
|------|------|----------|-------|------|
| 06:00 | Documentation review | 30 min | Team | Alignment |
| 06:30 | Smoke test | 30 min | Engineer | Validation |
| 07:00 | Customer handoff prep | 1 hour | Engineer | Credentials |
| 08:00 | Schedule call | 30 min | Product | Booking |
| 08:30 | ICSO verification | 30 min | Engineer | IDs |
| 09:00 | Send to customer | 30 min | Product | Handoff |
| EOD | Status recap | 15 min | Team | Summary |

🚀 **MONDAY EXECUTION BEGINS IN ~12 HOURS**
