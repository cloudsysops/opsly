---
id: agent-workforce-bootstrap-020
status: pending
owner: opsly-agent-supervisor
created: 2026-09-11
requires_pr: true
risk: low
autonomy: supervised
---

# Opsly Agent Workforce — bootstrap autonomous supervised execution

## Objective

Close the smallest missing loop needed for Opsly to begin doing useful engineering work autonomously:

```text
Signal / human objective
→ AgentTaskEnvelopeV1
→ agent-task-core
→ external-agent-registry
→ Orchestrator / BullMQ local-agents
→ worker (Cursor/OpenCode/etc.)
→ evidence/result
→ independent Codex review
→ repair if needed
→ final status
→ Agent Lab learning record
```

Do **not** create another orchestrator, queue, task registry, router, or worker registry.

## Canonical owners — read before coding

Inspect and reuse:

- `packages/types/src/agent-task.ts`
- `lib/agent-task-core/`
- `lib/external-agent-registry/`
- `apps/orchestrator/src/runtime/agent-task-runtime.ts`
- `apps/orchestrator/`
- `lib/ai-board/`
- `docs/adr/ADR-048-agent-task-store.md`
- `docs/00-architecture/AGENT-ROUTING.md`
- `docs/audits/BACKGROUND-WORKERS-AUDIT.md`
- `docs/03-agents/CLAUDE-CODEX-MCP-BRIDGE.md`
- `AGENTS.md`

Also inspect PR #1185 and specifically the proposed `lib/agent-job-registry/`.

## First decision

Build a capability ownership matrix before implementation:

| Capability | Canonical owner | Existing path | Duplicate? | Action |
|---|---|---|---|---|
| task envelope | | | | |
| task identity | | | | |
| policy | | | | |
| routing | | | | |
| static agent registry | | | | |
| runtime worker state | | | | |
| queue/enqueue | | | | |
| lifecycle/status | | | | |
| evidence | | | | |
| independent review | | | | |
| trust score | | | | |
| promotion/demotion | | | | |
| learning/evals | | | | |

Rule: **one capability = one canonical owner**.

If #1185 duplicates task identity/store/router/queue, do not merge that design. Preserve only genuinely new learning/evaluation concepts and attach them to the canonical `task_id`.

## Supervisor roles

Use:

- Claude = planner / architect / human-facing supervisor
- Cursor = primary builder / integration
- OpenCode = local/cheap builder, bounded repairs, PC-gamer jobs
- Codex = independent reviewer / verifier; no edits during review

Builder != reviewer.

Do not spawn two builders against the same canonical owner.

## Phase A — lifecycle contract

Extend the existing AgentTask runtime instead of creating a second registry.

Target canonical lifecycle:

```text
PROPOSED
APPROVED
QUEUED
ASSIGNED
RUNNING
REVIEWING
CHANGES_REQUESTED
APPROVED
VERIFIED
DONE
```

Alternative terminal/exception states:

```text
BLOCKED
FAILED
CANCELLED
TIMED_OUT
```

Reuse BullMQ/Orchestrator as store per ADR-048.

Do not create a new Supabase task table in this task.

## Phase B — runtime fleet view

Reuse the static external-agent registry.

Add/complete only the missing runtime view derived from heartbeats/capabilities:

- worker_instance_id
- online/offline
- last_seen
- lease/ttl
- capabilities
- queue depth if already observable
- runtime/adapter version
- resource summary when available

Do not create another static worker registry.

Use existing PC-gamer heartbeat/capability data where possible.

## Phase C — automatic supervised dispatch

Prove one bounded engineering workflow:

```text
objective
→ canonical AgentTaskEnvelopeV1
→ select one builder
→ enqueue
→ builder returns evidence
→ Codex independent review
→ REQUEST_CHANGES? repair once
→ Codex re-review
→ final status
```

Max automated repair rounds in this pilot: 2.

No production mutation.

No automatic merge.

## Phase D — Agent Lab as learning/evaluation layer

Do not make Agent Lab another task registry.

Agent Lab may persist/represent only data such as:

- canonical task_id
- executor/agent
- model
- prompt_version
- output/evidence refs
- reviewer
- review decision
- findings
- repair round
- final accepted result
- latency/resource metrics
- supervisor agreement
- human agreement when available
- trust delta

If `lib/agent-job-registry` contains useful evidence/trust/promotion logic, refactor it into a thin learning/evaluation layer that consumes canonical task IDs.

Prefer a responsibility-oriented package name such as:

- `lib/agent-evaluation/`
- or `lib/agent-learning/`

Do not retain the name `job-registry` if it is not the canonical job registry.

## Phase E — duplicate-work guard

Before dispatching a builder, check:

1. canonical capability owner
2. active AgentTask for same objective/capability
3. active ACP/session if available
4. active branch/worktree if observable

If a matching implementation is already active:

```text
DUPLICATE_ACTIVE_TASK
→ reuse existing work
→ do not spawn a second builder
```

This guard must not rely only on AGENTS.md.

## First E2E

Pick ONE safe, low-risk real repository task.

Examples:

- fix a bounded non-production CI/code-quality failure
- update a focused test
- repair a small deterministic runtime issue

Do not choose:

- production DB migration
- auth/RLS
- secrets
- payments
- destructive cleanup
- production deploy
- Content Studio megadiff
- Peskids prod mutation

Expected proof:

```text
AgentTask created
→ builder assigned automatically
→ work executed
→ evidence captured
→ Codex review runs automatically
→ optional repair
→ final APPROVED or BLOCKED
```

Human should not need to manually copy prompts between agents.

## PC gamer

Use the gamer only through existing canonical execution paths and capabilities.

Do not SSH-script a parallel orchestrator.

Respect `config/pc-gamer-schedule.json`.

During Mauro gaming/light windows:
- no heavy model tournaments
- no heavy video/render work
- only bounded light tasks

## Evaluation tools

Do not clone/vendor new OSS projects in this task.

First identify gaps.

If evaluation tooling is missing, produce a follow-up recommendation comparing:
- Promptfoo for eval/regression/red-team
- Langfuse for traces/datasets/evaluation observability
- SWE-ReX for sandbox execution

Classify each:
ADOPT / ADAPT / REFERENCE_ONLY / REJECT

No integration in this bootstrap unless it is required to complete the first E2E.

## Safety / governance

LOW:
may execute autonomously with independent review.

MEDIUM:
may execute if bounded/reversible and reviewed.

HIGH:
prepare only; require human approval before risky action.

CRITICAL:
block.

No production writes in this task.

## Deliverables

1. Capability ownership matrix
2. Focused architecture decision for #1185 Agent Lab portion
3. Minimal lifecycle/fleet/learning changes needed
4. One safe autonomous E2E
5. Codex independent review evidence
6. Small coherent PR(s), not a megadiff
7. Update repository-visible coordination state
8. No duplicate control plane

## Final report

Return:

STATUS

CANONICAL_OWNERSHIP_MATRIX

DUPLICATES_FOUND

PR_1185_AGENT_LAB_DECISION

LIFECYCLE

FLEET_STATE

SUPERVISOR_DISPATCH

BUILDER

CODEX_REVIEW

REPAIR_ROUNDS

AGENT_LEARNING

DUPLICATION_GUARD

PC_GAMER_USAGE

TESTS

FILES_CHANGED

COMMITS

PR

BLOCKERS

NEXT_HIGHEST_VALUE_JOB

Final decision:

```text
AGENT_WORKFORCE_BOOTSTRAP_PROVEN
```

or

```text
BLOCKED
```

Do not declare success from docs or unit tests alone. Require one real bounded AgentTask execution through the canonical path.
