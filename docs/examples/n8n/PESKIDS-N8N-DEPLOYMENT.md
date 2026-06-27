---
status: ready-to-deploy
created: 2026-06-25
owner: dev
purpose: "n8n workflow deployment guide for Peskids (CRITICAL automations)"
---

# Peskids n8n Workflows — Deployment Guide

**Objective:** Deploy 3 CRITICAL n8n workflows for Peskids to unblock revenue  
**Timeline:** 2-3 hours total deployment + testing  
**Status:** ✅ All workflows ready, just need deployment  
**Owner:** Dev Team  
**Priority:** 🔴 **CRITICAL** — Revenue at risk without these

---

## Overview: Why These 3 Workflows?

| Workflow | Business Impact | SLA | Status |
|----------|-----------------|-----|--------|
| **Trial Reminder (24h)** | <50% show rate without it = **$1.5-2.5K/month loss** | 24h ±15 min | 🔴 CRITICAL |
| **Attendance Tracking** | Can't trigger enrollment without it | <5 min | 🔴 CRITICAL |
| **Enrollment Trigger** | Blocks student profile creation | <10 min | 🔴 CRITICAL |

**Total Revenue at Risk:** $14,850/month MRR × 20-30% churn without automations = **$3-4.5K/month loss**

---

## Prerequisites

✅ n8n instance running (port 3000 or configured elsewhere)  
✅ n8n credentials configured:
- [ ] GHL API key (Peskids location: `KJ5LawrOOe3hIerqtMRu`)
- [ ] Slack webhook (for #ops-critical channel)
- [ ] Supabase API key (for student profile storage)

✅ GHL Phase 1 manual UI setup complete (pipelines, forms, workflows)  
✅ Supabase migrations run (peskids_students table exists)

---

## Quick Deploy (30 minutes)

### Option A: Import JSON (Fastest)

**Step 1:** Open n8n Console
```
http://localhost:3000
```

**Step 2:** Create new workflow or open Peskids workspace

**Step 3:** Import each workflow JSON:
```bash
# Trial Reminder
curl -X POST http://localhost:3000/api/v1/workflows/import \
  -H "Authorization: Bearer $N8N_AUTH_TOKEN" \
  -d @docs/examples/n8n/peskids-trial-reminder-workflow.json

# Attendance Tracking
curl -X POST http://localhost:3000/api/v1/workflows/import \
  -H "Authorization: Bearer $N8N_AUTH_TOKEN" \
  -d @docs/examples/n8n/peskids-attendance-tracking-workflow.json

# Enrollment Trigger
curl -X POST http://localhost:3000/api/v1/workflows/import \
  -H "Authorization: Bearer $N8N_AUTH_TOKEN" \
  -d @docs/examples/n8n/peskids-enrollment-trigger-workflow.json
```

**Step 4:** Activate workflows in n8n UI
- [ ] Enable: "Peskids — Trial Reminder (24h Before)"
- [ ] Enable: "Peskids — Attendance Tracking"
- [ ] Enable: "Peskids — Enrollment Confirmation"

**Step 5:** Test (5 min per workflow)
- See "Testing" section below

---

### Option B: Manual UI Setup (60 minutes)

**If importing fails, set up manually in n8n:**

1. Create new workflow for each JSON file
2. Copy node-by-node from JSON structure
3. Configure credentials for each node
4. Test execution
5. Activate workflow

---

## Detailed Deployment

### Workflow 1: Trial Reminder (24h Before)

**File:** `docs/examples/n8n/peskids-trial-reminder-workflow.json`  
**Purpose:** Send SMS reminder 24 hours before trial class  
**Trigger:** Schedule (every hour)  
**Actions:** Query appointments → Send SMS → Add tag → Log to Slack

**Deployment Steps:**

1. **Import workflow** (or create manually)
2. **Configure credentials:**
   - [ ] GHL API key for Peskids location
   - [ ] Slack webhook for #ops-critical
3. **Set schedule:** Every hour (checks for appointments 24h away)
4. **Configure SMS template:**
   - Message: `Hola {{firstName}}, te recordamos tu clase de prueba mañana a las {{time}}. Confirma aquí: {{link}}`
   - Limit: 160 characters
5. **Test:**
   - Create dummy appointment for tomorrow
   - Run workflow manually
   - Verify SMS sent
   - Check Slack log

**Expected Output:**
```
✓ SMS sent to parent_name — Trial class reminder for child_name
```

**Activation:**
- [ ] Enable workflow toggle in n8n
- [ ] Set timezone: America/Bogota
- [ ] Monitor first 24h

---

### Workflow 2: Attendance Tracking (Appointment Status Sync)

**File:** `docs/examples/n8n/peskids-attendance-tracking-workflow.json`  
**Purpose:** Track trial completion and trigger enrollment flow  
**Trigger:** GHL webhook (appointment status changed)  
**Actions:**
- If Completed: Update stage → Send enrollment offer
- If No Show: Create follow-up task → Send recovery SMS

**Deployment Steps:**

1. **Import workflow** (or create manually)
2. **Configure GHL webhook:**
   - Trigger: "Appointment Status Changed"
   - URL: `http://n8n-instance/webhook/peskids-attendance`
   - Events: `appointment.updated`
3. **Configure credentials:**
   - [ ] GHL API key for Peskids
   - [ ] Slack webhook
   - [ ] Supabase (if updating student records)
4. **Set conditional logic:**
   - Status = "Completed" → Send enrollment offer
   - Status = "No Show" → Create follow-up task
5. **Test:**
   - In GHL, mark test appointment as "Completed"
   - Verify: Contact stage changes, email sent, SMS sent
   - Check Slack log

**Expected Output:**
```
📊 Trial Attendance Updated:
• Status: Completed
• Enrollment offer sent
• Contact tagged: trial-completed
```

**Activation:**
- [ ] Enable workflow toggle
- [ ] Register webhook in GHL
- [ ] Monitor for status changes

---

### Workflow 3: Enrollment Confirmation & Student Creation

**File:** `docs/examples/n8n/peskids-enrollment-trigger-workflow.json`  
**Purpose:** Create student profile when parent completes enrollment  
**Trigger:** GHL webhook (contact moved to "Enrolled" stage)  
**Actions:** Create student in Supabase → Send welcome email/SMS → Schedule first class

**Deployment Steps:**

1. **Import workflow** (or create manually)
2. **Configure GHL webhook:**
   - Trigger: "Contact Moved to Stage"
   - Stage: "Enrolled"
   - URL: `http://n8n-instance/webhook/peskids-enrollment`
3. **Configure Supabase connection:**
   - [ ] API key
   - [ ] Table: `peskids_students`
   - [ ] RLS policy: Enable write for tenant
4. **Configure credentials:**
   - [ ] GHL API
   - [ ] Supabase REST API
   - [ ] Slack webhook
5. **Map fields:**
   - Parent name → `parent_name` (Supabase)
   - Child name → `child_name`
   - Child age → `child_age`
   - Swim level → `swimming_level`
6. **Test:**
   - Move test contact to "Enrolled" stage in GHL
   - Verify: Student created in Supabase
   - Check: Welcome email sent, SMS sent
   - Confirm: First class appointment created

**Expected Output:**
```
🎉 New Enrollment!
• Child: Test Child (age 7)
• Parent: Test Parent
• Level: Beginner
• Student ID: psk_001_xyz
```

**Activation:**
- [ ] Enable workflow toggle
- [ ] Register webhook in GHL
- [ ] Monitor for new enrollments

---

## Testing Checklist

### Unit Tests (Each Workflow)

**Trial Reminder Workflow:**
- [ ] Schedule triggers every hour
- [ ] Identifies appointments 24h away (±1h tolerance)
- [ ] Sends SMS with correct format
- [ ] Adds tag `trial-reminded` to contact
- [ ] Logs success to Slack

**Attendance Tracking Workflow:**
- [ ] Receives GHL webhook on appointment status change
- [ ] Correctly identifies "Completed" vs "No Show"
- [ ] Updates contact stage appropriately
- [ ] Sends enrollment offer email on completion
- [ ] Creates follow-up task on no-show
- [ ] Logs to Slack

**Enrollment Trigger Workflow:**
- [ ] Receives GHL webhook on stage change to "Enrolled"
- [ ] Creates student record in Supabase
- [ ] Sends welcome email + SMS
- [ ] Schedules first class appointment
- [ ] Logs to Slack

### Integration Tests (All Together)

**End-to-End Flow:**
1. Create test lead in GHL (Peskids form)
2. Schedule trial appointment
3. Verify: Welcome email sent
4. Wait for 24h reminder (or run manually)
5. Verify: Reminder SMS sent
6. Mark appointment as "Completed" in GHL
7. Verify: Enrollment offer email sent, SMS sent
8. Move contact to "Enrolled" stage
9. Verify: Student created in Supabase, welcome email sent, first class scheduled

**Expected Total Time:** 15 minutes

---

## Monitoring & Alerts

**Slack Channel:** `#ops-critical`

**Alerts Configured:**
- ✅ SMS sent (with count)
- ✅ Email sent (with template name)
- ✅ Student created (with ID)
- ❌ Workflow error (with stack trace)
- ⚠️ No appointments in next 25h window

**Dashboards to Set Up:**
- n8n: Workflow execution logs (success/failure rate)
- Supabase: peskids_students table (new enrollments/day)
- GHL: Pipeline flow (New Lead → Enrolled progression)

---

## Rollback Plan (If Issues)

**If Trial Reminder fails:**
- Disable workflow
- Fall back to GHL native SMS workflow
- Notify Ops, create task for dev
- Test fix before re-enabling

**If Attendance Tracking fails:**
- Disable workflow
- Manual contact stage update in GHL
- Manually create follow-up task
- Critical issue — escalate immediately

**If Enrollment fails:**
- Disable workflow
- Manually create student in Supabase
- Manually send welcome email
- Critical issue — escalate and create incident

---

## Success Criteria (Go-Live)

✅ **All 3 workflows deployed and active**
✅ **All credentials configured and tested**
✅ **E2E test flow completed successfully**
✅ **Slack alerts working**
✅ **Team trained on workflow logs & dashboards**
✅ **On-call schedule for first week**

**When all criteria met:**
- [ ] Sign-off: Dev Lead
- [ ] Sign-off: Ops Lead
- [ ] Announce: Phase 1 + Phase 2 (n8n) complete
- [ ] Go-live: Accept real Peskids leads

---

## Files Reference

| File | Purpose |
|------|---------|
| `peskids-trial-reminder-workflow.json` | 24h SMS reminder (import as JSON) |
| `peskids-attendance-tracking-workflow.json` | Attendance sync + enrollment trigger |
| `peskids-enrollment-trigger-workflow.json` | Student creation + welcome flow |
| `PESKIDS-N8N-DEPLOYMENT.md` | This guide |

---

## Next Steps After Deploy

1. **Hour 1-2:** Deploy + basic testing
2. **Hour 2-3:** E2E testing with real-like data
3. **Hour 3-4:** Monitor first execution cycle
4. **Day 1:** Monitor all 3 workflows during business hours
5. **Week 1:** Collect metrics, refine message copy if needed

---

## Support & Escalation

| Issue | Owner | Action |
|-------|-------|--------|
| Workflow won't activate | Dev | Check error log, recreate if needed |
| SMS not sending | Dev | Verify Twilio credentials, check message format |
| Student not created in Supabase | Dev | Check RLS policies, verify API key |
| GHL webhook not received | Ops | Verify webhook URL in GHL, re-register |
| Slack logs not appearing | Dev | Check Slack webhook token, verify channel name |

**Slack:** @dev-on-call in #ops-critical  
**Email:** dev@opsly.intcloudsysops.com (for critical issues)

---

**Status:** 🟢 **READY FOR IMMEDIATE DEPLOYMENT**

**Timeline:** 2-3 hours to deploy + test  
**Go-Live:** Can be same day as Phase 1 manual UI  
**Owner:** Dev Team  
**Created:** 2026-06-25
