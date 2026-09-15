---
status: accepted
owner: platform
last_review: 2026-09-12
type: architecture-note
tags:
  - opsly/agents
  - opsly/agent-lab
---

# Agent Lab — Capability Ownership Table

## Why this doc exists

Drafts that introduced `lib/agent-job-registry` or a parallel `lib/agent-lab-evidence`
package risked a second job store / evidence fork. This table names the **canonical**
owner for each responsibility and the decision (reuse / extend / thin learning layer).

Agent Lab **enriches** the existing path. It does not fork it.

**Canonical learning package:** `@intcloudsysops/agent-learning` (`lib/agent-learning`).  
`lib/agent-lab-evidence` is **superseded** — do not land it alongside agent-learning.

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
  -> Agent Lab learning layer         (lib/agent-learning — evidence/review/trust)
```

## Ownership table

| Capability | Canonical owner | Path | Decision |
|---|---|---|---|
| Task envelope / identity | `AgentTaskEnvelopeV1` | `packages/types/src/agent-task.ts` | REUSE |
| Envelope construction | `buildAgentTaskEnvelope`, `assignAgentTask` | `lib/agent-task-core` | REUSE |
| Policy (approve/deny/cost) | `evaluateAgentTaskPolicy` | `lib/agent-task-core` | REUSE |
| Agent registry — CLI | `ExternalAgentRegistrySchema` | `lib/external-agent-registry` | REUSE |
| Agent registry — PC-gamer | compute worker registry | `config/compute-workers.json`, `scripts/ops/compute-worker-router.mjs` | REUSE |
| BullMQ enqueue (local agents) | Orchestrator `local-agents` | `apps/orchestrator` (`enqueueLocalAgentJob`) | REUSE (ADR-048) |
| Runtime job status HTTP | `/api/job-status/:id` | looks up **openclaw + local-agents** | REUSE / extend |
| Action-risk ceiling | `AutomationLevel` | `lib/ai-board/levels.ts` | REUSE; ≠ Agent Trust |
| Execution / review / trust / scorecards | `AgentLearningStore` | `lib/agent-learning` | **NEW** thin layer keyed by `request_id` |

## Builder / reviewer rule

One builder, one independent reviewer. Claude = planner · Cursor = builder · Codex = independent reviewer.

## Related

- `docs/design/OPSLY-AGENT-LAB.md`
- `docs/design/PR-1185-ARCHITECTURE-RECONCILIATION.md`
- `config/agent-capability-owners.json`
- ADR-048 agent-task-store
