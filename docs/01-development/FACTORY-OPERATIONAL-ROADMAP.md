# Opsly Factory Operational Roadmap

Status: ACTIVE  
Canonical control issue: #1581  
Implementation tracks: #1586, #1587, #1588  
Runtime prerequisites: #1516, #1585  
Backlog/WIP prerequisites: #1584, #1570, #1559

## Objective

Opsly must treat Hermes, OpenClaw and future registered runtimes as governed factory capacity. A worker is not considered operational merely because it is registered, its port is healthy, or unit/integration tests pass. Operational status requires runtime evidence and participation in the canonical work lifecycle.

## Canonical operating loop

```text
GitHub backlog
    |
    v
PR Reconciler (#1587)
 detect + classify + exact head
    |
    v
Canonical work queue / workpack
    |
    v
claim + renewable lease (#1586)
    |
    +--------------------+
    |                    |
    v                    v
 Hermes               OpenClaw
 diagnose/fix         governed execution
 tests/evidence       validation/evidence
    |                    |
    +---------+----------+
              v
       same PR / branch
              |
              v
 CI + security + qualifying review + supervisor
              |
       +------+------+
       |             |
     GREEN          FAIL
       |             |
 governed merge   release lease
       |             |
 cleanup          RETRYABLE -> QUEUED
       |                         |
 evidence                    another worker
       |
 next work
```

Repeated equivalent/no-progress failures end in `NEEDS_HUMAN`.

## Reconciler lanes

Every open PR has exactly one current lane:

- `MERGE_READY`: current-main compatible and exact-head required gates are green.
- `FIX_REQUIRED`: real lint/build/security/test failure; dispatch through canonical PR Doctor/registry.
- `REBASE_RECONCILE`: stale, conflicted or stacked branch requiring reconciliation.
- `SUPERSEDED_DUPLICATE`: equivalent/newer work already landed; close only with evidence.
- `HOLD_PROTECTED`: draft, Peskids, production, migration, runtime-sensitive, missing live E2E or governance decision required.

Policy checks are not code failures. `production-change-window` and independent-review gates must never be sent to an agent as a code repair request.

## Worker lifecycle

Canonical states:

`QUEUED -> CLAIMED -> FIXING/EXECUTING -> VALIDATING -> READY_TO_MERGE -> MERGED -> CLEANED`

Recovery states:

`CLAIMED/EXECUTING -> RETRYABLE -> QUEUED`

`RETRYABLE -> NEEDS_HUMAN` after bounded no-progress attempts.

A claim is tied to canonical `work_id`, PR/head SHA and `conflict_key`. The lease is renewable only while the worker heartbeat remains valid. Lease expiry releases the work; it does not create a new PR or erase previous attempt evidence.

## Runtime truth

Mission Control must distinguish:

- registry enabled/disabled;
- runtime `LIVE`, `OFFLINE` or `UNKNOWN`;
- `dispatch_eligible`;
- active work/lease;
- last physical acceptance and timestamp;
- attempt/retry count and terminal blocker.

#1516 is the runtime-observability prerequisite. #1585 provides remotely dispatchable physical acceptance on the controlled self-hosted macOS node using the existing canonical `opsly:mac:go-live` smoke.

## Physical acceptance

Hermes and OpenClaw each require a real governed task that traverses the production-shaped local execution path, returns the exact expected marker, tears down task sessions, leaves the repository clean, and stores evidence. A successful health endpoint alone is not acceptance.

Physical acceptance must not deploy production, mutate Peskids, invoke paid fallback infrastructure, or bypass worker policy.

## WIP and idempotency

- One canonical work identity for the same `conflict_key`/workstream.
- Prefer `JOIN_EXISTING` to creating another PR.
- Auto-generated PR producers have bounded open WIP.
- Dispatch is idempotent for the same PR/head SHA and work identity.
- Re-running reconciliation without upstream state changes must converge to the same classification and must not duplicate work, PRs or evidence comments.

## Governed merge and cleanup

The factory may merge only work classified `MERGE_READY` whose exact head has all required CI/security checks and qualifying review/supervisor gates green. Never admin-force a red or running gate.

After GitHub confirms the merge, the factory may clean only the ephemeral branch/worktree it owns. Protected, shared, release and environment refs are never deleted by generic cleanup.

## Protection invariants

The reconciliation/factory path must fail closed for autonomous Peskids changes, production data/schema/migrations, production deploys, secrets, DNS/routing/firewall, n8n side effects, auth/billing changes, or any explicit governance hold. No direct push to `main`.

## Definition: Factory Operational

The factory is certified operational only after #1588 records all of the following with real evidence:

1. Happy path: real safe `FIX_REQUIRED` -> classification -> queue -> worker -> fix -> same PR -> CI/review -> governed merge -> cleanup -> next work.
2. Failover: worker A fails or lease expires -> same work requeued -> worker B completes without duplicate work identity/PR.
3. Protection: protected work remains `HOLD_PROTECTED` and cannot be autonomously mutated.
4. No-progress: bounded repeated failure reaches `NEEDS_HUMAN` rather than looping forever.
5. Offline recovery: a worker disappearing mid-job does not cause duplicate execution and the queue converges.

## Current execution order

1. Runtime truth: finish #1516.
2. Remote physical acceptance: land #1585; run Hermes and OpenClaw evidence.
3. Backlog/WIP control: land #1584, finish #1570, reconcile #1559.
4. Canonical classification/dispatch: implement #1587.
5. Claim/lease/retry/failover: implement #1586.
6. Mission Control projection for lanes, claims, retries, worker utilization and acceptance truth.
7. Run #1588 and declare Factory Operational only from its evidence.

## Evidence discipline

#1581 is the canonical control item. Implementation PRs and agents should link evidence there instead of creating competing orchestration systems. Evidence must identify exact work/PR/head, worker/attempt, relevant checks/reviews, terminal state and cleanup result.
