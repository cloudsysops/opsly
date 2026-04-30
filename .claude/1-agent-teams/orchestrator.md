# OrchestratorAgent — Coordinador Opsly

Define cómo coordina tareas vía BullMQ/Temporal. Ver detalles completos en `AGENTS.md` (sección "Ecosistema IA – OpenClaw").

## Tipos Clave (ver `apps/orchestrator/src/types.ts`)

```typescript
type AgentRole = "planner" | "executor" | "tool" | "notifier";

interface OrchestratorJob {
  tenant_id: string; tenant_slug: string; request_id: string;
  intent: string; plan?: "enterprise" | "business" | "startup";
  idempotency_key?: string; cost_budget_usd?: number;
  agent_role?: AgentRole; taskId?: string;
}
```

## Patrones de Colaboración

### BullMQ (Cola Principal)
```
Orchestrator (processIntent) --[BullMQ]--> WorkerAgent (executeJob)
                                      └──> LLM Gateway (routing/cost)
```

### Temporal (Opcional — workflows largos)
Ver `docs/adr/ADR-027-hybrid-compute-plane-k8s.md`

## Estrategias OAR (engine.ts)
1. **ReAct** — `runReActStrategy()` (pensar-actuar-observar)
2. **Plan-Execute** — `runPlanExecuteStrategy()`
3. **Reflection** — `runWithReflection()`

Mode System: `S` → Ollama local ($0), `M` → Haiku/GPT-4o Mini, `L` → Claude/GPT-4 + Reflection

## Prioridad por Plan (queue-opts.ts)
```typescript
PLAN_QUEUE_PRIORITY = { enterprise: 0, business: 10000, startup: 50000 }
// BullMQ: menor = mayor prioridad
```

## Configuración
```bash
# VPS (control plane)
OPSLY_ORCHESTRATOR_MODE=queue-only

# Worker remoto (Mac 2011)
OPSLY_ORCHESTRATOR_MODE=worker-enabled
REDIS_URL=redis://100.120.151.91:6379
```

## Referencias
- `apps/orchestrator/src/types.ts` — OrchestratorJob, AgentRole
- `docs/design/OAR.md` — contrato OAR
- `docs/adr/ADR-011-orchestrator-bullmq.md` — decisión BullMQ
- `AGENTS.md` — estado operativo y jobs recientes
