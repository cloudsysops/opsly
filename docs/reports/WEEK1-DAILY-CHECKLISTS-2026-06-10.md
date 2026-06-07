---
status: week1-execution-checklists
mission: Week 1 Daily Execution (June 10-14, 2026)
date: 2026-06-07
owner: Primary Engineer + Product Lead
---

# WEEK 1 DAILY EXECUTION CHECKLISTS

**Timeline:** Monday June 10 — Friday June 14, 2026  
**Goal:** Peskids customer review + ICSO sales engine live

---

## TUESDAY EXECUTION — ICSO Provisioning + Customer Call

**Time Allocation:** 4-5 hours  
**Owner:** Primary Engineer (provisioning) + Product Lead (customer call)

### 09:00 - GHL Location ID Verification (15 min)

```bash
# Confirm from Monday prep:
ICSO_GHL_LOCATION_ID = [documented Monday]
ICSO_GHL_PIPELINE_ID = [documented Monday]
ICSO_GHL_PIPELINE_STAGE_ID = [documented Monday]

# If missing, retrieve now:
# Go to: gohighlevel.com → Locations → select ICSO location
# Copy: Location ID from URL or Settings
# Go to: CRM → Pipelines → select default pipeline
# Copy: Pipeline ID and first Stage ID
```

**Acceptance:** ✅ All 3 IDs confirmed

### 09:15 - Tenant Provisioning Script (2 hours)

```bash
# Run automated provisioning
./scripts/onboard-new-client.sh icso \
  --ghl-location-id=$ICSO_GHL_LOCATION_ID \
  --owner-email=sales@icso.com \
  --dry-run  # First run: test only

# What it generates:
✅ config/tenants/icso.json
✅ Supabase migration (tenant schema)
✅ Landing page template (icso app)
✅ Doppler secrets template
✅ n8n Docker Compose
✅ API route: apps/api/app/icso/*

# Review generated files
cd config/tenants && ls -la icso.json
# Should show: tenant config with GHL integration
```

**Acceptance:** ✅ Script ran without errors, files generated

### 11:15 - Manual Configuration (1.5 hours)

```bash
# 1. Replace placeholders in generated files
sed -i 's/TENANT_SLUG/icso/g' config/tenants/icso.json
sed -i 's/{GHL_LOCATION_ID}/'$ICSO_GHL_LOCATION_ID'/g' apps/api/app/icso/route.ts

# 2. Run Supabase migration
npm run db:migrate -- --project icso
# Verify: SELECT * FROM migrations WHERE tenant_slug='icso';

# 3. Deploy n8n workflows (from Docker Compose)
cd .docker && docker-compose -f tenant_icso.yml up -d
# Verify: curl http://localhost:5678/healthz

# 4. Configure Traefik routing
# File: .docker/traefik-config/icso.yml
# Routes: icso.op-sly.com → landing page
# Routes: api-icso.op-sly.com → API

# 5. Deploy landing page to VPS
# (Manual: SCP or GitHub Actions trigger)
scp -r apps/icso/public vps-dragon@100.120.151.91:/opt/opsly/icso/

# 6. Verify DNS (if needed)
dig icso.op-sly.com @100.120.151.91
# Expected: 100.120.151.91 ICSO VPS IP
```

**Acceptance:** ✅ All manual steps completed

### 12:45 - ICSO Smoke Test (30 min)

```bash
# Test the provisioned environment
echo "TEST 1: Landing page loads"
curl -I https://icso.op-sly.com | grep "200\|301"

echo "TEST 2: Form submits to Supabase"
curl -X POST https://api.op-sly.com/api/icso/leads \
  -H "Content-Type: application/json" \
  -d '{"full_name":"test","email":"test@example.com","phone":"1234567890"}'
# Expected: HTTP 201 + lead ID

echo "TEST 3: GHL contact created"
# Go to: GHL dashboard → Contacts
# Search: test@example.com
# Expected: Contact exists with Peskids tag

echo "TEST 4: Dashboard loads"
curl -I https://icso.op-sly.com/admin | grep "200"
```

**Acceptance:** ✅ All 4 tests pass

### 13:15 - Peskids Customer Review Call (30 min)

**Timing:** Scheduled from Monday  
**Attendees:** Primary Engineer + Product Lead + Customer

**Agenda:**
1. Welcome + context (2 min)
   - "Thanks for testing Peskids this week"
   - "We want your honest feedback"

2. Feature demo (8 min)
   - Show: https://peskids.op-sly.com (landing)
   - Submit test lead
   - Show: https://peskids.op-sly.com/admin (dashboard)
   - Show: GHL contact synced

3. Feedback collection (15 min)
   - "What's working well?"
   - "What's missing or broken?"
   - "Price acceptable?"
   - "Ready for real leads?"

4. Q&A (5 min)
   - "Any questions?"
   - "Can we schedule Week 2 call?"

**During call, document:**
- [ ] Customer sentiment: Happy / Neutral / Concerned
- [ ] Top 3 feedback items:
  1. ___________
  2. ___________
  3. ___________
- [ ] Missing features (rank by priority):
  - Calendar? (Y/N)
  - Email? (Y/N)
  - SMS? (Y/N)
  - Other? _____
- [ ] Blockers (any issues preventing use?):
  - _____

**Acceptance:** ✅ Call completed, feedback documented

### 14:00 - EOD Status Update

```
TUESDAY COMPLETE IF:

[ ] GHL IDs confirmed
[ ] ICSO provisioning script ran (dry-run or full)
[ ] Manual configuration completed
[ ] ICSO smoke test: ✅ PASS
[ ] Peskids customer call: ✅ COMPLETED
[ ] Customer feedback: ✅ DOCUMENTED
```

---

## WEDNESDAY EXECUTION — Landing Pages Live

**Time Allocation:** 4-5 hours  
**Owner:** Primary Engineer + Designer

### 09:00 - ICSO Landing Page Finalization (1 hour)

```bash
# Review landing page against brand
[ ] Logo correct
[ ] Colors match brand (ICSO colors)
[ ] Copy is accurate (service description, CTA)
[ ] Form fields correct (name, email, phone, service, budget)
[ ] Mobile responsive (test on phone)
[ ] Links work (privacy, terms, contact)

# Make final edits
code apps/icso/app/page.tsx
# Update: heading, description, form fields, CTA button

# Build and test locally
cd apps/icso && npm run dev  # Test at localhost:3004
# Verify: form submits, styles look good
```

**Acceptance:** ✅ Landing page passes visual + functional review

### 10:00 - GHL Pipeline Lookup (1 hour)

```bash
# Retrieve missing ICSO GHL pipeline IDs
ICSO_GHL_PIPELINE_ID=$(curl -X GET "https://api.gohighlevel.com/v1/pipelines" \
  -H "Authorization: Bearer $ICSO_GHL_API_KEY" \
  -H "locationId: $ICSO_GHL_LOCATION_ID" \
  | jq -r '.pipelines[0].id')

# Get first stage of that pipeline
ICSO_GHL_PIPELINE_STAGE_ID=$(curl -X GET "https://api.gohighlevel.com/v1/pipeline-stages/$ICSO_GHL_PIPELINE_ID" \
  -H "Authorization: Bearer $ICSO_GHL_API_KEY" \
  -H "locationId: $ICSO_GHL_LOCATION_ID" \
  | jq -r '.stages[0].id')

# Add to Doppler secrets
doppler secrets set ICSO_GHL_PIPELINE_ID=$ICSO_GHL_PIPELINE_ID
doppler secrets set ICSO_GHL_PIPELINE_STAGE_ID=$ICSO_GHL_PIPELINE_STAGE_ID

# Verify in environment
echo $ICSO_GHL_PIPELINE_ID
echo $ICSO_GHL_PIPELINE_STAGE_ID
```

**Acceptance:** ✅ Both IDs added to Doppler

### 11:00 - Customer Feedback Synthesis (1 hour)

**From Tuesday call, synthesize:**

```
FEEDBACK SUMMARY:

1. What's working:
   - ___________
   - ___________

2. Top blockers/bugs:
   - Priority: ___________
   - Priority: ___________

3. Missing features (rank):
   - #1: ___________
   - #2: ___________
   - #3: ___________

4. Customer sentiment:
   - Happy / Neutral / Concerned
   - Quote: ___________

5. Revenue implications:
   - Ready for paying customers? Y/N
   - Price feedback: Too high / Fair / Too low
   - Timeline: Ready now / Need [feature] first
```

**Acceptance:** ✅ Feedback documented in spreadsheet/doc

### 12:00 - Both Sites Live Verification (1 hour)

```bash
# Verify Peskids
curl -I https://peskids.op-sly.com | grep "200"
curl -I https://peskids.op-sly.com/admin | grep "200"

# Verify ICSO
curl -I https://icso.op-sly.com | grep "200"
curl -I https://icso.op-sly.com/admin | grep "200"

# Test lead capture on both
# Peskids: Submit form at https://peskids.op-sly.com
# ICSO: Submit form at https://icso.op-sly.com
# Verify both appear in respective dashboards

# Check email notifications (if configured)
# Should receive notification for each lead submitted
```

**Acceptance:** ✅ Both sites live, form submissions working

### 13:00 - Sales Positioning (1 hour)

```
Prepare ICSO sales materials:

[ ] 30-second pitch (features + price)
[ ] 2-minute demo (show landing page + form flow)
[ ] 5-minute walkthrough (include dashboard + GHL sync)

Target customers for Week 2:
1. _________________ (contact: ______)
2. _________________ (contact: ______)
3. _________________ (contact: ______)

Sales questions to answer:
- "What does it do?" → 30-sec pitch
- "How much?" → Price: $X/month
- "Can I try it?" → Demo: [URL]
- "How long to set up?" → 2 weeks from decision
```

**Acceptance:** ✅ Sales materials ready, 3 target customers identified

### 14:00 - EOD Status Update

```
WEDNESDAY COMPLETE IF:

[ ] ICSO landing page: ✅ LIVE
[ ] GHL pipeline IDs: ✅ IN DOPPLER
[ ] Customer feedback: ✅ SYNTHESIZED
[ ] Both sites live: ✅ VERIFIED
[ ] Lead capture working: ✅ BOTH SITES
[ ] Sales materials: ✅ READY
[ ] Target customers: ✅ IDENTIFIED (3)
```

---

## THURSDAY EXECUTION — Revenue Flow Validation

**Time Allocation:** 4-5 hours  
**Owner:** Primary Engineer

### 09:00 - Complete Lead Flow Test (1 hour)

```bash
# Test: Lead → Supabase → GHL → Tag → Dashboard

echo "STEP 1: Submit lead on Peskids landing"
# Go to: https://peskids.op-sly.com
# Fill: Name=Flow Test 1, Email=flow-test-1@example.com, Phone=1234567890
# Submit and note timestamp

echo "STEP 2: Verify in Peskids Supabase"
# Go to: https://peskids.op-sly.com/admin
# Check: Lead appears, status = 'New', GHL sync = 'Pending'
# Document: lead_id, created_at

echo "STEP 3: Verify GHL contact created"
# Go to: GHL dashboard → Contacts
# Search: flow-test-1@example.com
# Check: Contact exists, tag = 'Peskids Lead', phone = '1234567890'
# Document: GHL contact_id, created_at

echo "STEP 4: Verify dashboard updates"
# Refresh Peskids dashboard
# Check: GHL sync = 'Synced', status may have changed
# Document: final status

# Calculate: Total time from form submit to GHL = [timestamp diff]
# Expected: < 2 minutes
```

**Acceptance:** ✅ Full flow completes in <2 min, all steps verified

### 10:00 - Metrics Dashboard Creation (1.5 hours)

```
Create metrics tracking spreadsheet:

Date    | Metric              | Expected | Actual | Status
--------|---------------------|----------|--------|--------
Today   | Leads captured      | 2        | 2      | ✅
Today   | GHL synced          | 2        | 2      | ✅
Today   | Sync success rate   | 100%     | 100%   | ✅
Today   | API latency         | <500ms   | 300ms  | ✅
Today   | Dashboard uptime    | 99.9%    | 100%   | ✅

Weekly target:
- Peskids leads: >= 10
- ICSO leads: >= 0 (just going live)
- GHL sync rate: >= 98%
- Dashboard uptime: >= 99.5%

(For real customers, this becomes a live dashboard)
```

**Acceptance:** ✅ Metrics spreadsheet created, baseline captured

### 11:30 - Support Team Readiness (1 hour)

```bash
# Review support checklist
cat docs/runbooks/CLIENT-LAUNCH-RUNBOOK.md | head -100

# Prepare support responses for common issues:
[ ] "Form won't submit" → Clear cache, check console
[ ] "No GHL contact created" → Check API key, pipeline ID
[ ] "Dashboard won't load" → Hard refresh, check JWT
[ ] "Lead data missing" → Check form field names
[ ] "Slow sync" → Check Redis queue depth
[ ] "Calendar not working" → "Coming in Week 2"
[ ] "Email not sending" → "Coming in Week 2"

# Set up support channels:
[ ] Email alias: support@opsly.com (monitored)
[ ] Slack channel: #peskids-support (created)
[ ] Response time: 24h normal, 4h critical
[ ] Escalation: CTO (cboteros) for critical

# Document SLA:
- P0 (blocking revenue): 4h response, 24h resolution
- P1 (major feature): 24h response, 5-day resolution
- P2 (minor feature): 48h response
```

**Acceptance:** ✅ Support team trained, channels ready, SLA documented

### 12:30 - Week 1 Documentation (1 hour)

```bash
# Create WEEK-1-SUMMARY.md:
- What we accomplished
- Issues found + resolutions
- Customer feedback (anonymized)
- Metrics (leads, syncs, uptime)
- Revenue readiness status

# Update AGENTS.md:
- Week 1 results
- Customer status
- Week 2 focus areas
- Any blockers for Week 2
```

**Acceptance:** ✅ Week 1 summary documented, ready for Friday review

### 13:30 - Test Planning Prep (optional)

```bash
# If customer happy with current features, start test planning:
[ ] RLS audit (security critical)
[ ] Phase 1a test scaffolding (40 hours)
[ ] Write first 3 test files
[ ] Set up CI for tests

# If waiting on customer feedback, skip to Friday
```

**Acceptance:** ✅ Test planning ready (if applicable)

### 14:30 - EOD Status Update

```
THURSDAY COMPLETE IF:

[ ] Lead flow: ✅ WORKING END-TO-END
[ ] Total sync time: < 2 minutes
[ ] Metrics dashboard: ✅ CREATED
[ ] Support team: ✅ TRAINED
[ ] SLA documented: ✅ 4h/24h/48h
[ ] Week 1 summary: ✅ IN PROGRESS
[ ] Test planning: ✅ READY (if applicable)
```

---

## FRIDAY EXECUTION — Customer Feedback + Week 2 Planning

**Time Allocation:** 4-5 hours  
**Owner:** Product Lead + Primary Engineer

### 09:00 - Customer Feedback Survey (1 hour)

```
Send feedback form to Peskids customer:

SUBJECT: Peskids Week 1 Feedback Request

Hi [Customer],

Thank you for testing Peskids this week! Your feedback helps us improve.

QUICK QUESTIONS (5 minutes):

1. Is form submission working smoothly? (1-10)
   [  ] 1  [  ] 2  [  ] 3  [  ] 4  [  ] 5  [  ] 6  [  ] 7  [  ] 8  [  ] 9  [  ] 10

2. Is GHL sync reliable? (1-10)
   [  ] 1  [  ] 2  [  ] 3  [  ] 4  [  ] 5  [  ] 6  [  ] 7  [  ] 8  [  ] 9  [  ] 10

3. What feature would help most in Week 2?
   [ ] Calendar integration
   [ ] Email automation
   [ ] SMS follow-ups
   [ ] Custom fields
   [ ] Other: _________

4. Any bugs or issues?
   _____________________

5. Price feedback?
   [ ] Too high  [ ] Fair  [ ] Too low

6. Ready for paying customers?
   [ ] Yes, ready now
   [ ] Need [feature] first
   [ ] Not yet

Reply to this email with your feedback.

Thanks!
[Product Lead]
```

**Acceptance:** ✅ Survey sent, awaiting customer response

### 10:00 - Early ICSO Lead Handling (if applicable) (1 hour)

```bash
# If ICSO has leads from landing page (unlikely but possible)

echo "Check for ICSO leads"
# Query: SELECT * FROM leads WHERE tenant_slug='icso' LIMIT 10
# If found:
  [ ] Verify Supabase data
  [ ] Verify GHL contacts created
  [ ] Document any issues
  [ ] Add to incident log
```

**Acceptance:** ✅ ICSO leads verified (if any)

### 11:00 - Week 1 Retrospective (1 hour)

```
RETROSPECTIVE TEMPLATE:

✅ COMPLETED:
[ ] Peskids smoke test: ✅ PASS
[ ] Customer review: ✅ COMPLETED (feedback below)
[ ] ICSO provisioning: ✅ COMPLETE
[ ] Both sites live: ✅ YES
[ ] Revenue flow: ✅ VALIDATED
[ ] Support team: ✅ TRAINED

⚠️ ISSUES FOUND:
[ ] Issue #1: __________ (Severity: P0/P1/P2) → Fix time: ___h
[ ] Issue #2: __________ (Severity: P0/P1/P2) → Fix time: ___h
[ ] Issue #3: __________ (Severity: P0/P1/P2) → Fix time: ___h

💡 LEARNINGS:
[ ] What went well: ______
[ ] What could improve: ______
[ ] Customer feedback theme: ______

📊 METRICS (Week 1):
- Peskids leads: [N]
- ICSO leads: [N]
- GHL sync success: [%]
- Dashboard uptime: [%]
- Support tickets: [N]
```

**Acceptance:** ✅ Retrospective completed, issues documented

### 12:00 - Week 2 Priorities (1 hour)

```
WEEK 2 PRIORITIES (based on customer feedback):

PRIORITY MATRIX:

                HIGH VALUE
                    ↑
                    |
  P1 (Do First) | P2 (Do Later)
  ______________|________________→
  P4 (Skip)     | P3 (Low Priority)
                |
                ↓
             LOW VALUE

P1 PRIORITY (do in Week 2):
#1: _________________ (effort: ___h, value: high)
#2: _________________ (effort: ___h, value: high)
#3: _________________ (effort: ___h, value: medium)

ESTIMATED EFFORT:
- Week 2 capacity: 40 hours
- Top 3 features: ___h total
- Buffer: ___h

TIMELINE:
- Mon-Tue: Feature #1 (dev + test)
- Wed-Thu: Feature #2 (dev + test)
- Friday: Integration + customer feedback
```

**Acceptance:** ✅ Week 2 priorities ranked and estimated

### 13:00 - Final Documentation (1 hour)

```bash
# Create WEEK-2-ROADMAP.md:
- Top 3 priorities
- Effort estimates
- Timeline
- Success criteria
- Blockers and dependencies

# Update AGENTS.md:
- Week 1 completion status
- Week 2 plan
- Revenue readiness update
- Next steps
```

**Acceptance:** ✅ Week 2 roadmap documented

### 14:00 - Team Standup & Handoff (30 min)

```
FINAL STANDUP AGENDA:

1. Week 1 recap (5 min)
   - Peskids: Ready for real customers
   - ICSO: Sales engine live
   - Team learned: ______

2. Customer feedback (10 min)
   - Sentiment: Happy / Neutral / Concerned
   - Top requests: ______
   - Blockers: ______

3. Week 2 plan (10 min)
   - Top 3 priorities
   - Timeline
   - Resource allocation

4. Next steps (5 min)
   - Who does what?
   - When do we start?
   - Any questions?
```

**Acceptance:** ✅ Standup completed, team aligned

### 14:30 - EOD Status Update

```
FRIDAY COMPLETE IF:

[ ] Customer feedback: ✅ SENT
[ ] Week 1 retrospective: ✅ DOCUMENTED
[ ] Week 2 priorities: ✅ RANKED
[ ] Week 2 roadmap: ✅ WRITTEN
[ ] Team aligned: ✅ STANDUP DONE
```

---

## WEEK 1 SUCCESS CRITERIA (All metrics, EOD Friday)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Peskids smoke test | ✅ PASS | TBD | |
| ICSO provisioning | ✅ COMPLETE | TBD | |
| Customer review | ✅ COMPLETED | TBD | |
| Customer feedback | ≥2 items | TBD | |
| Both sites live | ✅ YES | TBD | |
| Lead capture working | ✅ YES | TBD | |
| GHL sync reliable | ✅ YES | TBD | |
| Week 2 priorities | ✅ CLEAR | TBD | |

---

**Document Version:** 1.0  
**Created:** 2026-06-07  
**Next Review:** 2026-06-14 (Friday EOD)

🚀 **WEEK 1 EXECUTION STARTS MONDAY 06:00**
