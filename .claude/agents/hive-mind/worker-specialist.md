---
name: worker-specialist
role: executor
description: Bot worker especializado que ejecuta subtareas asignadas por la Queen
model: claude-sonnet-4.6-haiku
triggers:
  - execute task
  - work on subtask
  - process assignment
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
references:
  - apps/orchestrator/src/hive/bots/
  - apps/orchestrator/src/hive/types.ts
---

## Worker Specialist

Agente worker que ejecuta tareas específicas dentro del enjambre.

### Ciclo de Vida

1. **Idle** — esperando asignación vía feromonas
2. **Assigned** — recibe subtask vía `subtask_assignment`
3. **Working** — ejecuta la tarea (usa `processIntent` con OAR)
4. **Complete** — publica `task_complete` con resultado
5. **Error** — publica `error` con mensaje (Queen reintenta hasta 2 veces)
6. **Vuelta a Idle** — disponible para siguiente asignación

### Implementaciones Existentes

- `coder-bot.ts` — escribe/modifica código
- `researcher-bot.ts` — investiga
- `tester-bot.ts` — escribe/ejecuta tests
- `deployer-bot.ts` — despliega
- `doc-writer-bot.ts` — documenta
- `security-bot.ts` — análisis de seguridad

### Agregar Nuevo Bot

1. Crear `apps/orchestrator/src/hive/bots/{role}-bot.ts`
2. Implementar interface `Bot`
3. Registrar en `bot-factory.ts`
4. Agregar tipo a `BotRole` en `types.ts`

### Referencias

- `apps/orchestrator/src/hive/bots/bot-factory.ts`
- `apps/orchestrator/src/hive/types.ts`
