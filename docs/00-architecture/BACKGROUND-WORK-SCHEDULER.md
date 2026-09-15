---
status: accepted
owner: platform
last_review: 2026-09-12
type: architecture-note
tags:
  - opsly/agents
  - opsly/scheduler
---

# Background Work Scheduler

The background scheduler is an opportunistic task selector and governed submitter.

It is **not** a persistent AI daemon and it is **not** a second orchestrator.

## Canonical flow

```text
resource snapshot
  ↓
idle-window policy
  ↓
eligible tracked workpack
  ↓
task selector
  ↓
concurrency guard
  ↓
cloud/free-first cost gate
  ↓
local anti-duplicate lock/state
  ↓
POST /api/local/prompt-submit
  ↓
AgentTaskEnvelopeV1
  ↓
BullMQ local-agents
  ↓
eligible worker
  ↓
Session Manager
  ↓
ephemeral runtime
  ↓
terminal result
  ↓
teardown
```

## Current implementation

The scheduler already includes:

- `scripts/ops/resource-probe.mjs`
- `scripts/ops/idle-window-policy.mjs`
- `scripts/ops/background-task-selector.mjs`
- `scripts/ops/concurrency-guard.mjs`
- `scripts/ops/background-work-decision.mjs`
- `scripts/ops/night-queue-candidates.mjs`
- `scripts/ops/night-queue-status.mjs`
- `scripts/ops/background-scheduler-dispatch.mjs`

The tracked source of work is:

`docs/01-development/night-queue/*.md`

## Node policy

Typical defaults:

| Node | Policy |
|---|---|
| Mac | may run at most one eligible background task when idle |
| Gamer | may run at most one eligible GPU/local task when idle |
| VPS | coordinator-only for opportunistic AI execution |

The caller must respect foreground/gaming locks where applicable.

## Execution gate

Dry-run / decision mode remains the safe default.

Execution requires explicit enablement and the canonical governed endpoint.

The scheduler must never spawn an AI CLI directly.

## Current autonomy policy: read-only

Autonomous background writes are deliberately disabled until typed approval exists.

A workpack with write intent such as `requires_pr=true` must stop with an explicit blocker instead of being auto-approved.

This prevents an external header or scheduler flag from silently granting `write_allowed=true`.

The held approval design is:

`docs/01-development/night-queue/051-github-queue-write-approval.md`

## Prepared-only behavior

A response such as:

```json
{
  "prepared_only": true,
  "job_id": null
}
```

does not mean the task was queued.

The scheduler must report a blocked/prepared-only state and must not claim execution occurred.

## Terminal results

BullMQ job results are exposed through `returnvalue`.

The scheduler preserves terminal evidence rather than discarding it.

## Resource classes and work selection

Task selection considers:

- tracked status;
- priority;
- node type;
- resource class;
- current active work;
- approval requirement;
- production-deploy flag;
- paid-infrastructure flag;
- free-first cost policy.

Held tasks are not eligible.

## Current safe queue

As of 2026-09-12:

```text
045  pending  read-only audit
046  held     write-capable
047  held     write-capable
048  held     write-capable
049  held     write-capable
050  pending  Gamer-only physical acceptance
051  held     typed write approval
```

This prevents the 10-minute scheduler loop from repeatedly selecting a task that must fail closed for lack of approval.

## Evidence and healthy idle

A completed task should leave enough bounded evidence to identify:

- task;
- runtime;
- compute node;
- terminal state;
- teardown.

Healthy idle remains:

```text
0 opsly-task-* sessions
```

## Operator commands

Decision/preview commands remain under the `opsly:background:*` npm scripts.

Do not enable execution until the physical Mac runtime is healthy and the workpack is eligible under the read-only policy.

## Related

- [Canonical agent runtime architecture](AGENT-RUNTIME-ARCHITECTURE.md)
- [Current automation map](CURRENT-AUTOMATION-MAP.md)
- [Agent runtime status](../01-development/AGENT-RUNTIME-STATUS-2026-09-12.md)
