---
status: draft
owner: product
last_review: 2026-05-18
tenant_slug: peskids
---

# Peskids — modelo de datos (borrador)

> **Estado:** diseño lógico para MVP y futuro `peskids-platform`. No implica migración Supabase aplicada en Opsly.

## Principios

- IDs UUID o ULID en producto futuro.
- `tenant_slug` fijo `peskids` en integraciones Opsly.
- Timestamps UTC; soft-delete opcional en entidades sensibles.
- PII mínima; retención acordada con owner.

## Entidades

### `leads`

| Campo | Tipo | Notas |
|-------|------|--------|
| id | uuid | PK |
| source | text | web, referral, event, manual |
| status | enum | new, contacted, qualified, lost, converted |
| full_name | text | |
| email | text | nullable |
| phone | text | nullable |
| notes | text | |
| owner_user_id | uuid | nullable — equipo interno |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `parents`

| Campo | Tipo | Notas |
|-------|------|--------|
| id | uuid | PK |
| full_name | text | |
| email | text | |
| phone | text | |
| preferred_channel | enum | email, phone, whatsapp_future |
| created_at | timestamptz | |

### `students`

| Campo | Tipo | Notas |
|-------|------|--------|
| id | uuid | PK |
| full_name | text | |
| parent_id | uuid | FK → parents |
| grade_or_level | text | nullable |
| status | enum | active, inactive, alumni |
| created_at | timestamptz | |

### `teachers`

| Campo | Tipo | Notas |
|-------|------|--------|
| id | uuid | PK |
| full_name | text | |
| email | text | |
| subjects | text[] | nullable |
| active | boolean | default true |

### `classes`

| Campo | Tipo | Notas |
|-------|------|--------|
| id | uuid | PK |
| name | text | |
| teacher_id | uuid | FK → teachers |
| schedule | text | nullable — o JSON en v2 |
| student_ids | uuid[] | o tabla puente `class_enrollments` |
| term | text | nullable |

### `class_enrollments` (alternativa normalizada)

| Campo | Tipo |
|-------|------|
| class_id | uuid |
| student_id | uuid |
| enrolled_at | timestamptz |

### `feedback`

| Campo | Tipo | Notas |
|-------|------|--------|
| id | uuid | PK |
| author_type | enum | parent, teacher, staff |
| author_ref_id | uuid | nullable — parent_id o teacher_id |
| subject_type | enum | general, class, student, operations |
| subject_ref_id | uuid | nullable |
| body | text | |
| rating | smallint | nullable 1–5 |
| status | enum | new, reviewed, action_required, closed |
| ai_summary | text | nullable — solo sugerencia |
| created_at | timestamptz | |

### `followups`

| Campo | Tipo | Notas |
|-------|------|--------|
| id | uuid | PK |
| related_type | enum | lead, parent, student, feedback |
| related_id | uuid | |
| title | text | |
| due_at | timestamptz | |
| status | enum | pending, done, snoozed, cancelled |
| assigned_to | text | email o user id |
| notes | text | |
| created_at | timestamptz | |

### `messages` (futuro — sin auto-send en MVP)

| Campo | Tipo | Notas |
|-------|------|--------|
| id | uuid | |
| channel | enum | email, whatsapp_future, internal |
| direction | enum | inbound, outbound |
| body | text | |
| approval_status | enum | draft, approved, sent, rejected |
| approved_by | text | nullable |
| sent_at | timestamptz | nullable |
| thread_id | text | nullable |

### `content_ideas`

| Campo | Tipo | Notas |
|-------|------|--------|
| id | uuid | |
| title | text | |
| body_draft | text | |
| source | text | meeting, class, ops |
| ai_suggested_copy | text | nullable |
| publish_status | enum | idea, draft, approved, published |
| created_at | timestamptz | |

### `payments` (opcional / futuro)

| Campo | Tipo | Notas |
|-------|------|--------|
| id | uuid | |
| student_id | uuid | nullable |
| amount_cents | integer | |
| currency | text | default USD |
| status | enum | pending, paid, failed, refunded |
| provider_ref | text | Stripe u otro — fuera de MVP |

## Relaciones (resumen)

```
leads (standalone hasta conversión)
parents 1—* students
teachers 1—* classes *—* students (enrollments)
feedback → polymorphic subject
followups → polymorphic related
messages → approval workflow
content_ideas → editorial workflow
```

## Mapeo CRM Opsly (n8n) → modelo

| Workflow CRM Opsly | Entidad principal |
|------------------|-------------------|
| Lead capture | `leads` |
| Hot lead alert | `leads` (status) |
| Follow-up reminder | `followups` |
| Daily digest | agregación sobre `leads` + `followups` |

## Eventos hacia Opsly (extracción)

Ver [EXTRACTION-PLAN.md](./EXTRACTION-PLAN.md): payloads deben incluir `tenant_slug`, `event`, `occurred_at`, `payload` (sin secretos).

## RLS (futuro Supabase)

- Owner/staff: acceso tenant-scoped.
- Padres: solo sus `students` y `feedback` propios.
- Docentes: solo sus `classes` y feedback de clase.
- Service role: solo backend; nunca en cliente.
