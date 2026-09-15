---
status: canon
owner: operations
last_review: 2026-09-12
type: guide
tags:
  - opsly/development
  - opsly/agents
---

# Agent Task Queues

Opsly has multiple task-entry surfaces, but only one governed runtime path.

Canonical architecture:
[Agent Runtime Architecture](../00-architecture/AGENT-RUNTIME-ARCHITECTURE.md).

## One execution path

```text
tracked/local/GitHub task source
  ↓
governed submit
  ↓
POST /api/local/prompt-submit
  ↓
AgentTaskEnvelopeV1
  ↓
policy / approval
  ↓
BullMQ local-agents
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
result / evidence
  ↓
teardown
```

No queue integration may bypass the orchestrator by spawning a real AI runtime directly.

## Queue surfaces

### 1. Tracked night/background workpacks

Canonical tracked backlog:

`docs/01-development/night-queue/*.md`

These workpacks carry safety metadata such as:

- status;
- priority;
- agent;
- owner;
- environment;
- cost class;
- estimated cost;
- PR/write intent;
- approval requirement;
- production deploy;
- paid infra;
- resource class;
- node type.

The background scheduler compiles these into candidates and selects only eligible work.

### 2. Local prompt queue

Local transient queue:

`.cursor/prompts/queue/*.md`

It is gitignored and can be seeded from tracked workpacks.

Use:

```bash
./scripts/ops/dispatch-prompt-queue.sh --dry-run
```

for inspection.

The dispatcher does not execute Markdown as shell and must not start a persistent AI runtime.

### 3. GitHub Agent Queue

The private `opsly-control` repository can stage governed workpacks that call the canonical submitter in `opsly/main`.

Current autonomous policy is read-only.

Eligible work must be zero-cost local work and must not request:

- production deployment;
- paid infrastructure;
- approval-required sensitive execution;
- autonomous PR/write capability.

Write-capable GitHub work remains blocked until the typed approval design in workpack 051 is implemented.

## Local watcher

The maintained local watcher submits work through the orchestrator:

```bash
PLATFORM_ADMIN_TOKEN="<token>" \
ORCHESTRATOR_URL="http://localhost:3011" \
npm run opsly:local-prompt-watcher
```

Single pass:

```bash
PLATFORM_ADMIN_TOKEN="<token>" npm run opsly:local-prompt-watcher:once
```

The watcher:

- reads pending prompt files;
- submits to `POST /api/local/prompt-submit`;
- polls terminal status;
- writes bounded response metadata;
- does not execute Markdown shell blocks.

## Git trust

Automatic tracked-task pickup must use a trusted branch, normally `main`.

Fast-forward sync may be used only when safe; dirty trees, detached HEADs or untrusted branches must not become automatic task sources.

## Runtime invariants

- `PLATFORM_ADMIN_TOKEN` is required for governed local submit;
- `AgentTaskEnvelopeV1` is the canonical execution contract;
- legacy payload fallback is break-glass only;
- runtime invocation is ephemeral;
- healthy idle means zero `opsly-task-*` sessions;
- real runtime names come from `config/external-agent-registry.json`;
- roles such as planner/reviewer/developer do not imply persistent processes.

## Read vs write work

Read-only work may execute without write approval when all other policy gates pass.

Write-capable autonomous work is currently held.

Do not infer write approval from:

- a scheduler flag;
- a GitHub label alone;
- an HTTP header alone.

Future write approval must be typed, bound to exact task identity and validated inside `AgentTaskRuntime`.

## Physical Mac activation

Canonical activation:

```bash
npm run opsly:mac:activate
```

The physical readiness path validates:

1. prerequisites;
2. Doppler access;
3. execution-boundary builds;
4. bridge/orchestrator health;
5. readiness doctor;
6. zero AI task sessions at healthy idle.

The health deadline defaults to 90 seconds and is bounded by `OPSLY_MAC_HEALTH_WAIT_SECONDS` between 10 and 300 seconds.

## Gamer physical acceptance

The target acceptance path is:

```text
GitHub
→ canonical submitter
→ AgentTaskEnvelopeV1
→ BullMQ local-agents
→ PC Gamer
→ OpenCode
→ Ollama
→ exact GAMER_OPENCODE_OK
→ terminal success
→ teardown
```

A merely queued job or generic completion is not sufficient.

## Current runtime workpacks

```text
045  pending  read-only audit
046  held     write-capable
047  held     write-capable
048  held     write-capable
049  held     write-capable
050  pending  Gamer-only physical acceptance
051  held     typed write approval
```

See the operational snapshot:
[AGENT-RUNTIME-STATUS-2026-09-12.md](AGENT-RUNTIME-STATUS-2026-09-12.md).

## Related

- [Canonical runtime architecture](../00-architecture/AGENT-RUNTIME-ARCHITECTURE.md)
- [Current automation map](../00-architecture/CURRENT-AUTOMATION-MAP.md)
- [Background scheduler](../00-architecture/BACKGROUND-WORK-SCHEDULER.md)
