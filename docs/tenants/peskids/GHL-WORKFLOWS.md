---
status: draft
owner: operations
last_review: 2026-06-04
tenant_slug: peskids
---

# Peskids — GHL Workflow Automations

> **Propósito:** Especificación de workflows de automatización en GHL para Peskids.
> **Implementación:** Estos workflows se configuran manualmente en la UI de GHL (Automation → Workflows).
> **Referencia:** Pipeline stages definidos en [GOHIGHLEVEL-CONTRACT.md](./GOHIGHLEVEL-CONTRACT.md).

## Trigger Map

| # | Workflow | Trigger | Action | Timing |
|---|----------|---------|--------|--------|
| 1 | Welcome Lead | `Contact.created` | Send email "Peskids — Welcome Parent" | Instant (+2 min delay) |
| 2 | Trial Confirmation | `Appointment.scheduled` | Send email "Trial Class Confirmation" | Instant (+1 min delay) |
| 3 | Trial Reminder | `Appointment.start - 24h` | Send SMS "Peskids — Trial Reminder" | 24h before |
| 4 | No-show Follow-up | `Appointment.status = no_show` | Send SMS + create task | 1h after |
| 5 | Lead Stale Alert | Cron diario (48h sin actividad) | Notify owner + create task | Diario |

## Pipeline de referencia

```
New Lead → Contacted → Trial Class → Enrolled → Active Student → Renewal
```

Los workflows 2 y 4 mueven contactos entre etapas de este pipeline.

---

## Workflow 1: Welcome Lead

**Trigger:** Contact Created  
**Condition:** Source != "Internal" (saltar health checks internos de Opsly)

**Actions:**

| Step | Acción | Detalle |
|------|--------|---------|
| 1 | Delay | 2 minutos (esperar a que el contacto esté fully created) |
| 2 | Send Email | Template: "Peskids — Welcome Parent" |
| 3 | Add Tag | `welcome_sent` |
| 4 | Update Pipeline Stage | Mover a "Contacted" |

**GHL Config:**
```
Location:   https://app.gohighlevel.com/v2/location/KJ5LawrO0e3hIerqtMRu/automation
Trigger:    Contact Created
Filters:    [source] [is not] [Internal]
```

**Email template reference:** "Peskids — Welcome Parent"
- Idioma: Español (Colombia)
- Mobile-responsive
- Incluye: program info, WhatsApp contact, next steps, link a reserva de trial

---

## Workflow 2: Trial Confirmation

**Trigger:** Appointment Scheduled  
**Condition:** Calendar name contains "Trial"

**Actions:**

| Step | Acción | Detalle |
|------|--------|---------|
| 1 | Delay | 1 minuto |
| 2 | Send Email | Template: "Peskids — Trial Class Confirmation" |
| 3 | Add Tag | `trial_confirmed` |
| 4 | Update Pipeline Stage | Mover a "Trial Class" |

**GHL Config:**
```
Trigger:    Appointment Scheduled
Filters:    [calendar name] [contains] [Trial]
```

**Email template reference:** "Peskids — Trial Class Confirmation"
- Idioma: Español (Colombia)
- Incluye: fecha, hora, dirección de la piscina, qué llevar (traje de baño, gorro, toalla, sandalias), número de contacto WhatsApp

---

## Workflow 3: Trial Reminder (SMS)

**Trigger:** Time-Based (Appointment start - 24 hours)  
**Condition:** Contact has appointment in "Trial Class" calendar

**Actions:**

| Step | Acción | Detalle |
|------|--------|---------|
| 1 | Send SMS | Template: "Peskids — Trial Reminder" |
| 2 | Add Tag | `trial_reminded` |

**GHL Config:**
```
Workflow Type: Time-Based
Wait Until:    24 hours before appointment
Target:        Contacts with appointments in "Trial Class" calendar
```

**SMS template reference:** "Peskids — Trial Reminder"
- Máximo 160 caracteres
- Contenido: recordatorio amigable con fecha, hora, dirección, y "responda CONFIRMAR o REAGENDAR"
- Ejemplo: "Hola {{contact.name}}, te recordamos tu clase de prueba en Peskids el {{appointment.date}} a las {{appointment.time}}. Lleva traje de baño y gorro. Responde CONFIRMAR o REAGENDAR."

---

## Workflow 4: No-show Follow-up

**Trigger:** Appointment Status Changed  
**Condition:** Status = "No Show", Calendar = "Trial Class"

**Actions:**

| Step | Acción | Detalle |
|------|--------|---------|
| 1 | Wait | 1 hora (para no saturar al contacto inmediatamente) |
| 2 | Send SMS | Texto: "Te esperábamos en tu clase de prueba. ¿Quieres reagendar? Responde SI o llámanos." |
| 3 | Create Task | "Follow up with {{contact.name}} — no-show trial" (prioridad alta, asignado al owner) |
| 4 | Update Pipeline Stage | Mover de vuelta a "Contacted" |

**GHL Config:**
```
Trigger:    Appointment Status Changed
Filters:    [status] [is] [no show]
            [calendar] [contains] [Trial]
```

**Task details:**
- Title: `No-show follow-up: {{contact.name}}`
- Priority: High
- Assignee: Owner (sierrasantiago90@gmail.com)
- Due: Same day

---

## Workflow 5: Lead Stale Alert

**Trigger:** Time-Based (recurring daily cron)  
**Condition:** Lead has no outbound activity in 48 hours AND has tag `welcome_sent` (was properly onboarded)

**Actions:**

| Step | Acción | Detalle |
|------|--------|---------|
| 1 | Check | Has tag `welcome_sent`? Si no, saltar (el lead pudo no completar onboarding) |
| 2 | Send Internal Notification | Email a sierrasantiago90@gmail.com |
| 3 | Create Task | "Stale lead follow-up: {{contact.name}}" (prioridad alta) |

**GHL Config:**
```
Workflow Type: Time-Based (recurring)
Frequency:     Daily at 08:00
Filters:       [last_activity_date] [is before] [48 hours ago]
               [stage] [is] [Contacted]
```

**Internal notification email:** Not a template — GHL permite notificaciones internas por email al owner del pipeline.

---

## Testing Instructions

### Prerequisites
1. All email/SMS templates created in GHL (Marketing → Email Templates, Conversations → Templates)
2. Pipeline stages configured (Opportunities → Pipelines)
3. Calendar "Trial Class" created and linked to pipeline

### Test each workflow

| # | Workflow | How to test | Expected result |
|---|----------|-------------|-----------------|
| 1 | Welcome Lead | Create a contact via API or form with source != Internal | Email sent within 2 min, tag `welcome_sent` added, contact moved to "Contacted" |
| 2 | Trial Confirmation | Schedule an appointment on "Trial Class" calendar | Email sent within 1 min, tag `trial_confirmed` added, pipeline moved to "Trial Class" |
| 3 | Trial Reminder | Schedule trial 24h+ in future | SMS received 24h before appointment |
| 4 | No-show Follow-up | Mark a trial appointment as "No Show" | SMS after 1h, task created, pipeline moved back to "Contacted" |
| 5 | Stale Alert | Create contact, add tag `welcome_sent`, wait 48h without activity | Email notification + task created |

### Verification script
```bash
# Run the operator verification script to validate GHL state
doppler run --project ops-intcloudsysops --config prd -- \
  npx tsx scripts/ghl-peskids-operator-run.ts
```

---

## Enlaces relacionados

- [GOHIGHLEVEL-CONTRACT.md](./GOHIGHLEVEL-CONTRACT.md) — Pipeline stages, webhook contract
- [WORKFLOWS.md](./WORKFLOWS.md) — n8n workflows (complemento operativo)
- [BLUEPRINT-MAPPING.md](./BLUEPRINT-MAPPING.md) — Approval-first AI policy
- [GHL-CONSULTING-HANDOFF.md](./GHL-CONSULTING-HANDOFF.md) — GHL vs Opsly ownership split
- [scripts/ghl-apply-workflows.sh](../../scripts/ghl-apply-workflows.sh) — Setup helper script
