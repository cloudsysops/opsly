---
status: draft
owner: operations
last_review: 2026-09-07
type: tenant
tags:
  - opsly/tenant
  - opsly/ai-board
---

# Peskids — AI Board integration

AI Board is a **governance role**, not a new decision engine.

Canonical path:

```
Peskids → Domain Event → Signal → AI Board → Mission Control Job
  → Orchestrator → n8n / Agent / Worker → Evidence → AI Board → Outcome
```

| Owner | Responsibility |
| --- | --- |
| Peskids | Business UX and business state |
| Postgres / Supabase | Source of truth |
| n8n | Deterministic workflows (flag-gated, default off) |
| AI agents | Classify, summarize, propose |
| Mission Control | Durable jobs, priority, execution state |
| Orchestrator | Dispatch (`POST /events`) |
| AI Board | Signals, automation level, flag policy |
| PC gamer | Optional compute only |

Peskids availability **must not** depend on PC gamer, Ollama, n8n, an LLM, or Mission Control. Lead insert in `postPublicPeskidsLead` returns 201 before any of those run.

## Mapping (this repo)

- Library: `lib/ai-board` (`@intcloudsysops/ai-board`)
- Receiver: Orchestrator `POST /events` and `POST /internal/board/signals`
- Producer: `apps/api/lib/peskids/board-signal.ts` (fire-and-forget, 2s timeout)
- Policy reused: `evaluateAgentTaskPolicy` in `@intcloudsysops/agent-task-core` (not duplicated)
- Durable store: existing BullMQ `openclaw` jobs (`type: notify`) with `idempotency_key`

Do **not** add Hermes, Hive, or a second orchestrator for this path.

## Automation level

Peskids support cap is **LEVEL 2**: prepare context, template, and WhatsApp draft. Human presses **SEND**.

LEVEL 4 (external customer send) is never auto-promoted. Flag `PESKIDS_WHATSAPP_AUTO_SEND_ENABLED` stays **off**.

## First milestone

1. Real lead → persist → classify (has phone = hot) → event → `HOT_LEAD_CREATED` → `SEND_ENROLLMENT_LINK` P1 → staff **SEND ENROLLMENT LINK**
2. `HOT_LEAD_UNATTENDED` (overdue follow-up + hot) → same job type, distinct idempotency key
3. Canonical journey after that: enrollment form → first class reminder (prepare only) → attendance → teacher feedback → family progress

Same condition never creates a second BullMQ job (`idempotency_key`).

Trial-class events are **not** mapped. See [`CANONICAL-CUSTOMER-JOURNEY.md`](./CANONICAL-CUSTOMER-JOURNEY.md).

## Signals

IDs only after PII strip: `HOT_LEAD_CREATED`, `HOT_LEAD_UNATTENDED`, `ENROLLMENT_INCOMPLETE`, `ENROLLMENT_SUBMITTED`, `FIRST_CLASS_SCHEDULED`, `CLASS_REMINDER_DUE`, `CLASS_ATTENDED`, `CLASS_ABSENT`, `STUDENT_PROGRESS_UPDATED`, `FAMILY_FEEDBACK_RECEIVED`, `FAMILY_CONTACT_REQUESTED`, `FOLLOWUP_OVERDUE`, `LEAD_NO_RESPONSE`, `AUTOMATION_FAILED`, `WHATSAPP_DRAFT_READY`.

## Feature flags

Catalog: `config/ai-board/peskids-flag-registry.json` and `PESKIDS_FLAG_REGISTRY` in `lib/ai-board`. Every flag has owner, environment, risk, state, staging evidence, activation timestamp, metrics, rollback switch.

AI Board may recommend activation. Customer-facing automatic sends need explicit policy. Never enable multiple unproven customer workflows at once.

## Observability

Metric names: `AI_BOARD_METRICS` in `lib/ai-board`. Board uses them for later prioritization. It must not silently change commercial truth or customer-facing policy.

## Resilience

| Dependency down | Behavior |
| --- | --- |
| LLM | Deterministic templates / skip brief |
| n8n | Lead persisted; automation queued or skipped |
| PC gamer | Job stays in queue or notify no-ops |
| WhatsApp | Draft retained |
| Mission Control / Redis | Event ingest returns `deferred`; lead already saved |

## Support UX target

Open Peskids → prioritized work → open lead → summary + recommended action + WhatsApp draft → **SEND**. Composer remains approval-first (`docs/tenants/peskids/AI-APPROVAL-POLICY.md`).

## Enlaces relacionados

- [[tenants/peskids/CANONICAL-CUSTOMER-JOURNEY|Canonical customer journey]]
- [[tenants/peskids/AI-APPROVAL-POLICY|AI approval policy]]
- [[tenants/peskids/EVENT-CONTRACT|Event contract]]
- [[00-architecture/OPSLY-MOON|Opsly Moon]]
