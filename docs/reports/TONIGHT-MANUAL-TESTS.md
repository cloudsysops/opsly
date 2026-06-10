---
status: draft
owner: qa
created: 2026-06-10
title: "Cristian's 30-Minute Validation Checklist"
duration: "30 minutes maximum"
---

# TONIGHT'S MANUAL TESTS — 30 Minutes

**Objective:** Execute 10 quick validation tests in <30 minutes.

**Time Budget:** 3 minutes per test (1 minute buffer)

**Success Criteria:** All 10 tests PASS or identified as blocked

---

## TEST 1: ICSO Website Loads

**Time Budget:** 2 min

**URL:** `http://localhost:3015` (or `https://icso.op-sly.com` if deployed)

**Action:**
1. Open URL in browser
2. Check page loads
3. Check for console errors (F12)

**Expected Result:**
- ✓ Page loads in <3 seconds
- ✓ No HTTP 500 errors
- ✓ No console JS errors

**RESULT:** ☐ **PASS** / ☐ **FAIL**

**If FAIL, reason:**
```
_________________________________
```

---

## TEST 2: ICSO Contact Form Submits

**Time Budget:** 3 min

**URL:** `http://localhost:3015/contact`

**Action:**
1. Fill form with:
   - Name: `Test ${Date.now()}`
   - Email: `test-icso-${Date.now()}@example.com`
   - Message: `E2E validation test`
2. Click "Send inquiry"
3. Check Network tab (F12) for POST to `/api/leads`

**Expected Result:**
- ✓ Form submits without error
- ✓ Network shows `POST /api/leads` → 201 or 200
- ✓ Success message displays (green toast)

**RESULT:** ☐ **PASS** / ☐ **FAIL**

**If FAIL, reason:**
```
_________________________________
```

---

## TEST 3: ICSO → GHL Contact Created

**Time Budget:** 3 min

**Preparation:** Completed TEST 2 (submitted lead)

**Action:**
1. Open GHL Console
2. Navigate to Contacts
3. Search for email from TEST 2
4. Verify contact exists

**Expected Result:**
- ✓ Contact appears in GHL
- ✓ Name populated
- ✓ Email matches
- ✓ Source = "ICSO Website" or similar

**RESULT:** ☐ **PASS** / ☐ **FAIL**

**If FAIL, reason:**
```
_________________________________
```

---

## TEST 4: Peskids Lead Creation (GHL)

**Time Budget:** 2 min

**Action:**
1. Open GHL Console
2. Create new contact manually with:
   - Name: `Peskids Test ${Date.now()}`
   - Email: `peskids-test-${Date.now()}@example.com`
   - Phone: `+573001234567`
3. Click Save

**Expected Result:**
- ✓ Contact created in GHL
- ✓ ID returned
- ✓ Contact visible in Contacts list

**RESULT:** ☐ **PASS** / ☐ **FAIL**

**Contact ID for next test:** `_______________________`

**If FAIL, reason:**
```
_________________________________
```

---

## TEST 5: Peskids Lead in Supabase

**Time Budget:** 3 min

**Preparation:** Completed TEST 4

**Action:**
1. Open Supabase Dashboard
2. Navigate to `peskids` schema → `peskids_leads` table
3. Look for row with email from TEST 4
4. Verify fields populated

**Expected Result:**
- ✓ Row exists with email from TEST 4
- ✓ Fields populated: `ghl_contact_id`, `parent_name`, `email`, `phone`
- ✓ Timestamp `created_at` = recent (within 1 minute)

**RESULT:** ☐ **PASS** / ☐ **FAIL**

**If FAIL, reason:**
```
_________________________________
```

---

## TEST 6: Peskids Tags Applied (GHL)

**Time Budget:** 2 min

**Preparation:** Completed TEST 4

**Action:**
1. Open GHL contact from TEST 4
2. Look at Tags section
3. Verify at least one tag present

**Expected Result:**
- ✓ Contact has tag: `lead-web` or `lead-n8n` or similar
- ✓ Tag visible in contact record
- ✓ Tag matches expected source

**RESULT:** ☐ **PASS** / ☐ **FAIL**

**If FAIL, reason:**
```
_________________________________
```

---

## TEST 7: Peskids Pipeline Stage (GHL)

**Time Budget:** 2 min

**Preparation:** Completed TEST 4

**Action:**
1. Open GHL contact from TEST 4
2. Check Pipeline field
3. Verify stage assigned

**Expected Result:**
- ✓ Pipeline: `Peskids Enrollment`
- ✓ Stage: One of `New Lead`, `Contacted`, `Trial Class`
- ✓ Stage matches expected flow

**RESULT:** ☐ **PASS** / ☐ **FAIL**

**If FAIL, reason:**
```
_________________________________
```

---

## TEST 8: API Health Check

**Time Budget:** 2 min

**Command:**
```bash
curl -X GET http://api.op-sly.com/api/health \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Result:**
- ✓ HTTP 200 status
- ✓ Response contains `"status": "ok"`
- ✓ Services listed (database, redis, supabase)

**RESULT:** ☐ **PASS** / ☐ **FAIL**

**Actual response:**
```
_________________________________
```

**If FAIL, reason:**
```
_________________________________
```

---

## TEST 9: n8n Webhook Received (Peskids)

**Time Budget:** 3 min

**Preparation:** Completed TEST 4 (Peskids lead in GHL)

**Action:**
1. Open n8n Console (`https://n8n-peskids.op-sly.com` or docker port)
2. Find main lead intake workflow
3. Click "Executions" tab
4. Look for execution within last 5 minutes with TEST 4 email

**Expected Result:**
- ✓ Execution found in logs
- ✓ Execution status: Success or Completed
- ✓ Payload contains email from TEST 4

**RESULT:** ☐ **PASS** / ☐ **FAIL**

**If FAIL (n8n webhook may be async):**
```
⚠ This may be pending. Check again in 5 min.
```

---

## TEST 10: Redis Health Check

**Time Budget:** 2 min

**Command (from VPS):**
```bash
redis-cli PING
```

**Or from Docker:**
```bash
docker exec opsly-redis redis-cli PING
```

**Expected Result:**
- ✓ Response: `PONG`
- ✓ Connection successful
- ✓ No timeout

**RESULT:** ☐ **PASS** / ☐ **FAIL**

**If FAIL, reason:**
```
_________________________________
```

---

## SUMMARY TABLE

| # | Test | Component | Result | Time |
|---|------|-----------|--------|------|
| 1 | Website loads | ICSO | ☐ PASS / ☐ FAIL | 2m |
| 2 | Form submits | ICSO API | ☐ PASS / ☐ FAIL | 3m |
| 3 | GHL contact | GHL | ☐ PASS / ☐ FAIL | 3m |
| 4 | Lead creation | Peskids/GHL | ☐ PASS / ☐ FAIL | 2m |
| 5 | DB storage | Supabase | ☐ PASS / ☐ FAIL | 3m |
| 6 | Tags applied | GHL | ☐ PASS / ☐ FAIL | 2m |
| 7 | Pipeline stage | GHL | ☐ PASS / ☐ FAIL | 2m |
| 8 | API health | API | ☐ PASS / ☐ FAIL | 2m |
| 9 | n8n webhook | n8n | ☐ PASS / ☐ FAIL | 3m |
| 10 | Redis health | Redis | ☐ PASS / ☐ FAIL | 2m |

**Total Time:** ~28 minutes (with 2 min buffer)

---

## QUICK REFERENCE

### Test Data (Copy & Paste)

**ICSO Test:**
```
Name: Test ICSO 1623
Email: test-icso-1623@example.com
Message: E2E validation tonight
```

**Peskids Test:**
```
Name: Test Peskids 1623
Email: test-peskids-1623@example.com
Phone: +573001234567
```

### Key URLs

```
ICSO:           http://localhost:3015/contact
GHL Console:    https://app.gohighlevel.com
Supabase:       https://app.supabase.com
n8n Peskids:    https://n8n-peskids.op-sly.com (or localhost:3005)
API Health:     http://api.op-sly.com/api/health
```

---

## FAILURE TRIAGE

**If Tests 1-3 fail (ICSO):**
- [ ] ICSO app not running
- [ ] API not responding
- [ ] GHL API key invalid

**If Tests 4-7 fail (Peskids):**
- [ ] Peskids not configured properly
- [ ] GHL location wrong
- [ ] Supabase connection broken

**If Tests 8-10 fail (Infrastructure):**
- [ ] VPS connectivity issue
- [ ] Docker containers down
- [ ] Redis offline

---

## DECISION TREE

```
All 10 PASS?
├─ YES → System ready for Cristian's deep validation
│        → Can proceed with conversions testing tomorrow
│
├─ 7-9 PASS → System partially ready
│             → Can debug blocking tests
│             → Document for engineering team
│
└─ <7 PASS → System not ready
             → Escalate to ops team
             → Do not proceed with customer testing
```

---

## FINAL SIGN-OFF

**Tests Passed:** `___ / 10`

**Overall Status:**
☐ **READY** (9-10 PASS)  
☐ **PARTIAL** (7-8 PASS)  
☐ **BLOCKED** (<7 PASS)

**Time Spent:** `_____ minutes`

**Next Actions:**
```
1. _________________________________
2. _________________________________
3. _________________________________
```

**Notes for Engineering Team:**
```
_________________________________
_________________________________
_________________________________
```
