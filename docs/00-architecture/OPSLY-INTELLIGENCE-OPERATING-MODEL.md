---
status: proposed
owner: architecture
last_review: 2026-09-12
type: architecture
tags:
  - opsly/intelligence
  - opsly/agents
  - opsly/orchestrator
  - opsly/evaluation
---

# Opsly Intelligence Operating Model

## Purpose

Opsly must behave as one governed intelligent system, not as a collection of independent AI agents.

The architecture intentionally borrows proven public patterns used by modern AI assistants:

- bounded context assembly instead of loading all history;
- retrieval before generation;
- model/runtime routing by capability, risk and cost;
- explicit tool calling;
- structured task and result contracts;
- planner / executor separation;
- independent verification and evals;
- short-lived execution sessions;
- durable memory only through explicit, scoped stores;
- policy and approval gates outside the language model;
- feedback loops driven by evidence rather than self-reported confidence.

This document does **not** attempt to reproduce proprietary internals of any vendor.

## Core thesis

```text
Opsly intelligence =
  context quality
+ task decomposition
+ routing quality
+ governed execution
+ verification
+ memory/evals
+ feedback
```

The LLM/runtime is replaceable compute.

## Canonical cognitive loop

```text
Intent / event / GitHub workpack
        ↓
1. Intake + normalization
        ↓
2. Context assembly
        ↓
3. Planner produces TaskGraph
        ↓
4. Policy / risk / cost gate
        ↓
5. Capability + runtime routing
        ↓
6. Governed execution
        ↓
7. Evidence collection
        ↓
8. Independent verification
        ↓
9. Learning / scorecards
        ↓
10. Human / product feedback
```

Every implementation must map to exactly one step above.

## Layer 0 — Sources of truth

GitHub, registries, databases and approved configuration are authoritative. Agent chat history is not.

Canonical sources include:

- `AGENTS.md`
- `VISION.md`
- architecture / ADR docs
- `config/modules.json`
- `config/external-agent-registry.json`
- `lib/agent-task-core`
- `lib/agent-learning`
- tenant configuration and approved domain data

Rule: an agent may infer, but it may not silently promote inference into durable truth.

## Layer 1 — Intake

All task sources normalize into a typed request before execution.

Examples:

- GitHub workpacks
- background scheduler
- local prompt watcher
- Mission Control
- n8n/domain events
- future external integrations

Required metadata:

- `request_id`
- `tenant_slug` when applicable
- `workstream`
- `intent`
- `risk_class`
- `cost_class`
- `requires_write`
- `requires_approval`
- `conflict_key`
- `depends_on[]`
- acceptance criteria

No source may spawn a runtime directly.

## Layer 2 — Context assembly

The context layer decides what the model needs to see.

Order:

1. exact task;
2. hard constraints/policies;
3. relevant code/docs retrieved from canonical sources;
4. prior evidence for the same request/workstream;
5. tenant/project memory if explicitly relevant;
6. recent conversation only when needed.

Never load "everything" by default.

Context must be:

- bounded;
- attributable to sources;
- tenant-scoped;
- secret-safe;
- reproducible enough for review.

The existing Context Builder / Brain retrieval path should be extended rather than duplicated.

## Memory model

Use explicit memory tiers:

| Tier | Lifetime | Example | Write rule |
|---|---|---|---|
| Task | one execution | current files, test output | automatic |
| Session | one agent session | decisions made during task | automatic, bounded |
| Project | durable | architectural decisions, accepted patterns | reviewed source only |
| Tenant | durable | tenant-specific config/preferences | tenant-scoped + policy |
| Org | durable | Opsly-wide rules/standards | human/architecture review |

Raw model chain-of-thought is never required as durable memory. Store decisions, evidence, outputs and references instead.

## Layer 3 — Planner

Planner responsibilities:

- decompose a goal into a DAG of tasks;
- identify dependencies;
- assign conflict domains;
- state acceptance criteria;
- identify required tools/capabilities;
- estimate risk/cost;
- stop when architecture ownership is ambiguous.

Planner must **not** execute tools that mutate code or production.

Planner output should become a typed `TaskGraphV1` contract.

Recommended node fields:

```text
task_id
workstream
goal
owner_role
runtime_capability
depends_on[]
conflict_key
risk_class
cost_class
write_intent
approval_required
acceptance[]
evidence_required[]
```

## Layer 4 — Policy / risk / cost gate

Policy is deterministic and external to the model.

Required checks:

- tenant authorization;
- write vs read-only;
- production impact;
- paid provider / paid infrastructure;
- security-sensitive capability;
- child/health/financial data boundary where applicable;
- queue/admission limits;
- branch/PR policy;
- dependency readiness.

Default is fail-closed.

No prompt sentence, HTTP header or agent self-assertion can grant approval.

## Layer 5 — Capability and runtime router

Route by capability, not personality.

Example routing dimensions:

- code build/review;
- repository research;
- local GPU requirement;
- context window need;
- tool availability;
- latency;
- cost;
- privacy/data locality;
- required deterministic structured output.

A role such as architect, builder or reviewer is distinct from a runtime such as OpenCode, Hermes, OpenClaw, Claude or Codex.

Model/runtime policy:

1. local/free first when capable;
2. choose the smallest sufficient model/runtime;
3. escalate only when policy permits;
4. never silently fall back to paid providers;
5. log selected runtime and reason.

Future improvement: `ModelRouteDecisionV1`.

## Layer 6 — Governed execution

The canonical execution path remains:

```text
AgentTaskEnvelopeV1
  ↓
Opsly policy / approval
  ↓
BullMQ
  ↓
eligible worker
  ↓
authenticated bridge
  ↓
Session Manager
  ↓
ephemeral opsly-task-* session
  ↓
real runtime
  ↓
bounded result
  ↓
teardown
```

Do not introduce a second orchestrator, task registry, execution queue or direct runtime spawn path.

Healthy idle remains zero AI task sessions.

## Layer 7 — Tool layer

Models request tools; tools own effects.

Every tool should have:

- explicit scope;
- input schema;
- output schema;
- timeout;
- auth boundary;
- audit/evidence;
- retry/idempotency rule;
- destructive-action classification.

No arbitrary shell tool should be exposed to autonomous agents.

Prefer narrow adapters over generic execution.

## Layer 8 — Verification

Builder and verifier are separate responsibilities.

A task is not DONE because the builder says it is done.

Verification order:

1. schema/contract validation;
2. unit/integration tests;
3. security/policy gates;
4. architecture invariants;
5. product acceptance;
6. physical/runtime validation when required.

Use an independent reviewer runtime or deterministic tests where possible.

Verifier output should include:

- PASS / FAIL / BLOCKED;
- evidence;
- failing invariant;
- repair recommendation;
- whether retry is safe.

## Layer 9 — Learning and evals

`lib/agent-learning` owns learning/evidence/trust. It does not create tasks.

Record by `request_id`:

- task type;
- runtime/model;
- latency;
- cost class;
- test result;
- review result;
- retry count;
- failure category;
- human acceptance;
- rollback/rework signal.

Use this to improve routing and prompts.

Do not let an agent raise its own trust score without external evidence.

## Layer 10 — Human control plane

Sierra / Mission Control remains the authority for:

- priority;
- pause/resume;
- production approval;
- paid spend;
- product-boundary exceptions;
- merge waves;
- kill/repair/defer decisions.

Human control should become simpler as evidence improves, not disappear.

## Global operating rules

1. **One control plane.** Extend canonical owners; never create parallel orchestration.
2. **One typed task contract.** All agent execution converges on `AgentTaskEnvelopeV1`.
3. **One planner graph.** Dependencies/conflicts are explicit before parallel execution.
4. **Parallel by workstream, not by agent name.**
5. **Every lane has one write owner.** Other agents may review read-only.
6. **No agent writes to `main`.** Code changes use branch → hooks → PR.
7. **No autonomous production deployment.**
8. **No silent paid fallback.**
9. **No persistent AI worker sessions.**
10. **Every task is idempotent or declares why it cannot be.**
11. **Every mutation has bounded retries.** Default maximum: 2 attempts unless domain-specific policy says otherwise.
12. **Every completed task emits evidence.**
13. **Independent verification is required for merge-capable work.**
14. **Memory is scoped and intentional.** Chat history is not a database.
15. **Uncertainty is explicit.** Unknown ownership/dependency → BLOCKED, not guessed.
16. **Duplicate capability detection precedes implementation.**
17. **Security/policy checks live outside prompts.**
18. **Tenant data never crosses tenant boundaries.**
19. **Model selection is policy-driven and logged.**
20. **Learning changes routing only after eval evidence, not after one successful run.**

## Parallel execution contract

Each workpack must declare:

```yaml
workstream: creator-os.event-bus
conflict_key: packages/types.creator-events
depends_on: []
runtime: local_opencode
risk_class: low
cost_class: zero
requires_pr: false
requires_approval: false
production_deploy: false
paid_infra_required: false
```

Rules:

- same non-empty `conflict_key` => serialize;
- unresolved `depends_on` => block only that task;
- distinct workstreams + no shared conflict => may run concurrently;
- malformed workpack => isolate failure; do not globally block unrelated work;
- review may run in parallel with unrelated build lanes;
- downstream implementation starts only after upstream contract is stable.

Target maximum active code lanes: 8.

## Agent roles

### Architect
Read-only by default.
Owns boundaries, DAG, contracts, ADR decision proposals.

### Builder
Exactly one builder owns writes for a change set.
Implements only the assigned scope.

### Reviewer
Read-only.
Must not patch the builder branch while reviewing.

### QA/Evaluator
Runs deterministic tests/evals and records evidence.

### Release operator
Owns merge/deploy gates; cannot redefine architecture in the release step.

A runtime may perform several roles across different tasks, but never two conflicting roles in the same change set.

## "ChatGPT-like" behavior Opsly should emulate

Not vendor internals; product behavior:

- retrieve only relevant context;
- recognize when a task needs deeper reasoning;
- choose tools instead of hallucinating actions;
- use structured tool calls;
- route easy work to cheap/local compute and hard work to stronger compute;
- preserve short-term task state while keeping durable memory curated;
- verify important outputs;
- keep safety and permissions outside the model;
- learn from explicit outcomes and evaluations;
- degrade gracefully when a tool/runtime is unavailable.

## Immediate architecture priorities

P0:
- merge one canonical parallel GitHub Agent Queue path (#1372) and supersede duplicate admission PRs;
- keep anti-abuse hardening (#1370) independent;
- rebase control-plane queue admission on canonical `main`;
- update E2E #005 prerequisites to the canonical PR, not superseded #1308;
- finish physical Gamer/OpenCode readiness without paid fallback.

P1:
- define `TaskGraphV1`;
- define `ModelRouteDecisionV1`;
- add unified execution evidence schema;
- add one runtime capability matrix;
- expose queue/runtime/eval state in Mission Control.

P2:
- add router eval datasets;
- context-quality evals;
- automatic repair classification;
- evidence-driven runtime selection.

## Definition of intelligent

Opsly is becoming more intelligent when it needs less manual coordination **without reducing correctness, safety or auditability**.

The target is not "more autonomous agents".

The target is:

```text
better context
+ fewer duplicate implementations
+ better task decomposition
+ correct runtime selection
+ higher first-pass success
+ safer parallelism
+ measurable learning
```
