---
status: experimental
owner: platform
last_review: 2026-09-18
type: agent-runbook
tags:
  - opsly/agents
  - opsly/hermes
  - opsly/software-factory
---

# Hermes Army Controller v1

## Purpose

Turn one human objective into governed parallel Opsly work without creating another orchestrator.

The controller is a thin command surface over the existing canonical path:

```text
human objective
  ↓
Hermes Commander (planning only)
  ↓
TaskGraphV1
  ↓
dependency/conflict validation
  ↓
wave 0 ─┬─ task A
        └─ task B
  ↓
POST /api/local/prompt-submit
  ↓
DispatchClaimV1 + runtime policy
  ↓
BullMQ local-agents
  ↓
eligible real runtime
  ↓
evidence / terminal result
  ↓
next wave
```

It does not create a task database, queue, registry, scheduler or persistent AI army.

## Roles

Hermes is the commander/planner. TaskGraph nodes use capability roles such as:

- `architecture`
- `planning`
- `implementation`
- `debugging`
- `review`
- `security_review`
- `tests`
- `assistant`

The existing external-agent registry chooses the actual runtime. A role is not a persistent fictional worker.

## Safety

V1 is intentionally fail-closed:

- plan-only is the default;
- execution requires `--apply`;
- paid nodes are held;
- nodes marked `requiresApproval` are held;
- write-capable nodes require a `conflictKey`;
- writes pass through the existing DispatchClaimV1 gate;
- dependencies advance wave-by-wave only after the current wave reaches terminal success;
- no silent paid fallback is enabled by this controller;
- no second orchestrator or task store is introduced.

Downstream Opsly policy, runtime governance, PR gates and production protections remain authoritative.

## Run

Requires a reachable orchestrator and `PLATFORM_ADMIN_TOKEN`.

Plan only:

```bash
OPSLY_ORCHESTRATOR_URL=http://127.0.0.1:3011 \
npx tsx scripts/ops/hermes-army-controller.ts \
  --objective "Audit Mission Control and propose the smallest safe reliability improvements"
```

Execute a validated objective:

```bash
OPSLY_ORCHESTRATOR_URL=http://127.0.0.1:3011 \
npx tsx scripts/ops/hermes-army-controller.ts \
  --objective "Improve Mission Control runtime truth without touching Peskids or production" \
  --apply
```

For a remote VPS control plane, use the existing private/Tailscale URL rather than adding public ingress.

## Execution semantics

1. The controller submits a read-only planning task explicitly to `local_hermes`.
2. Hermes must return one JSON `TaskGraphV1`.
3. The controller validates DAG structure, maximum size and write ownership metadata.
4. `planTaskGraphWaves()` determines safe parallel waves.
5. Each dispatch uses `agent: null`, allowing the existing registry/runtime truth to select an eligible real runtime.
6. Write tasks include task/workstream/conflict metadata so the normal DispatchClaimV1 gate owns the scope.
7. The controller waits for BullMQ terminal status before releasing the next dependency wave.
8. `ALREADY_DONE` is reused instead of repeated.
9. `JOIN_EXISTING` reuses an existing job when the canonical submit API provides its job id.
10. Any failed or held node stops downstream waves.

## What this replaces conceptually

Do not build a new QueenBee/bot fleet for this flow. Older Hive/Agent Farm concepts may remain for compatibility, but the Army Controller uses the current intelligence contracts:

- `TaskGraphV1`
- `DispatchClaimV1`
- `AgentTaskEnvelopeV1`
- external-agent registry
- runtime truth
- BullMQ
- Session Manager
- existing evidence/review gates

## First physical pilot

Use a bounded read-heavy objective first:

```text
Inspect the current Software Factory and identify one safe, non-Peskids reliability improvement.
If code is required, implement it on one branch/PR, run tests, request independent review,
and do not deploy production.
```

Success is not "Hermes returned a plan". Success is:

- a valid TaskGraph was produced;
- at least one real runtime executed;
- write ownership was claimed where needed;
- terminal job evidence exists;
- no duplicate work was created;
- no paid provider was required;
- downstream review/CI gates remain intact.
