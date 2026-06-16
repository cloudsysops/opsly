# PESKIDS — GO-LIVE CHECKLIST

**Status:** ⏳ In Progress  
**Target:** 2026-06-16 (MAÑANA)  
**Owner:** sierrasantiago90@gmail.com

---

## CRITICAL PATH (Complete in order)

### FASE 1: VPS DEPLOYMENT (30 min) — **DO TODAY**

- [ ] **Execute deploy fix on VPS**
  ```bash
  bash scripts/peskids-auto-fix-deploy.sh
  ```
  **What it does:** Clears Docker cache, retries image pull with backoff, validates health check
  **Success criteria:** HTTP 200 on https://peskids.op-sly.com
  **Time:** 5-10 min
  **Escalation:** If fails, run `peskids-deploy-vps-diagnose.sh`

- [ ] **Verify website responds**
  ```bash
  curl -I https://peskids.op-sly.com/api/health
  # Should return: HTTP/1.1 200 OK
  ```
  **Success:** 200 OK
  **Time:** 1 min

---

### FASE 2: GHL CONFIGURATION (45 min) — **DO TODAY (3pm)**

**Prerequisites:** Login to https://app.gohighlevel.com  
**Location ID:** KJ5LawrOOe3hIerqtMRu

#### 2.1 Create Form

- [ ] **Form: "Peskids Lead Capture"**
  - URL: https://app.gohighlevel.com/v2/location/KJ5LawrOOe3hIerqtMRu/funnels-websites/funnels
  - Fields (in order):
    - [ ] Parent Name (required)
    - [ ] Phone (required, phone format)
    - [ ] Email (required, email format)
    - [ ] Child Name (required)
    - [ ] Child Age (required, number)
    - [ ] Preferred Schedule (dropdown: Morning/Afternoon/Evening)
    - [ ] Message (optional, text area)
    - [ ] Submit button
  - Redirect after submit: https://peskids.op-sly.com/familias/thank-you
  - **Success criteria:** Form saves without errors
  - **Time:** 15 min
  - **Screenshot:** Before + After

#### 2.2 Create Email Templates

- [ ] **Email 1: "Peskids — Trial Confirmation"**
  - URL: https://app.gohighlevel.com/v2/location/KJ5LawrOOe3hIerqtMRu/marketing/emails/templates
  - Subject: `¡Confirmamos tu clase de prueba!`
  - Body:
    ```
    Hola {{parent_name}},
    
    Gracias por tu interés en Peskids.
    
    Tu clase de prueba está confirmada para:
    📅 {{trial_date}}
    🕐 {{trial_time}}
    👤 Instructor: {{instructor_name}}
    
    Recibirás un recordatorio 24h antes.
    
    ¿Preguntas? Responde este email.
    
    Peskids Team
    ```
  - **Success:** Template saves
  - **Time:** 10 min

- [ ] **Email 2: "Peskids — Enrollment Welcome"**
  - Subject: `¡Bienvenida a Peskids!`
  - Body:
    ```
    Hola {{parent_name}},
    
    ¡Excelente! Hemos registrado a {{child_name}} en Peskids.
    
    📅 Primer clase: {{first_class_date}} a las {{first_class_time}}
    📍 Ubicación: [Tu ubicación]
    💳 Plan: [Plan seleccionado]
    
    [Payment link or invoice]
    
    ¿Preguntas? Contáctanos.
    
    Peskids Team
    ```
  - **Success:** Template saves
  - **Time:** 10 min

#### 2.3 Create SMS Templates

- [ ] **SMS: "Peskids — Trial Reminder"**
  - URL: https://app.gohighlevel.com/v2/location/KJ5LawrOOe3hIerqtMRu/settings/templates/sms
  - Message:
    ```
    Hola {{parent_name}}, recordatorio: Tu clase de prueba con {{instructor_name}} es HOY a las {{trial_time}}. ¡Nos vemos!
    ```
  - **Success:** Template saves
  - **Time:** 5 min

---

### FASE 3: WORKFLOWS (30 min) — **DO TODAY (4pm)**

**Location:** https://app.gohighlevel.com/v2/location/KJ5LawrOOe3hIerqtMRu/automations/workflows

#### 3.1 Workflow: Lead Created

- [ ] **Name:** "Peskids — Lead Intake"
- [ ] **Trigger:** Form Submitted / "Peskids Lead Capture"
- [ ] **Actions:**
  1. Create Contact (if doesn't exist)
  2. Apply Tag: "lead-web"
  3. Create Opportunity → Pipeline: "Peskids Enrollment" → Stage: "New Lead"
  4. Send Email: "Peskids — Trial Confirmation"
  5. Send SMS: "Thanks for submitting! We'll contact you soon."
- [ ] **Status:** PUBLISH
- [ ] **Screenshot:** Workflow diagram
- **Time:** 10 min

#### 3.2 Workflow: Trial Scheduled

- [ ] **Name:** "Peskids — Trial Reminder"
- [ ] **Trigger:** Appointment Booked / "Peskids Trial Class"
- [ ] **Actions:**
  1. Apply Tag: "trial-booked"
  2. Wait: 24 hours before appointment
  3. Send SMS: "Peskids — Trial Reminder"
- [ ] **Status:** PUBLISH
- **Time:** 8 min

#### 3.3 Workflow: Trial Completed

- [ ] **Name:** "Peskids — Trial Complete Follow-up"
- [ ] **Trigger:** Opportunity Stage = "Trial Completed"
- [ ] **Actions:**
  1. Apply Tag: "trial-completed"
  2. Send Email: "Peskids — Enrollment Welcome"
  3. Move to Stage: "Enrollment Offer"
- [ ] **Status:** PUBLISH
- **Time:** 8 min

#### 3.4 Workflow: Re-engagement

- [ ] **Name:** "Peskids — Re-engagement"
- [ ] **Trigger:** Tag Applied = "inactive" OR No Activity 7 Days
- [ ] **Actions:**
  1. Send SMS: "¡Te extrañamos {{parent_name}}! ¿Cuándo volvemos? [Link to book]"
- [ ] **Status:** PUBLISH
- **Time:** 4 min

---

### FASE 4: VALIDATION & TESTING (30 min) — **DO TODAY (5pm)**

#### 4.1 Manual Form Test

- [ ] **Access:** https://peskids.op-sly.com/familias
- [ ] **Submit test form** with dummy data:
  - Name: "Test Parent"
  - Phone: "+573001234567"
  - Email: "test@example.com"
  - Child: "Test Child", Age 8, Afternoon
- [ ] **Verify:**
  - [ ] Form submits without error
  - [ ] Redirect to thank-you page
  - [ ] Lead appears in GHL within 2 min
  - [ ] Email sent automatically
  - [ ] SMS sent automatically
- **Screenshot:** Before + After
- **Time:** 10 min

#### 4.2 Dashboard Test

- [ ] **Access:** https://peskids.op-sly.com/admin/login
- [ ] **Login** (credentials from Doppler)
- [ ] **Verify:**
  - [ ] Test lead appears in dashboard
  - [ ] Can change status
  - [ ] Can schedule class
  - [ ] Calendar shows availability
- **Screenshot:** Dashboard with test lead
- **Time:** 10 min

#### 4.3 End-to-End Flow Test

```bash
./scripts/peskids-e2e-full-flow.sh --live
```

- [ ] Test passes all 5 checks
- [ ] Output shows:
  - ✅ API Health: OK
  - ✅ Lead Form: Working
  - ✅ GHL Integration: Connected
  - ✅ n8n Webhook: Responded
  - ✅ Dashboard: Accessible

**Time:** 5 min

#### 4.4 Smoke Tests

```bash
./scripts/test-peskids-operations-e2e.sh
./scripts/smoke-peskids-n8n-lead-intake.sh
./scripts/smoke-peskids-auth-surfaces.sh
```

- [ ] All tests pass
- **Time:** 5 min

---

## POST GO-LIVE (After 4.4)

### FASE 5: OPERADOR TRAINING (30 min) — **DO TOMORROW**

- [ ] **Operador reads:** `docs/tenants/peskids/OPERATOR-DAILY-RUNBOOK.md`
- [ ] **Operador trained on:**
  - [ ] How to contact leads
  - [ ] How to schedule classes
  - [ ] How to mark attendance
  - [ ] How to create new enrollments
  - [ ] Emergency contacts
- [ ] **Operador does first 5 test actions** (supervised)
- **Time:** 30 min
- **Owner:** sierrasantiago90@gmail.com

### FASE 6: PUBLISH WEBSITE (5 min)

- [ ] **Update website status** from "beta" to "live"
- [ ] **Send announcement** to parent groups
- [ ] **Monitor metrics** first 24h

---

## SUCCESS CRITERIA

| Criterion | Status | Owner |
|-----------|--------|-------|
| VPS deployment working | ❓ | Opsly |
| GHL form accepts leads | ❓ | You (Peskids) |
| Workflows send emails/SMS | ❓ | You (Peskids) |
| Dashboard accessible | ❓ | Opsly |
| E2E test passes | ❓ | You (Peskids) |
| Operador trained | ❓ | You (Peskids) |
| **READY FOR CLIENTS** | ❓ | Both |

---

## TIMELINE

| Phase | Duration | Start | Deadline |
|-------|----------|-------|----------|
| 1. VPS Deploy | 30 min | NOW | TODAY 2pm |
| 2. GHL Config | 45 min | 2pm | TODAY 3:45pm |
| 3. Workflows | 30 min | 3:45pm | TODAY 4:15pm |
| 4. Validation | 30 min | 4:15pm | TODAY 5pm |
| 5. Training | 30 min | TOMORROW 9am | TOMORROW 9:30am |
| **GO LIVE** | — | TOMORROW 10am | ✅ |

---

## IF SOMETHING BREAKS

**Deploy fails?**
```bash
./scripts/peskids-deploy-vps-diagnose.sh
# → Follow specific fix recommendation
```

**Form not working in GHL?**
- Check that all fields are required/optional correctly
- Refresh page and try again
- If still fails → Slack `@opsly-support`

**Email/SMS not sending?**
- Verify GHL has valid SMTP credentials
- Check template syntax ({{variable}} format)
- Check that workflow is PUBLISHED (not draft)

**Lead not appearing?**
- Check n8n logs: https://n8n-peskids.op-sly.com
- Verify webhook URL in form settings
- Check GHL API token is valid

**Need help?**
→ Slack: `#peskids-support`  
→ Email: `support@intcloudsysops.com`  
→ Call: [Escalation phone]

---

## SIGN-OFF

```
Completed by: ___________________
Date: ___________________
Verified by: ___________________
Go-live approved: ___________________
```

---

**GOOD LUCK! 🚀 You're almost there!**
