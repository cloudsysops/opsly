---
status: canon
owner: architecture
last_review: 2026-09-12
type: architecture
tags:
  - opsly/agents
  - opsly/runtime
  - opsly/orchestrator
---

# Canonical Agent Runtime Architecture

This document is the source of truth for how Opsly executes AI-agent work.

## Core principle

Opsly governs **real runtimes**. It does not model long-lived fictional AI workers as the execution boundary.

The canonical lifecycle is:

```text
task source
  ↓
governed submit
  ↓
AgentTaskEnvelopeV1
  ↓
Opsly policy / approval gates
  ↓
BullMQ
  ↓
eligible compute worker
  ↓
authenticated runtime adapter / CLI bridge
  ↓
Session Manager
  ↓
ephemeral opsly-task-* tmux session
  ↓
real runtime
  ↓
bounded result / evidence
  ↓
session teardown
```

Healthy idle means **zero AI task sessions**. Persistent infrastructure may remain alive; persistent AI task runtimes may not.

## One control plane

Opsly must not create a second orchestrator for agent execution.

Canonical control components:

- `apps/orchestrator`
- BullMQ / Redis
- `lib/agent-task-core`
- `AgentTaskEnvelopeV1`
- `AgentTaskRuntime`
- `config/external-agent-registry.json`
- `lib/session-manager`
- authenticated CLI/runtime bridges

Any GitHub, scheduler, n8n or local watcher integration must converge on this path instead of spawning an AI CLI directly.

## Machine roles

| Node | Canonical responsibility | Must not do |
|---|---|---|
| GitHub / VPS control plane | source tasks, policy, CI, queue coordination, deploy gates | become an ad-hoc local AI executor |
| Mac | local control/execution node for eligible CLI runtimes and background read-only work | silently claim `local_opencode` intended for Gamer |
| PC Gamer | `local_opencode` compute path, OpenCode + local Ollama/GPU, other explicitly registered GPU work | fall back to paid providers without policy |
| Production VPS | shared platform/control services and queue coordination | run opportunistic background AI work by default |

## Real runtime adapters

The canonical static registry is:

`config/external-agent-registry.json`

Examples currently wired through authenticated bridges include:

| Runtime | Typical Opsly kind | Current bridge example |
|---|---|---|
| Claude Code | `local_claude` | :5002 |
| OpenCode | `local_opencode` | :5004 |
| Codex CLI | `local_codex` | :5005 |
| Hermes Agent | registered Hermes runtime kind | :5007 |
| OpenClaw | registered external runtime / worker capability | registry-driven |

Ports are deployment details. The registry and runtime adapter configuration are authoritative.

Names such as planner, developer, reviewer, architect or QA are **roles**, not proof that a dedicated persistent process exists.

## AgentTaskEnvelopeV1

`AgentTaskEnvelopeV1` is the execution contract.

It carries the selected agent/runtime, role, constraints, task identity and governance metadata.

Default behavior is fail-closed:

- legacy local payloads are not accepted by default;
- any temporary legacy escape hatch must be explicit;
- sensitive capabilities require policy approval;
- task identity and idempotency must survive enqueueing;
- custom BullMQ IDs must be BullMQ-safe.

## GitHub Agent Queue

The GitHub Agent Queue is a control-plane entry point, not a second scheduler.

Canonical target flow:

```text
opsly-control workpack
  ↓
scripts/ops/github-agent-queue-submit.mjs
  ↓
POST /api/local/prompt-submit
  ↓
AgentTaskEnvelopeV1
  ↓
BullMQ local-agents
  ↓
eligible worker
  ↓
real runtime
```

Current policy:

- only zero-cost local work is eligible;
- production deploy and paid-infra work fail closed;
- autonomous GitHub dispatch is intentionally **read-only**;
- write-capable GitHub work remains blocked until a typed approval chain is implemented;
- a completed queue job is not sufficient for physical acceptance: acceptance may require an exact returned marker such as `GAMER_OPENCODE_OK`.

The future typed write-approval work is tracked in:

`docs/01-development/night-queue/051-github-queue-write-approval.md`

## Background scheduler

The background scheduler is opportunistic, not a persistent AI daemon.

It reuses:

`resource probe → idle policy → task selector → concurrency guard → cost policy → /api/local/prompt-submit`

Current autonomous execution policy is read-only. A workpack with write intent must remain blocked until the typed approval path exists.

No second queue or watcher should be introduced to bypass this rule.

## PC Gamer golden path

The physical acceptance target is:

```text
GitHub
  ↓
canonical governed submitter
  ↓
AgentTaskEnvelopeV1
  ↓
BullMQ local-agents
  ↓
PC Gamer claims local_opencode
  ↓
OpenCode
  ↓
local Ollama model
  ↓
GAMER_OPENCODE_OK
  ↓
terminal success
  ↓
ephemeral session teardown
  ↓
healthy idle
```

Forbidden fallbacks for this acceptance test:

- Mac claiming `local_opencode`;
- paid LLM provider fallback;
- model download during the test;
- production mutation;
- persistent AI runtime.

## Physical Mac runtime

The canonical Mac bootstrap is:

```bash
npm run opsly:mac:activate
```

The bootstrap:

1. validates local prerequisites and Doppler access;
2. builds execution-boundary packages;
3. installs/refreshes permitted persistent infrastructure services;
4. waits for bridge/orchestrator health using a bounded deadline;
5. runs the readiness doctor;
6. preserves the invariant that AI task sessions are ephemeral.

The health wait defaults to 90 seconds and can be bounded with:

`OPSLY_MAC_HEALTH_WAIT_SECONDS`

Allowed range: 10–300 seconds.

A CI pass does not replace physical validation.

## Persistent infrastructure vs ephemeral AI work

Allowed to remain alive:

- orchestrator process;
- queue worker process;
- prompt watcher;
- authenticated runtime bridge;
- Redis;
- launchd/systemd service wrappers.

Must be created per task and destroyed after completion:

- `opsly-task-*` tmux sessions;
- runtime invocation state;
- temporary raw task artifacts unless explicitly retained as bounded evidence.

## Write approval

Do not use an HTTP header alone as proof that a write-capable AgentTask is approved.

The target write model is:

```text
tracked write intent
  + exact task/request identity
  + trusted approval event
  ↓
typed approval reference in AgentTaskEnvelopeV1
  ↓
AgentTaskRuntime validation
  ↓
write_allowed=true
```

Approval must not be replayable for another task, workpack or SHA.

Until that contract exists, autonomous background/GitHub write tasks remain held.

## Evidence

A governed execution should eventually answer:

- what task ran;
- which runtime ran it;
- which node claimed it;
- when it was queued and claimed;
- which ephemeral session was created;
- terminal state;
- bounded result/evidence;
- whether teardown completed.

Do not persist raw secrets or unrestricted raw prompts as evidence.

## Related docs

- [Current automation map](CURRENT-AUTOMATION-MAP.md)
- [Background work scheduler](BACKGROUND-WORK-SCHEDULER.md)
- [Orchestrator](ORCHESTRATOR.md)
- [Agent prompt queue](../01-development/AGENT-PROMPT-QUEUE.md)
- [Runtime status snapshot](../01-development/AGENT-RUNTIME-STATUS-2026-09-12.md)
