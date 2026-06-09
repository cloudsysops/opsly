---
status: draft
owner: operations
last_review: 2026-06-04
tenant_slug: peskids
---

# Peskids — GHL Workflow Templates (UI Reference)

> **Nota:** GHL no expone exportación nativa de workflows como JSON descargable.
> Este documento sirve como referencia visual/estructural para crear cada workflow en la UI de GHL.

## 1. Welcome Lead

### GHL UI Navigation
1. Ir a **Automation → Workflows**
2. Click **"New Workflow"** → **"Start from Scratch"**
3. Trigger: **"Contact Created"**
4. Filter: `[Source] [is not] [Internal]`

### Steps (drag & drop)

```
[Trigger: Contact Created]
    │
    ▼
[Filter: Source is not Internal]
    │
    ▼
[Delay: 2 minutes]
    │
    ▼
[Send Email: Peskids — Welcome Parent]
    │
    ▼
[Add Tag: welcome_sent]
    │
    ▼
[Update Pipeline Stage: Contacted]
```

### Screenshot description
The workflow canvas should show a linear pipeline: Trigger at the top, filter below, then a vertical sequence of action nodes connected by arrows.

---

## 2. Trial Confirmation

### GHL UI Navigation
1. **Automation → Workflows → New Workflow**
2. Trigger: **"Appointment Scheduled"**

### Steps (drag & drop)

```
[Trigger: Appointment Scheduled]
    │
    ▼
[Filter: Calendar Name contains "Trial"]
    │
    ▼
[Delay: 1 minute]
    │
    ▼
[Send Email: Peskids — Trial Class Confirmation]
    │
    ▼
[Add Tag: trial_confirmed]
    │
    ▼
[Update Pipeline Stage: Trial Class]
```

### Notes
- The calendar must be named exactly "Trial Class" (or contain "Trial" to match the filter).
- If multiple trial calendars exist, use a more specific filter like `[calendar name] [is exactly] [Trial Class]`.

---

## 3. Trial Reminder (SMS)

### GHL UI Navigation
1. **Automation → Workflows → New Workflow**
2. Workflow type: **"Time-Based"** (not "Contact Created")

### Steps (drag & drop)

```
[Trigger: Time-Based]
    │
    ▼
[Wait Until: 24 hours before appointment]
    │
    ▼
[Condition: Has appointment in calendar "Trial Class"]
    │
    ▼
[Send SMS: Peskids — Trial Reminder]
    │
    ▼
[Add Tag: trial_reminded]
```

### Notes
- Time-Based workflows in GHL require setting a start time relative to a date/time field on the contact or appointment.
- Use `Appointment Start Date` as the anchor field, offset by -24 hours.
- This workflow will fire for any contact with an upcoming trial appointment.

---

## 4. No-show Follow-up

### GHL UI Navigation
1. **Automation → Workflows → New Workflow**
2. Trigger: **"Appointment Status Changed"**

### Steps (drag & drop)

```
[Trigger: Appointment Status Changed]
    │
    ▼
[Filter: Status is "No Show"]
    │
    ▼
[Filter: Calendar contains "Trial"]
    │
    ▼
[Wait: 1 hour]
    │
    ▼
[Send SMS: Custom text — "Te esperábamos en tu clase de prueba..."]
    │
    ▼
[Create Task: High priority, assign to owner]
    │
    ▼
[Update Pipeline Stage: Contacted]
```

### Custom SMS text
```
Hola {{contact.name}}, te esperábamos en tu clase de prueba en Peskids. ¿Quieres reagendar? Responde SI o contáctanos al {{location.phone}}.
```

---

## 5. Lead Stale Alert

### GHL UI Navigation
1. **Automation → Workflows → New Workflow**
2. Workflow type: **"Time-Based (Recurring)"**
3. Schedule: **Daily at 08:00**

### Steps (drag & drop)

```
[Trigger: Time-Based (Daily at 08:00)]
    │
    ▼
[Filter: Last Activity Date is before 48 hours ago]
    │
    ▼
[Filter: Stage is "Contacted"]
    │
    ▼
[Condition: Has tag "welcome_sent"]
    │
    ▼
[Send Internal Notification: Email to sierrasantiago90@gmail.com]
    │
    ▼
[Create Task: High priority — "Follow up with stale lead"]
```

### Notes
- GHL Internal Notifications is a built-in feature under "Actions" → "Internal Notification".
- The owner email must be registered in the GHL sub-account as a user.

---

## Testing checklist

### Pre-flight
- [ ] 5 workflows created in GHL UI with correct triggers
- [ ] Filters set correctly to avoid firing on internal/test contacts
- [ ] Email templates rendering correctly (mobile preview)
- [ ] SMS template under 160 characters

### Smoke test
- [ ] **Workflow 1:** Create contact via API → verify `welcome_sent` tag within 5 min
- [ ] **Workflow 2:** Schedule trial appointment → verify `trial_confirmed` tag
- [ ] **Workflow 3:** Schedule trial 24h+ out → verify SMS received at correct time
- [ ] **Workflow 4:** Mark trial as no-show → verify SMS + task within 90 min
- [ ] **Workflow 5:** Create contact with `welcome_sent` → wait 48h → verify notification

### Rollback
- Each workflow can be paused from GHL Automation → Workflows → toggle off
- Tags can be bulk-removed from Contacts → Manage Tags
- Email/SMS templates can be edited without affecting running workflows (next send uses new content)

---

## Enlaces relacionados

- [GHL-WORKFLOWS.md](./GHL-WORKFLOWS.md) — Full workflow specifications
- [GOHIGHLEVEL-CONTRACT.md](./GOHIGHLEVEL-CONTRACT.md) — Pipeline stages, webhooks
- [scripts/ghl-apply-workflows.sh](../../scripts/ghl-apply-workflows.sh) — Setup helper script
- [GHL-CONSULTING-HANDOFF.md](./GHL-CONSULTING-HANDOFF.md) — GHL vs Opsly ownership
