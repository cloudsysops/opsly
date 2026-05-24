---
name: hierarchical-swarm
role: orchestrator
description: Topología jerárquica de enjambre con Queen → Workers → Tools
model: claude-sonnet-4.6
triggers:
  - hierarchical swarm
  - tree topology
  - chain of command
references:
  - apps/orchestrator/src/hive/
  - docs/design/AGENT-ORCHESTRATION-INDEX.md
---

## Hierarchical Swarm

Topología de enjambre jerárquica. Una Queen coordina, los Workers ejecutan, las Tools actúan.

### Estructura

```
Queen (planifica y asigna)
  ├── CoderBot (implementa)
  │   └── Tools: Read, Write, Edit, Glob, Grep, Bash
  ├── TesterBot (prueba)
  │   └── Tools: Bash, Read
  ├── DeployerBot (despliega)
  │   └── Tools: Bash, Task
  ├── SecurityBot (asegura)
  │   └── Tools: Grep, Read, WebSearch
  └── DocWriterBot (documenta)
      └── Tools: Read, Write
```

### Cuándo Usar

- Objetivos complejos con dependencias claras
- Flujo secuencial: plan → code → test → deploy
- Equipos multidisciplinarios

### Implementación

La Queen actual en `queen-bee.ts` usa esta topología por defecto.

### Referencias

- `apps/orchestrator/src/hive/queen-bee.ts`
- `apps/orchestrator/src/hive/hive-orchestrator.ts`
