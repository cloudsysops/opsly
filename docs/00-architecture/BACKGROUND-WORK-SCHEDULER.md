---
status: draft
owner: claude
last_review: 2026-09-12
type: architecture-note
tags:
  - opsly/agents
  - opsly/scheduler
---

# Background Work Scheduler — opportunistic, not cron-fixed

## Goal

No agents running on a fixed schedule. A scheduler that checks resource
capacity and only dispatches background maintenance work when a node
genuinely has spare capacity — same "0 AI runtimes at idle" invariant as the
Mac ephemeral runtime work (#1216/#1225), applied to *why* a task starts, not
just *how* it tears down.

## Canonical flow (target)

```
heartbeat/resource snapshot
        v
RAM/CPU/GPU free?
        v
eligible background tasks exist?
        v
policy / cost gate
        v
select task
        v
AgentTaskEnvelopeV1
        v
Session Manager
        v
ephemeral tmux
        v
real runtime
        v
evidence
        v
teardown
```

No new orchestrator, no new queue. Reuses BullMQ, Session Manager,
`AgentTaskEnvelopeV1`, `compute-workers.json`'s capability-routing
conventions, and (eventually) the cost gate being built in #1238.

## What this PR delivers (the first two boxes only)

```
heartbeat/resource snapshot   <- resource-probe.mjs   [THIS PR]
        v
RAM/CPU/GPU free?             <- idle-window-policy.mjs [THIS PR]
        v
eligible background tasks exist?   <- NOT BUILT YET (TaskSelector)
        v
policy / cost gate             <- NOT BUILT YET (reuse #1238 once merged)
        v
...                             <- NOT BUILT YET (ConcurrencyGuard, wiring)
```

### `scripts/ops/resource-probe.mjs`

Reads a point-in-time snapshot of the *current* node: RAM free/total, CPU
load (via Node's built-in `os` module — portable across the Mac, PC-Gamer,
and VPS with no platform-specific parsing), and GPU VRAM free/utilization
(via `nvidia-smi`, present on the PC-Gamer node; absence degrades to
`has_gpu: false`, never a fabricated reading).

Deliberately does **not** read the Redis heartbeat
(`apps/orchestrator/src/infra/heartbeat.ts::recordOrchestratorHeartbeat`) —
grepping the orchestrator confirms that function has zero callers anywhere.
A check against it would report on a mechanism nothing writes to yet. See
`docs/00-architecture/CURRENT-AUTOMATION-MAP.md` for where this was first
found (during #1222's readiness-doctor work). Wiring a real heartbeat
writer/reader is a separate, later decision — not this PR's to make.

### `scripts/ops/idle-window-policy.mjs`

Pure decision function: given a resource snapshot and a node type
(`mac`/`gamer`/`vps`), returns `{eligible, reasons}` against the thresholds
agreed on the epic thread:

| Node | Thresholds |
|---|---|
| `mac` | RAM free > 6 GB, CPU load < 60%, max 1 background agent |
| `gamer` | RAM free > 12 GB, GPU VRAM free > 35%, GPU util < 25%, max 1 background agent |
| `vps` | max 0 background agents — coordinates, never executes |

Accumulates every failing reason rather than stopping at the first (same
pattern as `TaskSourceGuard` and the dispatcher trust gate).

**Deliberately out of scope for this function**: "no foreground task / no
gaming lock" is *caller-supplied* via `active_lock_reasons`, not detected
here. The PC-Gamer node already has a real signal for this
(`config/pc-gamer-schedule.json` modes + `pc-gamer-gameplay-watcher.mjs`) — a
caller on that node should populate `active_lock_reasons` from those, not
have this module reinvent game/foreground detection. **No equivalent Mac
"is a human actively using this machine" signal exists yet** — that gap is
named here, not fixed.

**Known limitation, documented in the test suite rather than hidden**: the
VPS's `max_background_agents: 0` is the *default* policy, not an
unconditional invariant of the function — a caller passing an explicit
`thresholds` override could raise it. The hard "VPS never executes" guarantee
must live in whoever calls this with the VPS's node type, by never passing
that override — not in this function alone.

## Explicitly not built here

- **TaskSelector** — which background task to run (CI triage, drift scans,
  stale-task audits, etc. per the priority table on epic #1225's thread).
- **ConcurrencyGuard** — cross-node/cross-fleet concurrency tracking (this PR
  only knows about the single node it's called for).
- **Cost gate integration** — must reuse `config/cloud-cost-policy.json` /
  `scripts/ops/cloud-cost-policy-check.mjs` from #1238 once merged, not
  invent a second cost model.
- **Wiring into `AgentTaskEnvelopeV1` / Session Manager / a scheduling loop**
  (the "every 10 min" cron in the epic design) — this PR is read-only
  decision logic, it does not create or dispatch any task.
- **The five "start first" automations** (CI failure triage, stale/stuck task
  audit, open PR readiness review, docs/code drift scan, security/config
  drift scan) named on the epic thread — none of their prompts/logic are
  implemented here.

## Testing

26 tests across `resource-probe.test.mjs` and `idle-window-policy.test.mjs`:
dependency-injected OS/exec so nothing requires real GPU hardware or a
specific host to verify; the VPS-override gap above is asserted explicitly
rather than assumed safe.

## Related

- Epic #1225, coordination comment on #1225 (BackgroundWorkScheduler design)
- `docs/00-architecture/CURRENT-AUTOMATION-MAP.md` (heartbeat gap first found here)
- `config/compute-workers.json` (existing capability-routing conventions this reuses in spirit)
- `config/pc-gamer-schedule.json`, `scripts/ops/pc-gamer-gameplay-watcher.mjs` (existing gaming-lock signal to be wired by callers)


## Phase 2 — selection and visibility

The next scheduler increment adds pure, non-dispatching decision logic:

- `scripts/ops/background-task-selector.mjs`
  - selects at most one pending safe task;
  - rejects blocked, active/duplicate, recently completed, approval-required, paid-infra and production-deploy work;
  - respects node type and resource class;
  - prioritizes P1 → P2 → P3, then smaller/shorter tasks.

- `scripts/ops/concurrency-guard.mjs`
  - Mac max 1 background task by default;
  - Gamer max 1;
  - fleet max 2;
  - VPS is a hard coordinator-only invariant and cannot be made executable by caller override.

- `scripts/ops/background-work-decision.mjs`
  - composes IdleWindowPolicy + TaskSelector + ConcurrencyGuard;
  - returns `RUN | NO_CAPACITY | NO_SAFE_TASK`;
  - does not enqueue work.

- `scripts/ops/night-queue-candidates.mjs`
  - compiles tracked `docs/01-development/night-queue/*.md` workpacks into normalized candidates.

- `scripts/ops/night-queue-status.mjs`
  - combines tracked task state with local queue metadata for operator visibility;
  - supports text and JSON output.

Still intentionally separate:
- cost gate wiring uses the already-merged free-first policy;
- AgentTask enqueue waits for the canonical Mac ephemeral runtime integration;
- GitHub-visible atomic claim/writeback remains the final automation step;
- no second queue, watcher, or orchestrator is introduced.
