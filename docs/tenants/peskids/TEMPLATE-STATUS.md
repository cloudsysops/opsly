---
status: active
owner: operations
created: 2026-06-10
last_updated: 2026-06-10
---

# Peskids Email & SMS Template Status

**Purpose:** Track configuration status of all required email/SMS templates in GHL.

**Last Updated:** 2026-06-10

---

## Template Status Summary

| # | Template | Type | Status | In GHL? | Published? | Workflow OK? | Last Verified |
|---|----------|------|--------|---------|-----------|-------------|---|
| 1 | Welcome Parent | Email | UNKNOWN | ❓ | ❓ | ❓ | — |
| 2 | Trial Confirmation | Email | UNKNOWN | ❓ | ❓ | ❓ | — |
| 3 | Trial Reminder | SMS | UNKNOWN | ❓ | ❓ | ❓ | — |
| 4 | No-show Recovery | Email | UNKNOWN | ❓ | ❓ | ❓ | — |

**Overall Status:** VALIDATION PENDING

---

## Template Details & Checklist

### Template 1: Welcome Parent (Email)

**Expected Configuration:**
- Name: Welcome Parent
- Type: Email
- Trigger: Contact Created (Peskids lead source)
- Subject: "Welcome to Peskids!"
- Content: Program intro, benefits, trial booking link

**Validation Checklist:**
- [ ] Template exists in GHL
- [ ] Published status (not draft)
- [ ] Subject line includes greeting
- [ ] Body includes program overview
- [ ] Includes trial class CTA
- [ ] Includes calendar booking link
- [ ] Workflow trigger configured and active

**Status:** ❓ NOT VERIFIED

**Verified By:** —

**Verified Date:** —

**Notes:**
```


```

---

### Template 2: Trial Confirmation (Email)

**Expected Configuration:**
- Name: Trial Confirmation
- Type: Email
- Trigger: Appointment Scheduled (Peskids calendar)
- Subject: "Your Trial Class is Confirmed!"
- Content: Date, time, location, what to expect, logistics

**Validation Checklist:**
- [ ] Template exists in GHL
- [ ] Published status (not draft)
- [ ] Subject includes "Confirmation"
- [ ] Body includes appointment date & time
- [ ] Includes location/Zoom link
- [ ] Includes what to bring/prepare
- [ ] Includes cancellation info
- [ ] Workflow trigger configured and active

**Status:** ❓ NOT VERIFIED

**Verified By:** —

**Verified Date:** —

**Notes:**
```


```

---

### Template 3: Trial Reminder (SMS)

**Expected Configuration:**
- Name: Trial Reminder
- Type: SMS
- Trigger: 24 hours before appointment
- Length: <160 characters (single segment)
- Content: Date, time, confirmation request

**Validation Checklist:**
- [ ] Template exists in GHL
- [ ] Published status (not draft)
- [ ] Character count < 160
- [ ] Includes appointment date & time
- [ ] Includes action (confirm/reply)
- [ ] Template is concise and clear
- [ ] Workflow trigger configured (24 hour delay)
- [ ] Workflow is active

**Status:** ❓ NOT VERIFIED

**Verified By:** —

**Verified Date:** —

**Notes:**
```


```

---

### Template 4: No-show Recovery (Email)

**Expected Configuration:**
- Name: No-show Recovery
- Type: Email
- Trigger: Contact Status = "No Show"
- Subject: "We'd Love to Reschedule Your Trial"
- Content: Understanding message, reschedule offer, new booking link

**Validation Checklist:**
- [ ] Template exists in GHL
- [ ] Published status (not draft)
- [ ] Subject has empathetic tone
- [ ] Body shows understanding
- [ ] Includes reschedule CTA
- [ ] Includes new booking link
- [ ] Includes support contact
- [ ] Workflow trigger configured and active

**Status:** ❓ NOT VERIFIED

**Verified By:** —

**Verified Date:** —

**Notes:**
```


```

---

## Validation History

### 2026-06-10 — Initial Status Check

**Performed By:** —

**Summary:** Validation guide created. GHL verification pending.

**Findings:**
- No verification data yet
- All templates status: UNKNOWN

**Next Steps:**
1. Navigate to GHL Console
2. Check each of 4 templates
3. Update status in table above
4. Create any missing templates

---

## Action Items

| Priority | Item | Owner | Status | Due |
|----------|------|-------|--------|-----|
| HIGH | Verify Welcome Parent template exists | ops | ⏳ PENDING | TODAY |
| HIGH | Verify Trial Confirmation template exists | ops | ⏳ PENDING | TODAY |
| HIGH | Verify Trial Reminder SMS exists | ops | ⏳ PENDING | TODAY |
| HIGH | Verify No-show Recovery template exists | ops | ⏳ PENDING | TODAY |
| MEDIUM | Create missing templates if needed | ops | ⏳ PENDING | TODAY |
| MEDIUM | Test workflows send correctly | ops | ⏳ PENDING | TOMORROW |

---

## How to Update This Document

**When validating a template:**

1. Open EMAIL-SMS-TEMPLATE-VALIDATION.md (detailed guide)
2. Follow "Validation Steps" to check GHL
3. For each template found:
   - Update status in table above from "UNKNOWN" to "✅ VERIFIED" or "❌ MISSING"
   - Add date verified
   - Add verifier name
   - Add notes if issues found

**Example update:**
```markdown
| 1 | Welcome Parent | Email | ✅ VERIFIED | ✅ YES | ✅ YES | ✅ YES | 2026-06-10 |
```

**If template is missing:**
```markdown
| 1 | Welcome Parent | Email | ❌ MISSING | ❌ NO | — | — | 2026-06-10 |
```

---

## Success Criteria

✅ **All 4 templates verified in GHL**

Success when:
- [ ] Welcome Parent email exists and is published
- [ ] Trial Confirmation email exists and is published
- [ ] Trial Reminder SMS exists and is published
- [ ] No-show Recovery email exists and is published
- [ ] All workflows are configured and active
- [ ] Date verified documented
- [ ] All sign-offs completed

**Status:** 0/4 templates verified

---

## Related Resources

- **Validation Guide:** EMAIL-SMS-TEMPLATE-VALIDATION.md
- **Specifications:** GHL-WORKFLOW-TEMPLATES.md
- **Gap Analysis:** PIPELINE-GAP-ANALYSIS.md
- **GHL Console:** https://app.gohighlevel.com/settings/email-templates
