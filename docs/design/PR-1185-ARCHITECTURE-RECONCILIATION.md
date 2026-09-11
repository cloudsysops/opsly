---
status: draft
owner: architecture
last_review: 2026-09-11
type: design
tags:
  - opsly/agents
  - opsly/architecture
  - pr-1185
---

# PR #1185 — Architecture reconciliation

**Decision:** do **not** merge #1185 as-is. Split Agent Lab learning from Content Studio Phase 2.2. Agent Lab must **extend** the canonical AgentTask path — never own a second task registry.

**Canonical path (preserved):**

```text
AI Board / supervisors
→ AgentTaskEnvelopeV1
→ lib/agent-task-core
→ lib/external-agent-registry
→ apps/orchestrator / BullMQ
→ worker
→ result
→ lib/agent-learning (evidence / trust / eval)  [NEW thin layer]
```

**PR fact:** tip includes `969482e39` `lib/agent-job-registry` (~1k LOC) **plus** Content Studio Phase 2.2 (~11k). Draft, CI red.

## Ownership matrix

| CAPABILITY | EXISTING_CANONICAL_OWNER | EXISTING_PATH | PR_1185_IMPLEMENTATION | OVERLAP? | DECISION | FINAL_OWNER |
|---|---|---|---|---|---|---|
| task envelope | types + agent-task-core | `packages/types/src/agent-task.ts`, `lib/agent-task-core` | `JobSpec` parallel contract | YES | REMOVE_DUPLICATE | agent-task-core / AgentTaskEnvelopeV1 |
| task id | envelope `request_id` (+ correlation) | same | `job_id` independent | YES | REUSE | AgentTaskEnvelopeV1.request_id |
| task store | BullMQ `local-agents` + Redis JobState | ADR-048, orchestrator | in-memory `JobRegistry.jobs` | YES | REMOVE_DUPLICATE | orchestrator / ADR-048 |
| task lifecycle | AgentTaskRuntime + BullMQ | `apps/orchestrator/src/runtime/agent-task-runtime.ts` | JobStatus in registry | YES | REUSE | orchestrator AgentTaskRuntime |
| policy | agent-task-core | `lib/agent-task-core/src/policy.ts` | none / implicit | NO | REUSE | agent-task-core |
| routing | external-agent-registry | `lib/external-agent-registry` | `findCandidateAgents` in JobRegistry | YES | REMOVE_DUPLICATE | external-agent-registry |
| agent registry | external-agent-registry + config/agent-capabilities | `lib/external-agent-registry`, `config/agent-capabilities.json` | `AgentEntry` map in JobRegistry | PARTIAL | EXTEND | external-agent-registry (+ scorecards in agent-learning) |
| worker registry | agent-services / external workers | `config/agent-services.json` | none dedicated | NO | REUSE | existing registries |
| BullMQ enqueue | OrchestratorAgentTaskClient / queue | `lib/agent-task-core/orchestrator-client.ts`, `apps/orchestrator` | `enqueueJobOnQueue` direct Queue | YES | THIN_ADAPTER | orchestrator only |
| runtime status | AgentTaskRuntimeStatus | agent-task-runtime.ts | ExecutionRecord.status | PARTIAL | REUSE | AgentTaskRuntime |
| cancel/retry | AgentTaskRuntime.cancel + BullMQ | same | none | NO | REUSE | orchestrator |
| evidence | (gap) | — | EvidenceRecord | NO | MOVE_TO_AGENT_LAB | **lib/agent-learning** |
| review | AI Board / Codex skill / content independent reviewer | `lib/ai-board`, content-studio reviewer | ReviewRecord | PARTIAL | EXTEND | AI Board + **agent-learning** attach |
| trust score | (gap) | — | TrustLevel + AgentEntry metrics | NO | MOVE_TO_AGENT_LAB | **lib/agent-learning** |
| promotion/demotion | (gap) | — | promoteIfEligible / demoteIfDegraded | NO | MOVE_TO_AGENT_LAB | **lib/agent-learning** |
| learning history | (gap) | — | EvidenceRecord.learning_lesson | NO | MOVE_TO_AGENT_LAB | **lib/agent-learning** |
| evaluation dataset | (gap) | — | ModelTournamentTask / templates | NO | MOVE_TO_AGENT_LAB | **lib/agent-learning** |
| prompt performance | (gap) | — | PromptVersion | NO | MOVE_TO_AGENT_LAB | **lib/agent-learning** |
| model performance | (gap) / LLM gateway metering | llm-gateway usage | tournament / scorecards | PARTIAL | EXTEND | agent-learning + gateway metrics |

## File classification — `lib/agent-job-registry/`

| File | Classify | Target |
|---|---|---|
| `src/job-registry.ts` (jobs Map) | DELETE / REWRITE | drop job store; keep scorecard/trust helpers → `lib/agent-learning` |
| `src/types.ts` JobSpec | DELETE | use AgentTaskEnvelopeV1 |
| `src/types.ts` Evidence/Review/Trust | MOVE | `lib/agent-learning/src/types.ts` keyed by `task_id` |
| `src/job-templates.ts` | ADAPT | evaluation fixtures only; no createJob |
| `src/bullmq-adapter.ts` | REWRITE | thin wrap `OrchestratorAgentTaskClient` only |
| `examples/pc-gamer-job-executor.ts` | REWRITE | assignAgentTask → enqueue → attach evidence |
| `package.json` | REWRITE | name `@intcloudsysops/agent-learning`; deps `"*"` not `workspace:*` |
| `README.md` | REWRITE | learning layer docs |

## Split plan

### PR A — Agent Lab learning (this branch family)

- `lib/agent-learning/`
- `config/agent-capability-owners.json`
- design docs + AGENTS anti-dupe rule
- tests proving learning records require canonical `task_id` / `request_id`
- **no** Content Studio UI/events/render

### PR B — Content Studio Phase 2.2

- Extract from #1185 **without** `lib/agent-job-registry/**`
- Mission Control approval/render admin, content-studio rendering, orchestrator events, E2E
- Fix package/lock if needed; label `night-merge` or `safe-daytime` as policy requires
- Keep coherent Content Studio functionality

### Close / supersede on #1185

Comment: blocked pending split; do not merge megadiff.

## CI classification (#1185)

| Check | Class | Notes |
|---|---|---|
| validate-structure / validate (`npm ci` → `workspace:*`) | INTRODUCED_BY_PR / STRUCTURE_FAILURE | `lib/agent-job-registry/package.json` used `workspace:*`; monorepo uses `"*"` |
| production-change-window | POLICY_WINDOW | draft daytime; needs label or night window |
| npm audit | PREEXISTING / SECURITY_BASELINE | classify per-split; do not `--force` |

## Supervisor roles

| Role | Agent | Owns |
|---|---|---|
| CLAUDE | planner/architect | context, product reasoning |
| CURSOR | builder/repair | implementation |
| CODEX | independent reviewer | verify, tests, security — **no edit during review** |

One builder, one reviewer per change set.

## Final model

| Layer | Owns |
|---|---|
| Mission Control | what work exists (UI) |
| agent-task-core | task contract / policy |
| external-agent-registry | who can do it |
| orchestrator | execution |
| PC-gamer | compute worker |
| AI Board | governance / prioritization |
| **agent-learning** | how well agents perform / improve |

**FINAL_DECISION:** ARCHITECTURE_RECONCILED (contract) — implementation of PR A in progress; #1185 remains BLOCKED until split.
