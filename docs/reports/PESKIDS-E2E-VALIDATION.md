---
status: draft
owner: qa
created: 2026-06-10
purpose: "Real-time system validation for Cristian - tonight"
---

# PESKIDS END-TO-END VALIDATION

**Objective:** Validate complete lead flow through all systems (Supabase → GHL → Tags → Pipeline → n8n).

**Timeline:** 10 minutes  
**Prerequisites:** Peskids app running, GHL configured, n8n webhook active

---

## TEST DATA

```json
{
  "parent_name": "Maria Rodriguez Test",
  "email": "maria-test-20260610@example.com",
  "phone": "+573001234567",
  "child_name": "Mateo",
  "child_age": 8,
  "interest": "Swimming trial class"
}
```

---

## VALIDATION STEPS

### Step 1: Create Lead via GHL UI or API

**Option A (UI):** 
1. Go to GHL Contacts
2. Click "Create Contact"
3. Fill test data above

**Option B (API):**
```bash
curl -X POST https://api.op-sly.com/api/public/tenants/peskids/webhooks/gohighlevel/leads \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "lead.created",
    "tenant_slug": "peskids",
    "lead": {
      "parent_name": "Maria Rodriguez Test",
      "email": "maria-test-20260610@example.com",
      "phone": "+573001234567",
      "child_name": "Mateo",
      "age": 8,
      "interest": "Swimming trial class"
    }
  }'
```

**Expected Response:** `200 OK` with success message

**Result:** ☐ PASS / ☐ FAIL

---

### Step 2: Verify Lead in Supabase

**Access:** Supabase dashboard → `peskids` schema → `peskids_leads` table

**Expected to find:**
- Row with `email = maria-test-20260610@example.com`
- Fields populated: `parent_name`, `phone`, `child_name`, `age`
- Timestamp: `created_at` = recent (within last minute)
- Status: `lead_created` or similar

**Result:** ☐ PASS / ☐ FAIL

---

### Step 3: Verify Lead in GHL

**In GHL Console:**
1. Go to Contacts
2. Search: `maria-test-20260610@example.com`
3. Verify:
   - Contact name: `Maria Rodriguez Test`
   - Phone: `+573001234567`
   - Custom fields populated: child_name, child_age, interest_level
   - Source: `lead-web` or `lead-n8n`

**Result:** ☐ PASS / ☐ FAIL

---

### Step 4: Verify Tags Applied

**Same GHL contact record:**
1. Scroll to Tags section
2. Verify at least one tag present:
   - `lead-web` (if from web form)
   - `lead-n8n` (if from n8n)
   - `trial-booked` (if appointment scheduled)

**Result:** ☐ PASS / ☐ FAIL

---

### Step 5: Verify Pipeline Stage

**Same GHL contact record:**
1. Check Pipeline: Should be "Peskids Enrollment"
2. Check Stage: Should be one of:
   - `New Lead` (initial)
   - `Contacted` (if welcome email sent)
   - `Trial Class` (if appointment scheduled)

**Result:** ☐ PASS / ☐ FAIL

---

### Step 6: Verify n8n Webhook Received

**In n8n Console:**
1. Navigate to Workflows
2. Find: `peskids-lead-intake` (or main lead workflow)
3. Check Executions tab
4. Verify recent execution (within last 2 minutes):
   - Status: `Success` or `Completed`
   - Execution shows payload with email: `maria-test-20260610@example.com`

**Alternative:** Check VPS logs
```bash
docker logs opsly-n8n-peskids | grep maria-test-20260610
```

**Expected:** Log entry showing webhook received

**Result:** ☐ PASS / ☐ FAIL

---

## VALIDATION CHAIN SUMMARY

```
Lead Created (GHL UI or API)
       ↓
   [PASS/FAIL] — Can create?
       ↓
Stored in Supabase
       ↓
   [PASS/FAIL] — In DB?
       ↓
Visible in GHL Contact Record
       ↓
   [PASS/FAIL] — Contact created?
       ↓
Tags Applied
       ↓
   [PASS/FAIL] — Tags working?
       ↓
Pipeline Stage Set
       ↓
   [PASS/FAIL] — Pipeline ok?
       ↓
n8n Webhook Received
       ↓
   [PASS/FAIL] — Automation triggered?
```

---

## SUMMARY TABLE

| Step | Component | Expected | Result |
|------|-----------|----------|--------|
| 1 | Lead creation | API 200 OK | ☐ PASS / ☐ FAIL |
| 2 | Supabase storage | Row in DB | ☐ PASS / ☐ FAIL |
| 3 | GHL contact | Contact found | ☐ PASS / ☐ FAIL |
| 4 | Tag application | Tag present | ☐ PASS / ☐ FAIL |
| 5 | Pipeline stage | Stage assigned | ☐ PASS / ☐ FAIL |
| 6 | n8n automation | Workflow executed | ☐ PASS / ☐ FAIL |

**Overall Result:** ☐ **ALL PASS** / ☐ **PARTIAL** / ☐ **FAIL**

---

## FAILURE DIAGNOSIS

If any step fails, check these in order:

| Failure Point | Check |
|---------------|-------|
| Lead creation fails | GHL API key valid? Credentials in Doppler? |
| Supabase missing | Webhook receiver endpoint working? Check API logs |
| GHL contact missing | GHL webhook configured? Lead routed to correct location? |
| Tags missing | Tags exist in GHL? Workflow 1 (Welcome Lead) running? |
| Pipeline wrong | "Peskids Enrollment" pipeline exists? Correct GHL location? |
| n8n silent | Webhook URL correct? n8n service running? Workflow active? |

---

## SCREENSHOTS TO CAPTURE

1. GHL contact record (full view)
2. Supabase table row
3. n8n execution log
4. Contact tags (zoomed)
5. Pipeline stage field
