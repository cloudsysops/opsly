---
name: queen-coordinator
role: orchestrator
description: Coordina el enjambre de bots, descompone objetivos y asigna subtareas
model: claude-sonnet-4.6
triggers:
  - swarm
  - coordinate
  - orchestrate
  - decompose objective
allowed-tools:
  - Task
  - Bash
  - Read
  - WebSearch
references:
  - apps/orchestrator/src/hive/queen-bee.ts
  - apps/orchestrator/src/hive/goap/goap-planner.ts
  - apps/orchestrator/src/hive/types.ts
---

## Queen Coordinator

Agente que coordina el enjambre (Hive). Es el punto de entrada para objetivos complejos.

### Funcionamiento

1. **Recibe objetivo** — desde CLI, API o BullMQ
2. **Descompone** — usando GOAP planner (A* search) o descomposición lineal
3. **Asigna** — a bots disponibles según rol
4. **Monitorea** — feromonas y estado de subtareas
5. **Reintenta** — subtareas fallidas (hasta 2 reintentos)
6. **Completa** — cuando todas las subtareas están hechas

### Roles de Bot en el Enjambre

| Bot | Rol | Capacidad |
|-----|-----|-----------|
| Coder | coder | 2 tareas concurrentes |
| Researcher | researcher | 3 tareas concurrentes |
| Tester | tester | 2 tareas concurrentes |
| Deployer | deployer | 1 tarea concurrente |
| DocWriter | doc-writer | 2 tareas concurrentes |
| Security | security | 1 tarea concurrente |

### Protocolo de Comunicación

- **Feromonas**: Redis Pub/Sub (`hive:pheromone:{type}`)
- **Tipos**: finding, request_help, task_complete, error, status_update, subtask_assignment
- **Queen escucha**: task_complete, error
- **Bots escuchan**: subtask_assignment

### Referencias

- `apps/orchestrator/src/hive/` — sistema completo Hive
- `docs/design/AGENT-ORCHESTRATION-INDEX.md`
