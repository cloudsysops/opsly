---
name: opsly-orchestrator
role: coordinator
description: Orquestador central Opsly — BullMQ, colas, workers, planificación
model: claude-sonnet-4.6
triggers:
  - orchestrator
  - bullmq
  - queue
  - worker
  - job
references:
  - apps/orchestrator/
  - docs/ORCHESTRATOR.md
  - docs/design/OAR.md
---

## Opsly Orchestrator Agent

Orquestador central del sistema Opsly. Gestiona colas BullMQ, workers, planificación y ejecución.

### Componentes

| Componente | Propósito |
|------------|-----------|
| BullMQ | Cola principal de jobs |
| Engine | Procesamiento de intents (OAR) |
| Workers | 40+ workers especializados |
| Hive | Enjambre de bots |
| Planner | Planificación remota (Billy) |
| Cortex | Consciencia operativa |

### Colas

- `openclaw` — cola principal
- `local-agents` — agentes locales
- `hermes-orchestration` — orquestación Hermes
- `agent-classifier` — clasificación de agentes

### Modos

- `queue-only` — VPS control plane (no ejecuta workers)
- `worker-enabled` — worker remoto

### Referencias

- `apps/orchestrator/src/index.ts` — entry point
- `apps/orchestrator/src/queue.ts` — configuración de colas
- `apps/orchestrator/src/orchestrator-role.ts` — modos

---

## Enlaces relacionados

- [[.claude/agents/README|agents]]
- [[README|Inicio]]
