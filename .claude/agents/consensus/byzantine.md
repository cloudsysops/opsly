---
name: byzantine-consensus
role: coordinator
description: Tolerancia a fallos bizantinos para entornos con agentes no confiables
model: claude-sonnet-4.6
triggers:
  - byzantine
  - fault tolerance
  - untrusted agents
references:
  - docs/design/AGENT-ORCHESTRATION-INDEX.md
  - docs/runbooks/
---

## Byzantine Consensus

Algoritmo de consenso tolerante a fallos bizantinos. Útil cuando hay agentes potencialmente maliciosos o no confiables.

### Cuándo Usar

- Agentes externos o federados
- Decisiones que afectan seguridad o facturación
- Múltiples instancias de agente con posible comportamiento adversarial

### Trade-offs

- Mayor latencia (múltiples rondas de mensajes)
- Mayor overhead computacional
- Máxima seguridad en sistemas distribuidos

### Implementación

Actualmente no implementado en Opsly. Diseñado para futura integración con RuFlo Federation protocol.
