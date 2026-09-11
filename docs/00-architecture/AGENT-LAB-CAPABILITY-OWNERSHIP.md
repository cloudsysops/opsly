---
status: accepted
owner: claude
last_review: 2026-09-11
type: architecture-note
tags:
  - opsly/agents
  - opsly/agent-lab
---

# Agent Lab — Capability Ownership Table

## Why this doc exists

An earlier draft of `lib/agent-job-registry` introduced a second job store, a
second agent registry, and a second BullMQ adapter — duplicating the canonical
agent task path and violating [[ADR-048-agent-task-store]]. This table is the
required reconciliation: for every responsibility Agent Lab needs, it names the
existing owner and the decision (reuse / extend / new thin layer).

Agent Lab **enriches** the existing path. It does not fork it.

## Canonical path (unchanged)

```
AI Board / supervisors (Claude, Codex, Cursor)
  -> AgentTaskEnvelopeV1              (packages/types, lib/agent-task-core)
  -> agent-task-core                  (build envelope, infer type, policy, assign)
  -> routing                          (external-agent-registry for CLI agents,
                                        compute-worker-router.mjs for PC-gamer)
  -> Orchestrator + BullMQ            (local-agents / openclaw / content-video queues)
  -> worker executes
  -> Orchestrator JobState (Redis)    (runtime status, ADR-048)
  -> Agent Lab evidence layer         (NEW: execution/review/evidence/trust — this doc)
```

## Ownership table

| Capability | Canonical owner | Path | Decision |
|---|---|---|---|
| Task envelope / identity | `AgentTaskEnvelopeV1` | `packages/types/src/agent-task.ts` | REUSE |
| Envelope construction | `buildAgentTaskEnvelope`, `assignAgentTask` | `lib/agent-task-core/envelope.ts`, `assign.ts` | REUSE |
| Task type inference | `inferTaskType` | `lib/agent-task-core/infer-task-type.ts` | REUSE |
| Policy (approve/deny/cost) | `evaluateAgentTaskPolicy` | `lib/agent-task-core/policy.ts` | REUSE |
| Agent registry — CLI agents (Claude/Cursor/Codex/OpenCode/...) | `ExternalAgentRegistrySchema` | `lib/external-agent-registry`, `config/external-agent-registry.json` | REUSE |
| Agent registry — PC-gamer GPU/Ollama workers | compute worker registry | `config/compute-workers.json`, `scripts/ops/compute-worker-router.mjs` | REUSE |
| Routing (capability → worker), CLI agents | `routeAgentTask` | `lib/external-agent-registry/routing.ts`, `task-routing.ts` | REUSE |
| Routing (capability → worker), compute nodes | `assignJob`, `selectWorkers` | `scripts/ops/compute-worker-router.mjs` | REUSE |
| BullMQ enqueue, CLI agents | `OrchestratorAgentTaskClient.enqueue` | `lib/agent-task-core/orchestrator-client.ts` → `local-agents` queue | REUSE (ADR-048) |
| BullMQ enqueue, compute jobs | `assignJob` → `openclaw`/`content-video` queues | `scripts/ops/compute-worker-router.mjs` | REUSE |
| Runtime job state | `JobState` in Redis (`opsly:jobs:{id}`, 24h TTL) | `apps/orchestrator/src/state/store.ts` | REUSE (ADR-048) |
| Action-risk ceiling (not agent trust) | `AutomationLevel` (0–5, peskids-support scoped) | `lib/ai-board/levels.ts` | REUSE where applicable; **do not confuse with Trust Level below** |
| Signal → job mapping (peskids CRM domain) | `mapSignalToBoardJob` | `lib/ai-board/jobs.ts` | REUSE for that domain; not forked for Agent Lab |
| **Execution record** (what an agent produced) | — | — | **NEW** — `lib/agent-lab-evidence`, keyed by `request_id` |
| **Independent review record** | — | — | **NEW** — `lib/agent-lab-evidence` |
| **Agent trust score / promotion / demotion** | — | — | **NEW** — `lib/agent-lab-evidence`; distinct axis from `AutomationLevel` |
| **Evidence record for future eval/fine-tuning** | — | — | **NEW** — `lib/agent-lab-evidence` |
| **Prompt versioning + performance** | — | — | **NEW (not yet implemented)** — planned addition to `lib/agent-lab-evidence` |

## What `lib/agent-lab-evidence` owns

Only the four "NEW" rows above:

1. `ExecutionRecord` — output, latency, resource usage, keyed by the canonical `request_id`.
2. `ReviewRecord` — independent reviewer decision + score.
3. `EvidenceRecord` — execution + review + human decision + learning lesson, for future evaluation sets.
4. `AgentTrustProfile` + promotion/demotion — trust level earned over time, distinct from `AutomationLevel`.

It does not own task identity, routing, policy, queueing, or agent capability
metadata. Those stay where they already live.

## Builder / reviewer rule

One builder, one independent reviewer, no parallel edits to the same canonical
owner. Claude (architecture/planning), Cursor (implementation/repo integration),
Codex (independent review/tests/security) — per the Agent Lab supervisor roles.

## Related

- [[ADR-048-agent-task-store]]
- `lib/agent-lab-evidence/README.md`
- `docs/00-architecture/AGENT-ROUTING.md`
