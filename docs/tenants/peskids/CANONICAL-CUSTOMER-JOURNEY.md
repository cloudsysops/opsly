---
status: canon
owner: product
last_review: 2026-09-07
type: tenant
tags:
  - opsly/tenant
  - opsly/peskids
---

# Peskids — canonical customer journey

Peskids **does not** use trial class as a business stage.

Do not add or restore:

- `trial.scheduled`
- `trial.reminder`
- `trial.completed`
- `post_trial_followup`

Leftover `trial_classes` rows and `trial.*` emitters are **not** product truth. AI Board ignores them. The table and `trial-class.service` remain temporarily for operational history. Do not delete them in this slice.

## CANONICAL

```
LEAD → ENROLLMENT → FIRST CLASS → ATTENDANCE → TEACHER FEEDBACK
→ STUDENT PROGRESS → FAMILY FEEDBACK → CONTINUITY
```

## LEGACY

`trial_classes`, `trial-scheduler.service`, `trial-classes-panel`, and admin status `trial` remain for compatibility. Live status `trial` means **enrollment / first class in progress**, not a trial-class product stage.

## Staff UX

Context already prepared + one decision + one WhatsApp button.

WhatsApp stays **LEVEL 2** (prepare draft). Do not auto-send until separately approved.

## Lead → enrollment

Sources: Instagram, Website, WhatsApp, QR, Referral, Ads.

Preserve: `source`, `campaign`, `interest`, location/unit, contact history, `request_id`, `created_at`.

Primary next action: **COMPLETE ENROLLMENT FORM**.

Staff: Lead → review context → **[ SEND ENROLLMENT LINK ]**.

AI Board: `lead.created` (hot / has phone) → `SEND_ENROLLMENT_LINK` P1 LEVEL 2, `execute_external=false`.

## Implementation status (do not over-claim)

| Step | Status | What exists |
| --- | --- | --- |
| Real lead persist + `lead.created` | IMPLEMENTED | Public intake + fire-and-forget board event |
| `SEND_ENROLLMENT_LINK` job | IMPLEMENTED | AI Board + orchestrator ingest, prepare-only |
| Staff WhatsApp enrollment copy | IMPLEMENTED | Support templates; wa.me still human SEND |
| Secure enrollment form schema | CONTRACT_ONLY | `enrollment-form.schema.ts` not the live public form |
| Form submit → Family + Student + Enrollment + lead attribution | PARTIAL | Existing lead conversion / portal enroll; new schema not wired |
| `first_class.scheduled` + reminder draft | CONTRACT_ONLY | AI Board mapping exists; leftover trial scheduler is not canonical |
| Attendance PRESENT / ABSENT / EXCUSED | PARTIAL | Existing class attendance API; new events catalogued |
| Teacher structured feedback | CONTRACT_ONLY | `journey-feedback.schema.ts` |
| Longitudinal progress (family-visible vs internal) | CONTRACT_ONLY | Append-only helper in schema only |
| Family feedback | PARTIAL | Existing parent feedback; new schema not wired |
| Continuity next action | CONTRACT_ONLY | Template family + followup events |
| Timeline 360 full journey | PARTIAL | Live 360: lead created + followups + Twenty. Canonical event names exist; enrollment/class/feedback rows are not persisted on that timeline yet |

`enrollment.link.sent` is compatibility for a prepared staff send. It is **not** `whatsapp.sent_confirmed`.

Opening WhatsApp records `whatsapp.opened`, never `whatsapp.sent`.

## WhatsApp template families

`NEW_LEAD`, `ENROLLMENT_LINK`, `ENROLLMENT_INCOMPLETE`, `ENROLLMENT_CONFIRMED`, `FIRST_CLASS_REMINDER`, `CLASS_REMINDER`, `ABSENCE_FOLLOWUP`, `TEACHER_FEEDBACK_PENDING`, `PROGRESS_AVAILABLE`, `FAMILY_FEEDBACK_REQUEST`, `FAMILY_CONTACT_REQUEST`, `CONTINUITY_FOLLOWUP`.

No trial-specific templates.

## Golden flow contract

`lib/ai-board/src/peskids-journey.ts` is the journey contract. Only the lead → enrollment-link job path is production-wired today.

## Enlaces relacionados

- [[tenants/peskids/AI-BOARD-INTEGRATION|AI Board integration]]
- [[tenants/peskids/EVENT-CONTRACT|Event contract]]
- [[tenants/peskids/AI-APPROVAL-POLICY|AI approval policy]]
