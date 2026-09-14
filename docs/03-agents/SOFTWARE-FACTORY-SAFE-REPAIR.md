# Software Factory Safe Repair v1

This is the bounded mutation lane for verifier failures. It extends the existing repair-queue design; it does not create another task store.

## V1 automatic action

Only a single **failed GitHub Actions rerun** is automatically eligible, and only when all of these are true:

- failure class is `INFRA/TRANSIENT`;
- action is `rerun_failed_jobs`;
- PR head still equals the requested `expected_head_sha`;
- affected paths are outside protected surfaces;
- the automatic attempt budget is not exhausted.

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
  "failure_class": "INFRA/TRANSIENT",
  "action": "rerun_failed_jobs",
  "run_id": 456,
  "attempt": 0,
  "affected_paths": ["apps/admin"]
}
```

Dry-run is the default. `--apply` performs the bounded rerun only after live PR/head/file validation.
