# Agent routing

Opsly delegates work to local CLI agents through one control plane (Orchestrator + BullMQ `local-agents`).

```text
task
  -> @intcloudsysops/agent-task-core (infer + route + policy + AgentTaskEnvelopeV1)
  -> assign-agent-task CLI (dry-run default)
  -> POST /api/local/prompt-submit (optional --enqueue)
  -> BullMQ local-agents
  -> bridge agent (5001–5011)
```

## Contracts

| Piece | Location |
|---|---|
| Envelope schema | `packages/types/src/agent-task.ts` (`AgentTaskEnvelopeV1`) |
| Registry (Zod) | `lib/external-agent-registry` + `config/external-agent-registry.json` |
| Deterministic router | `routeAgentTask()` — no LLM |
| Policy | `evaluateAgentTaskPolicy()` — allow / deny / require_approval |
| HTTP client | `OrchestratorAgentTaskClient` |
| Neutral tenant fixture | `config/tenants/academy-demo.json` |

Bridge URLs stay in `config/agent-services.json`.

**Task store:** BullMQ `local-agents` is canonical for this envelope — see [ADR-048](../adr/ADR-048-agent-task-store.md).

## Usage

```bash
npm run agent:assign-task -- --task "revisar routing del gateway" --tenant academy-demo --open-source-only
# or
node scripts/assign-agent-task.mjs --task "revisar routing del gateway" --tenant academy-demo
```

Explicit enqueue (Orchestrator + token):

```bash
PLATFORM_ADMIN_TOKEN=... npm run agent:assign-task -- \
  --task "ejecutar type-check del backend" --tenant academy-demo \
  --agent local_opencode --enqueue
```

Use `--no-auto-start` when the bridge is managed elsewhere. The LLM Gateway remains the model boundary.
