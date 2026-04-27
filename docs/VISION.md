# VISION

Ver [`docs/01-development/VISION.md`](01-development/VISION.md) para mas detalles.

## Actualización de visión operativa (2026-04-26)

La visión de Opsly para la capa agentic se consolida en un enfoque de **Meta-Orquestador incremental**:

1. **Control plane estable** en `apps/*` (API, Orchestrator, MCP, LLM Gateway).
2. **Shell de aceleración operativa** en `tools/cli` para validar patrones de autonomía:
   - modos dinámicos,
   - selección inteligente de skills,
   - pipeline seguro sandbox/qa/prod,
   - coordinación de workers,
   - orquestación multi-agente.
3. **Gobernanza por fases**:
   - fase actual: `dry-run` + guardrails (sin despliegues destructivos automáticos),
   - fase siguiente: sandbox remoto + rollback + evidencia auditable.

### Principio rector

**Autonomía progresiva con seguridad por defecto.**  
Toda capacidad de auto-construcción/auto-evolución inicia en modo seguro (`dry-run`) y solo se promueve con controles explícitos de aprobación y trazabilidad.
