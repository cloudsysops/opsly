# Opsly Reusable Core — auditoría + estado de implementación

**Fecha:** 2026-08-02
**Rama:** `feat/opsly-reusable-core`
**Veredicto base:** **E / PARTIAL_REUSABLE_CORE** (mezcla de core real + scripts + docs)

## Implementado en esta rama

| Capacidad | Ubicación | Evidencia |
|---|---|---|
| AgentTaskEnvelopeV1 | `packages/types/src/agent-task.ts` | Zod + export `@intcloudsysops/types/agent-task` |
| Registry extendido | `lib/external-agent-registry` + `config/external-agent-registry.json` | `open_source`, `supported_task_types`, `priority`, `fallback_agents` |
| Router determinista | `routeAgentTask()` | Sin LLM; reason codes |
| Policy | `lib/agent-task-core/src/policy.ts` | allow / deny / require_approval |
| Assign + client | `lib/agent-task-core` | `assignAgentTask`, `OrchestratorAgentTaskClient` |
| Orchestrator | `apps/orchestrator/.../local.ts` | Valida `agent_task` si viene en el body |
| Fixture neutral | `config/tenants/academy-demo.json` | Aislado de Peskids |
| CLI | `scripts/assign-agent-task.ts` (+ `.mjs`) | dry-run default; tsx local |
| Task store (decisión) | `docs/adr/ADR-048-agent-task-store.md` | Canónico = BullMQ `local-agents` |

## Verificación

```text
vitest @intcloudsysops/external-agent-registry  → 5 passed
vitest @intcloudsysops/agent-task-core          → 4 passed
vitest local-prompt-submit-queue (orchestrator) → envelope cases
tsx scripts/smoke-agent-task-core.ts           → ok
tsx scripts/assign-agent-task.ts --tenant academy-demo → envelope V1
```

## No hecho (siguientes PRs, sin big-bang)

1. Obligar LLM Gateway en **todos** los bridges CLI (inventario + gate incremental).
2. Clasificar árbol `skills/` global / platform / tenant.
3. Persistencia larga del envelope (solo si ADR-048 lo exige más adelante).
4. Deploy / merge a `main` (ventana nocturna; capacity alert activo).

## Uso

```bash
npm run agent:assign-task -- --task "revisar routing" --tenant academy-demo
# --enqueue solo con Orchestrator + PLATFORM_ADMIN_TOKEN
```
