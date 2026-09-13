---
status: proposed
owner: architecture
last_review: 2026-09-12
type: execution-plan
tags:
  - opsly/intelligence
  - opsly/agents
  - opsly/workstreams
---

# Opsly Intelligence Workstreams

This is the execution order for evolving Opsly into a governed intelligent system.

## Wave 0 — Stabilize the execution substrate

### INT-000 Canonicalize GitHub Agent Queue
Priority: P0
Owner role: platform architect + builder
Depends on: none
Conflict key: `agent-queue-admission`

Tasks:
- validate #1372;
- merge one canonical admission path;
- close #1308 and #1359 as superseded after validation;
- rebase/update opsly-control #11 to consume `opsly/main`;
- update opsly-control #12 prerequisites to canonical PRs;
- do not mix anti-abuse changes into the integration merge.

Done when:
- one GitHub submitter path exists;
- independent workpacks fast-enqueue;
- dependencies/conflicts isolate only affected work;
- no direct runtime spawn exists;
- no paid fallback exists.

### INT-001 Admission hardening
Priority: P0
Owner role: security/platform builder
Depends on: INT-000 contract stable
Conflict key: `local-prompt-admission`

Tasks:
- validate #1370;
- keep token + IP + tenant rate limits;
- keep global queue depth cap;
- verify trusted proxy opt-in;
- verify Redis unavailable => fail closed;
- stress test duplicate/idempotent submissions;
- document retry behavior after Gamer restart.

Done when:
- abuse controls are deterministic;
- legitimate independent work still parallelizes;
- at-most-2 retry policy is proven;
- queue persistence across node restart is evidenced.

### INT-002 Physical zero-cost E2E
Priority: P0
Owner role: runtime operator
Depends on: INT-000, readiness gates
Conflict key: `gamer-opencode-physical`

Tasks:
- validate Mac runner online;
- validate PC Gamer online;
- validate OpenCode bridge/service;
- validate local Ollama model already present;
- validate Doppler secret preflight;
- execute exact governed path;
- require `GAMER_OPENCODE_OK`;
- prove ephemeral session teardown.

Done when:
GitHub → queue → Gamer → OpenCode → local Ollama → exact marker → teardown succeeds with no paid API fallback.

## Wave 1 — Add cognition contracts

### INT-010 TaskGraphV1
Priority: P1
Owner role: architect
Depends on: INT-000
Conflict key: `agent-task-graph-contract`

Deliver:
- typed planner DAG;
- dependency semantics;
- conflict semantics;
- risk/cost/write metadata;
- acceptance/evidence requirements;
- deterministic validation.

Do not:
- create another task registry;
- create another queue;
- allow planner to mutate repositories.

### INT-011 Runtime capability matrix + ModelRouteDecisionV1
Priority: P1
Owner role: runtime architect
Depends on: INT-010
Conflict key: `runtime-routing-contract`

Deliver:
- capability inventory for OpenCode, Hermes, OpenClaw, Claude/Codex where configured;
- local/free-first policy;
- model/runtime escalation rules;
- placement constraints Mac/Gamer/VPS;
- explicit no-silent-paid-fallback;
- decision evidence: selected runtime + reason.

### INT-012 ContextAssemblyV1
Priority: P1
Owner role: knowledge/context builder
Depends on: INT-010
Conflict key: `context-assembly`

Deliver:
- ordered context sources;
- token/context budget;
- source attribution;
- tenant scope;
- retrieval-before-generation;
- duplicate/stale-document handling;
- context quality eval fixtures.

Extend existing Context Builder / Brain only.

### INT-013 ExecutionEvidenceV1
Priority: P1
Owner role: observability/eval builder
Depends on: INT-000
Conflict key: `agent-execution-evidence`

Deliver:
- request/task/runtime/node/session identifiers;
- queue/claim/start/finish timestamps;
- bounded result;
- test/eval outcome;
- retry/failure category;
- teardown evidence;
- secret-safe persistence.

Reuse Agent Lab / agent-learning ownership.

## Wave 2 — Verification and learning

### INT-020 Independent verifier
Priority: P1
Owner role: QA/evaluation
Depends on: INT-010, INT-013
Conflict key: `agent-verifier`

Deliver:
- PASS / FAIL / BLOCKED contract;
- architecture invariant checks;
- test/security/policy evidence;
- safe retry classification;
- builder/reviewer separation.

### INT-021 Routing evals
Priority: P2
Owner role: evaluation
Depends on: INT-011, INT-020
Conflict key: `runtime-routing-evals`

Create datasets for:
- easy code change;
- architecture review;
- large repo research;
- GPU/local-only task;
- tenant-sensitive task;
- tool-heavy workflow;
- unavailable-runtime fallback;
- paid-provider forbidden path.

Measure:
- first-pass success;
- latency;
- retries;
- policy violations;
- human rework.

### INT-022 Context evals
Priority: P2
Owner role: evaluation
Depends on: INT-012, INT-020
Conflict key: `context-evals`

Measure:
- relevant source recall;
- irrelevant context ratio;
- stale source use;
- tenant leakage;
- duplicate docs;
- context size vs task success.

## Wave 3 — Mission Control intelligence

### INT-030 Intelligence cockpit
Priority: P2
Owner role: Mission Control
Depends on: INT-013, INT-020
Conflict key: `mission-control-intelligence`

Show:
- active workstreams;
- dependency DAG;
- conflict locks;
- runtime placement;
- cost class;
- queue depth;
- verifier state;
- retries;
- blocked reason;
- latest evidence;
- human decisions pending.

Do not create a second scheduler or approval system.

## Agent workpack standard

Every new AI-agent task must state:

1. goal;
2. canonical owner/package;
3. files allowed to change;
4. files forbidden to change;
5. workstream;
6. conflict key;
7. dependencies;
8. runtime capability;
9. cost class;
10. risk class;
11. write intent;
12. approval need;
13. tests;
14. evidence;
15. stop conditions.

## Stop conditions

Agent must stop and mark BLOCKED when:

- canonical owner is ambiguous;
- capability already exists elsewhere;
- upstream contract is unstable;
- required approval is absent;
- paid fallback would be required;
- production mutation is necessary but not explicitly approved;
- tenant boundary cannot be proven;
- another active lane owns the same conflict key;
- tests cannot distinguish success from a fake/mock result.

## Merge waves

Wave A:
- canonical queue path;
- admission hardening;
- physical zero-cost E2E.

Wave B:
- TaskGraphV1;
- ModelRouteDecisionV1;
- ContextAssemblyV1;
- ExecutionEvidenceV1.

Wave C:
- independent verifier;
- routing/context evals.

Wave D:
- Mission Control intelligence cockpit;
- evidence-driven adaptive routing.

Do not start adaptive/self-improving routing before Wave C has measurable evals.
