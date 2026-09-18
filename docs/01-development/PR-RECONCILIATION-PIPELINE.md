# PR Reconciliation Pipeline

## Goal

Opsly may have many concurrent agent branches and pull requests. The reconciliation pipeline provides one shared, deterministic view of what can safely advance without making every agent independently rediscover repository state.

## Safety model

The controller is evidence-first but actionable. It may automatically:
- re-dispatch the canonical read-only Open Review Agent when exact-head independent review is missing/stale;
- route real technical CI failures on non-protected PRs to the existing PR Doctor repair path;
- keep exact-head/idempotency guards around every dispatch.

It MUST NOT:
- merge a pull request itself;
- deploy production;
- apply `safe-daytime` or `hotfix-prod`;
- rotate secrets;
- mutate production data;
- change n8n side effects;
- change DNS or routing;
- branch-mutate protected surfaces.

Peskids and production/runtime-sensitive changes remain `protected: true`: they can be reviewed/diagnosed automatically, but reconciliation never sends autonomous branch mutations for them.

## Lanes

Each open PR is assigned one lane:

| Lane | Meaning | Default action |
| --- | --- | --- |
| `MERGE_READY` | Mergeable, current, checks complete, no review blocker | Candidate for supervised squash merge |
| `BEHIND` | Clean but behind its base | Reconcile with latest base |
| `CONFLICTED` | GitHub reports dirty/non-mergeable | Assign one reconciliation worker |
| `CHECK_FAILED` | At least one technical check failed | Inspect/fix only safe scoped failures |
| `CHECK_PENDING` | Checks are still running/waiting | Do not duplicate work |
| `REVIEW_BLOCKED` | Latest reviewer state requests changes | Address review before reconciliation |
| `SUPERSEDED` | Another open PR explicitly supersedes it | Do not spend reconciliation capacity |
| `PROTECTED` | Peskids/prod/runtime-sensitive surface | Explicit approval/supervision required |
| `UNKNOWN` | State cannot be classified safely | Manual inspection |

## Ownership rule

A reconciliation worker owns exactly one PR head branch at a time. Two workers MUST NOT mutate the same branch concurrently.

Before every write, the worker re-reads the PR head SHA. If the SHA changed, the worker aborts its planned write and recomputes from the new head.

Before every merge, the worker MUST:

1. re-read the PR state;
2. verify the PR is open and mergeable;
3. verify required technical checks are green;
4. verify no material unresolved review feedback remains;
5. capture the current head SHA;
6. squash-merge with that SHA as `expected_head_sha`.

If the branch moves, GitHub must reject the merge and the worker starts validation again.

## Merge train behavior

A merge into `main` can make other PRs stale. Therefore the queue is recalculated after each main-branch merge rather than assuming a previous inventory remains valid.

Priority order for capacity:

1. `MERGE_READY`
2. `BEHIND`
3. `CONFLICTED`
4. `CHECK_FAILED`
5. `REVIEW_BLOCKED`

`SUPERSEDED` consumes no reconciliation capacity. `PROTECTED` may enter read-only review/diagnostic reconciliation but never autonomous branch mutation or merge.

## Supervised agent handoff

The pipeline prepares `AgentTaskEnvelopeV1` records for actionable workpacks.

Each envelope carries:

- one exclusive `conflictKey` derived from the PR/branch lock;
- the exact `expectedHeadSha` captured during inventory;
- the PR head/base and reconciliation lane;
- `requiresApproval: true`;
- `productionDeploy: false`;
- zero paid-infrastructure budget.

The generic AgentTaskEnvelope artifact remains supervised-only. The controller does not create a second writer: safe technical repairs reuse the existing PR Doctor → Orchestrator → DispatchClaim path, while independent review reuse the existing read-only Open Review Agent. Generic write-capable GitHub Agent Queue envelopes remain held behind the typed approval contract.

## Cleanup

Merged or superseded branches are cleanup candidates only after confirming they are no longer the head of an active PR and are not a dependency base for another active PR. Cleanup must never force-delete a branch.

## Implementation

- Policy: `config/pr-reconciliation-policy.json`
- Inventory: `scripts/ops/pr-reconciliation-inventory.mjs`
- Workpacks: `scripts/ops/pr-reconciliation-workpacks.mjs`
- Agent envelopes: `scripts/ops/pr-reconciliation-agent-envelopes.mjs`
- Envelope contract test: `scripts/ops/__tests__/pr-reconciliation-agent-envelopes.test.mjs`
- Workflow: `.github/workflows/pr-reconciliation-inventory.yml`

The hourly workflow publishes:

- `pr-reconciliation-inventory.json`;
- `pr-reconciliation-workpacks.json`;
- `pr-reconciliation-agent-envelopes.json`.

## Remaining boundary

Typed approval is still required before generic `BEHIND`/`CONFLICTED` write envelopes can execute autonomously. Until then, the controller automates only the already-canonical PR Doctor repair path and read-only reviewer re-dispatch. Merge remains independently gated and protected by exact-head checks.
