# Worker Runtime

**Estado:** `implemented-partial`
**Ruta:** `apps/orchestrator/src/runtime/agent-task-runtime.ts`

## Propósito

`AgentTaskRuntime` es la frontera común para ejecutar una tarea `AgentTaskEnvelopeV1` dentro del Orchestrator. No reemplaza BullMQ, el registry, el router, las policies ni el LLM Gateway.

BullMQ conserva la responsabilidad de cola, retry del job y concurrencia. El runtime gobierna una ejecución individual:

```text
AgentTaskEnvelopeV1
  → validación
  → policy
  → adapter seleccionado
  → timeout/cancelación
  → evento sanitizado
```

## Reglas

- El runtime no selecciona agentes: recibe el adapter ya resuelto por el flujo canónico.
- El adapter debe coincidir con `selected_agent`.
- `dry_run` no ejecuta el adapter.
- `approval_required` no ejecuta el adapter.
- Los eventos solo contienen IDs, tenant, agente, duración y códigos de error.
- Nunca se guardan secretos, prompts completos ni chain-of-thought en los eventos.
- Las tareas legacy sin `agent_task` siguen funcionando mientras se migran.

## Integración actual

`local-agent-http-worker.ts` usa el runtime cuando el payload contiene `agent_task`; después delega al bridge HTTP existente. Los jobs legacy continúan por la ruta anterior para preservar compatibilidad.

## Próximo incremento

- Resolver adapters desde `external-agent-registry` sin duplicar routing.
- Exponer estado/eventos al read model de Mission Control.
- Añadir lease/heartbeat de instancia y cancelación remota.
- Migrar un adapter real adicional después de cerrar OpenCode/mock.
