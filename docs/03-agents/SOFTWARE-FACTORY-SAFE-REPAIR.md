# Software Factory Safe Repair v1

This is the bounded mutation lane for verifier failures. It extends the existing repair-queue design; it does not create another task store.

## V1 automatic action

Only a single **failed GitHub Actions rerun** is automatically eligible, and only when all of these are true:

- failure class is `INFRA_TRANSIENT`;
- action is `rerun_failed_jobs`;
- PR head still equals the requested `expected_head_sha`;
- affected paths are outside the **canonical** protected-surface policy in `config/pr-reconciliation-policy.json`;
- the workflow run belongs to the requested PR and exact final head SHA;
- the workflow run is a completed failed `pull_request` run;
- the automatic attempt budget is derived from GitHub's real `run_attempt`, not caller input;
- PR files are paginated to completion; incomplete protection evidence fails closed.

Everything else is blocked for another governed lane.

## Explicitly not automatic

- code patches;
- merge;
- deployment;
- production data changes;
- migrations;
- secrets;
- DNS/routing;
- n8n side-effect changes;
- Peskids/protected product changes.

## Request example

```json
{
  "work_id": "sf-demo",
  "repository": "cloudsysops/opsly",
  "pr_number": 123,
  "expected_head_sha": "abc123",
  "failure_class": "INFRA_TRANSIENT",
  "action": "rerun_failed_jobs",
  "run_id": 456,
  "affected_paths": ["apps/admin"]
}
```

Dry-run is the default. `--apply` performs the bounded rerun only after live PR/head/file validation.


## Failure taxonomy

Safe Repair uses the canonical Mission Control blocker taxonomy:

`CODE | INFRA_TRANSIENT | POLICY_GATE | UPSTREAM_DEPENDENCY | RUNTIME_UNAVAILABLE | EVIDENCE_INSUFFICIENT | BLOCKED_ACCESS`.

Legacy separators such as `infra/transient` are normalized to `INFRA_TRANSIENT` at the boundary so older evidence can be consumed without creating a second vocabulary.


## Mutation serialization and verified classification

For `--apply`, Safe Repair is pinned to the canonical repair policy and protected-surface policy; caller-selected policy files are rejected.

The failure class used for authorization is **not trusted from the request**. The executor derives `INFRA_TRANSIENT` only when GitHub's complete workflow-job evidence shows exclusively transient terminal conclusions. A generic job `failure`, incomplete job listing, missing run attempt, missing SHA, or ambiguous classification is manual-only.

Before calling GitHub's rerun mutation, the executor:

1. acquires a Redis idempotency lock keyed by repository + run + run attempt;
2. re-reads the pull request and workflow run;
3. verifies exact head SHA, PR binding, run attempt, event, terminal failure state;
4. invokes `rerun-failed-jobs` only if all evidence is unchanged.

The successful lock remains for a bounded TTL so concurrent invocations cannot consume the same automatic repair attempt twice. This is an idempotency lock in the existing Redis control plane, not a second task store or scheduler.
