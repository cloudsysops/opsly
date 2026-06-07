---
status: execution-ready
mission: Week 1 - Peskids Customer Review + ICSO Sales Setup
date: 2026-06-07
owner: Primary Engineer + AI Agents
---

# Week 1 Execution — READY TO START

**Status:** ✅ **ALL DELIVERABLES COMMITTED**

**Timeline:** Monday 2026-06-10 → Friday 2026-06-14 (6 business days)

**Goal:** Get Peskids in customer's hands + ICSO sales engine live

---

## MONDAY (Day 1) — Peskids Smoke Test

### 🎯 Objective
Validate Peskids passes all critical checks before customer review

### 📋 Checklist

```bash
# 1. Run smoke test (30 min)
./scripts/smoke-test-peskids.sh
# Expected: ✅ PASS (10/10 tests)
# Output: "PESKIDS READY FOR CUSTOMER REVIEW"

# 2. Verify production environment (1 hour)
# - Check VPS services: Traefik, API, Admin, Portal, Peskids, Redis, n8n
# - Verify SSL certificates valid
# - Check error logs for critical issues
# - Verify Supabase connection + RLS policies

# 3. Create customer handoff package (1 hour)
# - Populate CUSTOMER-LAUNCH-CHECKLIST.md with:
#   - Admin login credentials
#   - Test GHL location ID
#   - Support email
#   - Quick start guide
# - Send to customer

# 4. Schedule customer review call
# - Target: Tuesday morning
# - Duration: 30 min
# - Agenda: Feature walkthrough, feedback collection
```

**Owner:** Primary Engineer  
**Time:** 3-4 hours  
**Gate:** Smoke test = ✅ PASS

---

## TUESDAY (Day 2) — ICSO Tenant Setup

### 🎯 Objective
Deploy ICSO sales engine to production

### 📋 Checklist

```bash
# 1. Confirm GHL location ID (15 min)
# - Verify ICSO_GHL_LOCATION_ID is available
# - Extract from GoHighLevel API if needed

# 2. Run tenant provisioning script (2 hours)
./scripts/onboard-new-client.sh icso \
  --ghl-location-id=$ICSO_GHL_LOCATION_ID \
  --owner-email=sales@icso.com

# 3. Manual configuration steps (1.5 hours)
# - Replace TENANT_SLUG placeholders in generated files
# - Run Supabase migration
# - Deploy n8n container
# - Configure Traefik routing
# - Deploy landing page to production

# 4. Smoke test ICSO (30 min)
# - Test form submission: icso.op-sly.com → Supabase
# - Verify GHL contact creation
# - Check dashboard loads

# 5. Peskids customer review call
# - Conduct 30-min demo
# - Collect feedback on:
#   - Lead capture workflow
#   - GHL sync reliability
#   - Missing features (calendar/email/SMS)
#   - Price feedback
```

**Owner:** Primary Engineer + Claude AI (script automation)  
**Time:** 4-5 hours  
**Gate:** ICSO form submits → GHL contact created

---

## WEDNESDAY (Day 3) — Landing Pages Live

### 🎯 Objective
Both Peskids + ICSO public-facing sites ready

### 📋 Checklist

```bash
# 1. Finalize ICSO landing page (1 hour)
# - Update branding (logo, colors)
# - Update copy (service description, CTA)
# - Update form fields if needed
# - Mobile responsiveness check

# 2. GHL pipeline lookup (1 hour)
# - Retrieve ICSO_GOHIGHLEVEL_PIPELINE_ID
# - Retrieve ICSO_GOHIGHLEVEL_PIPELINE_STAGE_ID
# - Add to Doppler secrets

# 3. Customer feedback synthesis (1 hour)
# - Review Tuesday call feedback
# - Update Week 2 priorities based on customer needs
# - Document any critical blockers

# 4. Both sites ready for traffic (1 hour)
# - Verify peskids.op-sly.com loads
# - Verify icso.op-sly.com loads
# - Test lead capture on both
# - Verify email addresses are correct

# 5. Sales preparation
# - Review ICSO positioning
# - Prepare sales pitch (30 sec, 2 min, 5 min versions)
# - Identify initial target customers
```

**Owner:** Primary Engineer + Product (Sales prep)  
**Time:** 4-5 hours  
**Gate:** Both sites live and accepting leads

---

## THURSDAY (Day 4) — Revenue Flow Validation

### 🎯 Objective
Ensure lead → customer conversion process works end-to-end

### 📋 Checklist

```bash
# 1. Test complete lead flow (1 hour)
# ✓ Lead submitted on landing page
# ✓ Lead appears in Supabase (correct tenant_slug)
# ✓ GHL contact created automatically
# ✓ Peskids dashboard shows lead
# ✓ Tag applied correctly

# 2. Create metrics dashboard (1.5 hours)
# Metrics to track (real-time):
# - Leads captured (Peskids vs ICSO)
# - GHL contacts created
# - Tag application rate
# - Dashboard uptime
# - API latency

# 3. Customer support readiness (1 hour)
# - Review CLIENT-LAUNCH-RUNBOOK.md
# - Prepare common issue responses
# - Set up support channels (email, Slack?)
# - Document SLA (24h response, 4h critical)

# 4. Week 1 documentation
# - Document any issues found
# - Update smoke test script if needed
# - Update onboarding script based on actual execution
# - Prepare incident log template

# 5. Begin test plan execution (if blocked on customer feedback)
# - If customer is happy with current features:
#   - Start RLS audit
#   - Begin Phase 1a test scaffolding
#   - Write first test files
```

**Owner:** Primary Engineer + Claude AI (tests)  
**Time:** 4-5 hours  
**Gate:** Full lead flow works without manual intervention

---

## FRIDAY (Day 5) — Customer Feedback + Week 2 Planning

### 🎯 Objective
Collect feedback, finalize Week 2 roadmap

### 📋 Checklist

```bash
# 1. Customer feedback synthesis (1 hour)
# Send feedback form to Peskids customer:
# [ ] Form submission working? (1-10)
# [ ] GHL sync reliable? (1-10)
# [ ] Missing features?
# [ ] Price acceptable?
# [ ] Ready for more leads?

# 2. Early ICSO lead handling (if applies) (1 hour)
# - If ICSO already has leads from landing page
# - Ensure leads are being synced to GHL correctly
# - Document any issues

# 3. Week 1 retrospective (1 hour)
# Completed:
# [ ] Peskids smoke test: ✅ PASS
# [ ] ICSO provisioning: ✅ COMPLETE
# [ ] Both sites live: ✅ YES
# [ ] Customer review: ✅ SCHEDULED
# [ ] Revenue flow validated: ✅ YES

# Issues found:
# [ ] [List any bugs, slowness, data issues]
# [ ] [Categorize by severity: P0/P1/P2]
# [ ] [Estimate fix time]

# 4. Week 2 priorities (based on customer feedback)
# [ ] What does customer need most?
#     - Calendar integration?
#     - Email automation?
#     - SMS follow-ups?
#     - Something else?
# [ ] Estimate effort for top 3 features
# [ ] Confirm customer timeline expectations

# 5. Final documentation (1 hour)
# - Update WEEK-1-EXECUTION-SUMMARY.md
# - Create WEEK-2-ROADMAP.md
# - Commit all changes
# - Prepare handoff for next week
```

**Owner:** Primary Engineer + Product Lead  
**Time:** 4-5 hours  
**Gate:** Customer feedback collected + Week 2 roadmap finalized

---

## SUCCESS METRICS (EOD Friday)

| Metric | Target | Status |
|--------|--------|--------|
| Peskids smoke test | ✅ PASS | TBD |
| ICSO provisioning | ✅ COMPLETE | TBD |
| Customer review scheduled | ✅ YES | TBD |
| Customer feedback collected | ≥2 items | TBD |
| Both sites live | ✅ YES | TBD |
| Lead capture working | ✅ YES | TBD |
| GHL sync reliable | ✅ YES | TBD |
| Week 2 priorities clear | ✅ YES | TBD |

---

## CRITICAL BLOCKERS (WATCH FOR)

**If any of these occur, escalate immediately:**

```
🔴 Peskids smoke test fails
   → Fix identified issue → Re-run → Must pass before customer review

🔴 GHL contact sync fails
   → Check API key, pipeline ID, rate limits
   → Must work before going live

🔴 Customer unreachable during review call
   → Reschedule to Wednesday
   → Can't proceed with Week 2 planning without feedback

🔴 ICSO GHL location ID unavailable
   → Delay ICSO provisioning 1 day
   → Keep Peskids on schedule

🔴 Supabase migration fails
   → Check schema syntax
   → Verify RLS policies
   → Restore from backup if needed
```

---

## RESOURCE ALLOCATION

### Primary Engineer (100% this week)
- Monday: Smoke test validation
- Tuesday: ICSO provisioning + customer call
- Wednesday-Thursday: Landing pages + flow validation
- Friday: Feedback synthesis + Week 2 planning

### Claude AI Agents (Support)
- Script scaffolding (onboard-new-client.sh)
- Documentation generation
- Test file templates (Week 2)
- Troubleshooting scripts

### Product Lead (as needed)
- Tuesday: Customer review call
- Friday: Feedback analysis + roadmap planning

---

## COMMUNICATION PLAN

**Daily (5 min standup):**
- What did we complete?
- What's blocking?
- What's next?

**Mid-week (Tuesday, customer call):**
- 30 min demo + feedback
- Document findings

**End-of-week (Friday):**
- Retrospective + findings
- Share Week 2 plan with stakeholders

**Customer-facing:**
- Monday: Credentials email
- Tuesday: Review call (scheduled)
- Friday: Feedback form (auto-email)
- Next Monday: Week 2 plan (if they ask)

---

## DELIVERABLES (BY EOD FRIDAY)

```
✅ Committed to git (claude/opsly-platform-scope-3hiJq):

1. WEEK-1-EXECUTION-SUMMARY.md
   - What we accomplished
   - Issues found + resolutions
   - Customer feedback (anonymized)
   - Metrics (leads, syncs, uptime)

2. WEEK-2-ROADMAP.md
   - Top 3 priorities (based on feedback)
   - Effort estimates
   - Timeline

3. Updated AGENTS.md
   - Week 1 results
   - Customer status (happy/neutral/concerned)
   - Week 2 focus areas

4. Customer feedback form responses
   - Raw feedback (confidential)
   - Synthesis + recommendations

5. Smoke test results
   - All 10 tests: ✅ PASS
   - No regressions
```

---

## NEXT STEPS (Week 2)

**See: WEEK-2-ROADMAP.md** (to be created Friday)

Preview:
- **P1:** RLS audit + security validation
- **P2:** Customer-requested features (calendar/email/SMS)
- **P3:** Test hardening (Phase 1a)
- **P4:** ICSO sales engine fine-tuning

---

**Document Status:** Ready to execute Monday  
**Last Updated:** 2026-06-07  
**Owner:** Primary Engineer / Product  
**Next Review:** 2026-06-14 (Friday EOD)

🚀 **LET'S GO!**
