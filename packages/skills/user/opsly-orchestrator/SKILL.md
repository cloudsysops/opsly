# Opsly Orchestrator Skill

> **Triggers:** `n8n`, `workflow`, `OAR`, `orchestrator`, `super-agent`, `job`, `strategy`, `plan-execute`, `react strategy`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-api`, `opsly-llm`, `opsly-infra`

## Cuándo usar

Al trabajar con el orchestrator (`apps/orchestrator`), workflows de n8n, el OAR (Opsly Agentic Runtime), o el super-agent. Incluye: estrategias de ejecución, job lifecycle, integración n8n, y endpoints de decisión/ejecución.

## Arquitectura OAR

El Opsly Agentic Runtime normaliza cómo se ejecutan tareas complejas con patrones de ejecución explícitos (Loops) orquestados por código, no por el "pensamiento implícito" del LLM.

### Abstracciones core

```typescript
// Memory — contexto de trabajo por tenant/sesión
interface MemoryInterface {
  getWorkingContext(tenantSlug: string, sessionId: string): Promise<Record<string, unknown>>;
  appendObservation(
    tenantSlug: string,
    sessionId: string,
    step: number,
    content: string
  ): Promise<void>;
  querySemantic(tenantSlug: string, query: string, limit?: number): Promise<MemoryFragment[]>;
}

// Actions — ejecución de herramientas
interface AgentActionPort {
  executeAction(
    tenantSlug: string,
    actionName: string,
    args: Record<string, unknown>
  ): Promise<ToolResult>;
}
```

### Job lifecycle

```
PENDING → STRATEGIZING → THINKING → ACTING → OBSERVING → REFLECTING → COMPLETED/FAILED
```

### Estrategias por modo

| Modo      | Estrategia                  | maxSteps | Notas             |
| --------- | --------------------------- | -------- | ----------------- |
| Architect | PlanAndExecute              | 20       | allowReplanning   |
| Developer | PlanAndExecute              | 15       | toolTimeout: 30s  |
| Hacker    | ReAct                       | 50       | fastMode          |
| Security  | PlanAndExecute + Reflection | —        | maxReflections: 2 |

### Engine principal

El engine en `apps/orchestrator/src/engine.ts` sigue este flujo:

1. `enrichJob()` — enriquecer con contexto
2. `processIntent()` — clasificar intención
3. Router a estrategia: `runReActStrategy()` o `runPlanExecuteStrategy()`
4. Metering: `meterPlannerLlmFireAndForget()`

## n8n Integration

### Endpoints API

```
POST /api/n8n/decide   → Recibe contexto, retorna plan de ejecución
POST /api/n8n/execute   → Ejecuta un plan aprobado
```

### Workflows n8n

Ubicación de definiciones: `docs/n8n-workflows/`

Un workflow típico:

1. Trigger (webhook/schedule)
2. Decision node → llama a `/api/n8n/decide`
3. Approval gate (opcional)
4. Execution node → llama a `/api/n8n/execute`
5. Notification → Discord

## Patrón para nuevos jobs

```typescript
// apps/orchestrator/src/jobs/mi-job.ts
import { Job } from '../types';
import { setJobState } from '../state';

export async function processMiJob(job: Job): Promise<void> {
  await setJobState(job.id, 'STRATEGIZING');

  // 1. Enriquecer contexto
  const context = await memory.getWorkingContext(job.tenantSlug, job.sessionId);

  // 2. Seleccionar estrategia
  const strategy = selectStrategy(job.mode);

  // 3. Ejecutar
  await setJobState(job.id, 'ACTING');
  const result = await strategy.execute(context, job.params);

  // 4. Observar y reflejar
  await memory.appendObservation(job.tenantSlug, job.sessionId, job.step, JSON.stringify(result));

  await setJobState(job.id, 'COMPLETED');
}
```

## Reglas

- Todo job debe pasar por el lifecycle completo (no saltar estados).
- Metering obligatorio para llamadas LLM (`meterPlannerLlmFireAndForget`).
- Scope por tenant: `tenantSlug` en toda operación.
- n8n decide, el orchestrator ejecuta — no al revés.
- Estrategia ReAct para exploración, PlanAndExecute para tareas estructuradas.

## Errores comunes

| Error                  | Causa                | Solución                                  |
| ---------------------- | -------------------- | ----------------------------------------- |
| 404 en /api/n8n/decide | Ruta no desplegada   | Verificar build e incluir en deployment   |
| Job stuck en THINKING  | LLM timeout          | Configurar `toolTimeout` en estrategia    |
| Memory vacío           | No se cargó contexto | Verificar `enrichJob()` antes de ejecutar |
| Metering faltante      | No llamó meter\*     | Agregar metering en cada llamada LLM      |
