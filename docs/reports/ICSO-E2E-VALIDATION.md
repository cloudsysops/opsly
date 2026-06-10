---
status: draft
owner: qa
created: 2026-06-10
purpose: "Real-time system validation for Cristian - tonight"
---

# ICSO END-TO-END VALIDATION

**Objective:** Validate complete flow from ICSO website form submission to GHL contact creation.

**Timeline:** 5 minutes  
**Prerequisites:** ICSO app running on localhost:3015, GHL credentials configured

---

## TEST DATA

```json
{
  "name": "Test User Tonight",
  "email": "test-icso-20260610@example.com",
  "message": "Testing ICSO lead submission end-to-end tonight at 8PM"
}
```

---

## VALIDATION STEPS

### Step 1: Access ICSO Website

**URL:** `http://localhost:3015/contact`

**Expected:** Contact form page loads with:
- ✓ Form fields: Name, Email, Message
- ✓ Submit button visible
- ✓ Success/error message capability

**Result:** ☐ PASS / ☐ FAIL

---

### Step 2: Fill Contact Form

**Action:**
1. Click Name field
2. Type: `Test User Tonight`
3. Click Email field
4. Type: `test-icso-20260610@example.com`
5. Click Message field
6. Type: `Testing ICSO lead submission end-to-end tonight at 8PM`
7. Click "Send inquiry" button

**Expected:** Form submits without client-side validation errors

**Result:** ☐ PASS / ☐ FAIL

---

### Step 3: Verify API Response

**Check:** Browser console (F12 → Network tab)

**Look for:**
- Request to `POST /api/leads`
- Response status: `201` or `200`
- Response body contains `contactId`

**Example success response:**
```json
{
  "success": true,
  "contactId": "ghl_contact_xyz123",
  "message": "Lead submitted successfully"
}
```

**Result:** ☐ PASS / ☐ FAIL

---

### Step 4: Verify Success Message

**Expected on form:**
- Green success toast: "Thank you! We received your inquiry..."
- Form clears (fields reset to empty)
- Can submit another lead

**Result:** ☐ PASS / ☐ FAIL

---

### Step 5: Verify GHL Contact Creation

**In GHL Console:**
1. Navigate to Contacts
2. Search for `test-icso-20260610@example.com`
3. Verify contact created with:
   - Name: `Test User Tonight`
   - Email: `test-icso-20260610@example.com`
   - Custom field "Message": `Testing ICSO lead submission...`
   - Source: `ICSO Website`

**Result:** ☐ PASS / ☐ FAIL

---

### Step 6: Verify Pipeline Stage

**In GHL Console (same contact):**
1. Check Pipeline: Should show "Opsly Agency Sales"
2. Check Stage: Should be "New Lead"

**Result:** ☐ PASS / ☐ FAIL

---

## SUMMARY

| Step | Result | Notes |
|------|--------|-------|
| Website loads | ☐ PASS / ☐ FAIL | |
| Form submits | ☐ PASS / ☐ FAIL | |
| API responds | ☐ PASS / ☐ FAIL | HTTP 201/200 |
| Success message | ☐ PASS / ☐ FAIL | |
| GHL contact exists | ☐ PASS / ☐ FAIL | Email searchable |
| Pipeline correct | ☐ PASS / ☐ FAIL | New Lead stage |

**Overall Result:** ☐ **ALL PASS** / ☐ **PARTIAL** / ☐ **FAIL**

---

## SCREENSHOTS TO CAPTURE

1. ICSO contact form (website)
2. Browser network tab (API request/response)
3. Success toast message
4. GHL contact record
5. GHL pipeline stage

---

## TROUBLESHOOTING

| Issue | Debug |
|-------|-------|
| Form won't submit | Check browser console for JS errors |
| API returns 500 | Check VPS logs: `docker logs opsly-api` |
| GHL contact missing | Check GHL location ID in config, verify API key |
| Wrong pipeline | Verify "Opsly Agency Sales" pipeline exists in GHL |
