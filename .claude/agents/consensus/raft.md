---
name: raft-consensus
role: coordinator
description: Consenso Raft para decisiones críticas entre múltiples agentes
model: claude-sonnet-4.6
triggers:
  - consensus
  - raft
  - voting
  - agreement
references:
  - apps/orchestrator/src/hive/
  - docs/design/AGENT-ORCHESTRATION-INDEX.md
---

## Raft Consensus

Algoritmo de consenso distribuido para decisiones críticas. Los bots votan y se elige un líder.

### Flujo

1. **Leader Election** — los bots eligen un líder
2. **Proposal** — el líder propone una decisión
3. **Vote** — los bots votan (mayoría simple)
4. **Commit** — si mayoría acepta, se ejecuta
5. **Replication** — el resultado se replica a todos

### Cuándo Usar

- Decisiones de arquitectura controversiales
- Aprobación de cambios con impacto multi-tenant
- Coordinación entre agentes de distintos equipos

### Implementación

El `PheromoneChannel` con tipos `consensus_vote` y `consensus_decision` puede implementar Raft.
