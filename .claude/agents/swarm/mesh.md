---
name: mesh-swarm
role: orchestrator
description: Topología mesh donde los bots se comunican directamente entre sí
model: claude-sonnet-4.6
triggers:
  - mesh swarm
  - peer-to-peer
  - decentralized
references:
  - apps/orchestrator/src/hive/pheromone-channel.ts
  - docs/design/AGENT-ORCHESTRATION-INDEX.md
---

## Mesh Swarm

Topología de enjambre mesh (peer-to-peer). Los bots se descubren y colaboran sin mediación central.

### Estructura

```
CoderBot ←→ TesterBot
    ↕          ↕
Researcher ←→ DeployerBot
    ↕          ↕
SecurityBot ←→ DocWriterBot
```

### Comunicación

- Todos los bots publican y suscriben a feromonas
- No hay Queen central — la coordinación emerge
- Cada bot decide autónomamente qué tareas tomar

### Cuándo Usar

- Tareas que requieren colaboración estrecha
- Sistemas donde un solo punto de fallo es inaceptable
- Equipos autoorganizados

### Implementación

El `PheromoneChannel` soporta mesh — cualquier bot puede publicar/suscribirse a cualquier canal.

### Referencias

- `apps/orchestrator/src/hive/pheromone-channel.ts`
- `apps/orchestrator/src/hive/types.ts`

---

## Enlaces relacionados

- [[.claude/agents/README|agents]]
- [[README|Inicio]]
