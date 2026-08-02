---
status: proposed
owner: operations
last_review: 2026-08-02
type: adr
tags:
  - opsly/adr
  - opsly/agents
---

# ADR-048: Task store canónico para AgentTaskEnvelopeV1

## Estado

**Propuesto** (2026-08-02) — decisión de producto documentada; no migra datos ni cambia colas en runtime.

## Contexto

Opsly tiene varios planos de “tareas”:

| Plano | Ubicación | Rol hoy |
|---|---|---|
| Orchestrator `local-agents` | `apps/orchestrator` + BullMQ | Encola jobs `local_*` hacia bridges HTTP (5001–5011) |
| Orchestrator `openclaw` | misma app, otra cola | Jobs de plataforma (n8n, notify, sandbox, …) |
| Hermes | cola `hermes-orchestration` (ADR-015) | Tick / multi-agente / metering IA |
| `apps/task-orchestrator` | app separada | Tracking autónomo de workers (dominio distinto) |

El contrato nuevo **`AgentTaskEnvelopeV1`** (`packages/types`, `lib/agent-task-core`) alimenta el path CLI → `POST /api/local/prompt-submit` → cola **`local-agents`**.

Sin una decisión explícita, el riesgo es crear un **tercer** store (tabla nueva o app nueva) y duplicar orquestación.

## Decisión (recomendada)

1. **Canónico para AgentTaskEnvelopeV1:** cola BullMQ **`local-agents`** + estado Redis del Orchestrator (`JobState` / logs estructurados), con el envelope en `job.payload.agent_task` cuando se envía.
2. **No** usar Hermes ni `apps/task-orchestrator` como store primario de este envelope en la fase actual.
3. **No** crear tabla Supabase dedicada hasta que existan requisitos de auditoría multi-día, UI Mission Control, o SLA de retención que Redis TTL no cubra.
4. Si más adelante hace falta persistencia larga: **extender** el Orchestrator (migración + API admin) bajo el mismo `request_id` / `task_id` del envelope — no un segundo control plane.

## Alternativas rechazadas (por ahora)

| Opción | Por qué no |
|---|---|
| Hermes como store | Dominio distinto (tick/metering); acoplaría AgentTask a HERMES_ENABLED |
| `apps/task-orchestrator` | Segundo plano de ejecución; viola “un control plane” (ADR-011 / modularity) |
| Nueva app / tabla ya | Big-bang sin consumidores UI; capacity VPS limitada |

## Consecuencias

- CLI `agent:assign-task --enqueue` y clientes HTTP deben seguir el Orchestrator.
- Documentación (`AGENT-ROUTING.md`, audit reusable core) cita este ADR.
- Consolidar Hermes/`task-orchestrator` queda fuera de alcance de PR-CORE; requiere ADR de follow-up si se unifican.

## Enlaces

- [[ADR-011-event-driven-orchestrator]]
- [[ADR-015-hermes-orchestrator-architecture]]
- `docs/00-architecture/AGENT-ROUTING.md`
- `docs/audits/OPSLY-REUSABLE-CORE-AUDIT.md`
