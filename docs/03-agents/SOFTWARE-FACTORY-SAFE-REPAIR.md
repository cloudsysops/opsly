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
