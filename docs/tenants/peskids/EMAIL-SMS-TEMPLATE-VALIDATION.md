---
status: active
owner: operations
created: 2026-06-10
purpose: "Validate email/SMS templates exist in GHL and are configured correctly"
---

# Peskids Email & SMS Template Validation Guide

**Objective:** Verify all 4 required email/SMS templates exist in GoHighLevel and are properly configured.

**Time Estimate:** 15 minutes (GHL console navigation)

**Validation Method:** Manual verification in GHL Console (cannot be automated via API)

---

## Required Templates

### 1. Welcome Parent Email

| Property | Value |
|----------|-------|
| **Name** | Welcome Parent |
| **Type** | Email |
| **Trigger** | Contact Created (source = Peskids) |
| **Content** | Greeting + program overview + booking link |
| **Status** | Published |

**Checklist:**
- [ ] Template exists in GHL
- [ ] Has "Welcome" or "Introduction" in subject line
- [ ] Includes program benefits
- [ ] Includes trial class invitation
- [ ] Includes calendar booking link
- [ ] Template is published (not draft)

**Purpose:** First touch with parent after lead capture. Builds rapport and guides to booking.

---

### 2. Trial Confirmation Email

| Property | Value |
|----------|-------|
| **Name** | Trial Confirmation |
| **Type** | Email |
| **Trigger** | Appointment Scheduled in Peskids calendar |
| **Content** | Confirmation details + what to expect + logistics |
| **Status** | Published |

**Checklist:**
- [ ] Template exists in GHL
- [ ] Has "Confirmation" or "Scheduled" in subject line
- [ ] Includes appointment date/time
- [ ] Includes location/Zoom link
- [ ] Includes what to bring (if applicable)
- [ ] Includes cancellation policy
- [ ] Template is published

**Purpose:** Reduce no-shows by confirming appointment details and managing expectations.

---

### 3. Trial Reminder SMS

| Property | Value |
|----------|-------|
| **Name** | Trial Reminder |
| **Type** | SMS |
| **Trigger** | 24 hours before appointment |
| **Content** | Brief reminder + date/time + confirm attendance |
| **Status** | Published |

**Checklist:**
- [ ] Template exists in GHL
- [ ] SMS message is under 160 characters (if single segment)
- [ ] Includes appointment date and time
- [ ] Includes reply-to or confirmation method
- [ ] Template is published
- [ ] Trigger is set to 24 hours before event

**Purpose:** Last-minute reminder to reduce no-shows on day before trial.

---

### 4. No-show Recovery Email

| Property | Value |
|----------|-------|
| **Name** | No-show Recovery |
| **Type** | Email |
| **Trigger** | Status = "No Show" (manual or auto-detected) |
| **Content** | Empathy + reschedule offer + secondary booking link |
| **Status** | Published |

**Checklist:**
- [ ] Template exists in GHL
- [ ] Has "Sorry to miss you" or "Reschedule" in subject
- [ ] Expresses understanding (life happens)
- [ ] Offers to reschedule without penalty
- [ ] Includes new booking link
- [ ] Includes support contact info
- [ ] Template is published

**Purpose:** Win back leads who missed their trial. Second chance conversion.

---

## Validation Steps

### Step 1: Access GHL Console
1. Go to: https://app.gohighlevel.com
2. Log in with Peskids location credentials
3. Select "Peskids" location
4. Navigate to **Settings** → **Email Templates**

### Step 2: Check Each Template
For each of the 4 templates:
1. Search for template by name (use Ctrl+F to find)
2. Verify it exists
3. Click to open and check:
   - Subject line is appropriate
   - Content is complete (not partial/draft)
   - Status shows "Published"
   - Merge tags are correct

### Step 3: Verify Triggers (Workflows)
1. Navigate to **Automation** → **Workflows**
2. For each template, verify the trigger workflow exists:
   - **Welcome Parent** trigger: "Contact Created" from Peskids form
   - **Trial Confirmation** trigger: "Appointment Scheduled" in Peskids calendar
   - **Trial Reminder** trigger: "24 hours before appointment"
   - **No-show Recovery** trigger: "Contact Status = No Show"

### Step 4: Test (Optional but Recommended)
1. Create a test contact in Peskids
2. Verify Welcome email is triggered
3. Schedule a test appointment
4. Verify confirmation email is sent
5. Wait 24 hours or trigger reminder manually
6. Verify reminder SMS/email received

---

## Template Status Tracker

| # | Template Name | Exists? | Published? | Workflow Set? | Notes |
|---|---|---|---|---|---|
| 1 | Welcome Parent | ☐ YES ☐ NO | ☐ YES ☐ NO | ☐ YES ☐ NO | |
| 2 | Trial Confirmation | ☐ YES ☐ NO | ☐ YES ☐ NO | ☐ YES ☐ NO | |
| 3 | Trial Reminder | ☐ YES ☐ NO | ☐ YES ☐ NO | ☐ YES ☐ NO | |
| 4 | No-show Recovery | ☐ YES ☐ NO | ☐ YES ☐ NO | ☐ YES ☐ NO | |

---

## Common Issues & Troubleshooting

### Template Not Sending
**Symptom:** Template exists and is published, but email/SMS not received.

**Check:**
- [ ] Is the trigger workflow enabled? (Workflows → check "Active" toggle)
- [ ] Is the location ID correct in trigger configuration?
- [ ] Is the contact's email/phone populated?
- [ ] Is the contact in the right pipeline/tag?

**Fix:** Enable workflow, verify trigger conditions.

---

### Merge Tags Not Working
**Symptom:** Email says "{first_name}" instead of "John".

**Check:**
- [ ] Merge tags match GHL field names
- [ ] Contact has values in those fields
- [ ] Syntax is correct: `{field_name}`

**Fix:** Update merge tags in template to match GHL field names.

---

### SMS Too Long
**Symptom:** SMS is being split into multiple segments.

**Check:**
- [ ] Message length < 160 characters (for single segment)
- [ ] Remove unnecessary words
- [ ] Shorten URLs if possible

**Fix:** Trim SMS message or accept multi-segment cost.

---

## Sign-Off Template

**Validation Date:** _____________

**Validated By:** _____________

**All templates verified:** ☐ YES ☐ NO

**Missing templates:**
```
1. _________________________________
2. _________________________________
3. _________________________________
```

**Issues found:**
```
1. _________________________________
2. _________________________________
3. _________________________________
```

**Next steps:**
```
1. _________________________________
2. _________________________________
3. _________________________________
```

---

## Reference

**Related Documents:**
- `GHL-WORKFLOW-TEMPLATES.md` — Template specifications
- `PIPELINE-GAP-ANALYSIS.md` — Email/SMS status as PARTIAL
- `TONIGHT-MANUAL-TESTS.md` — How to test workflows manually

**GHL Resources:**
- Email Template Editor: https://app.gohighlevel.com/settings/email-templates
- SMS Templates: https://app.gohighlevel.com/settings/sms-templates
- Workflows: https://app.gohighlevel.com/workflows

---

## Status Summary

**Current State:** Validation in progress

**What's Known:**
- ✅ Template specs exist (GHL-WORKFLOW-TEMPLATES.md)
- ❓ Actual GHL implementation status unknown
- ❓ Workflows configured / not configured unknown

**What's Needed:**
1. Navigate to GHL Console
2. Check each of 4 templates
3. Verify workflows are enabled
4. Document findings in sign-off template
5. Create missing templates if needed (30 min)

**Blocker Status:** Manual validation required. Cannot be automated via API.

**Time to Complete:** 15 minutes (validation) + 30 minutes (if creating missing templates)
