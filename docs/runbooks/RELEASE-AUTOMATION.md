---
status: canon
owner: operations
last_review: 2026-09-07
---

# Release automation — merge ≠ staging ≠ production

A merge to `main` does **not** deploy production.

```
AI_BOARD_APPROVED PR
  → MERGE_TO_MAIN (CI/policy; any hour)
  → DEPLOY_STAGING (automatic; images tagged :staging + :sha, never :latest)
  → immutable ReleaseCandidate = origin/main SHA
  → PROMOTE_PRODUCTION (America/Bogota 22:00–06:00 exclusive)
  → health/smoke
  → rollback (revert-pr + retag previous SHA as :latest)
```

## Why night-merge failed on 2026-09-07

GitHub Actions cron is **UTC**. `0 6 * * *` is 01:00 Bogotá (correct conversion). Run 34115256013 started at `2026-09-07T11:10:37Z` = **06:10 Bogotá** — GitHub schedule delay, not a timezone bug. The window ends at 06:00 exclusive, so the job fail-closed. #1124 and #1125 did not merge.

Scheduler delay must **skip** (exit 0), not fail, so later in-window crons still run. Do not widen 22:00–06:00.

## Phases

| Phase | Trigger | Window | Production SSH |
|-------|---------|--------|----------------|
| `MERGE_TO_MAIN` | label `night-merge` or human merge | none | no |
| `DEPLOY_STAGING` | push `main` / `staging` | none | no (`/opt/opsly-staging`) |
| `PROMOTE_PRODUCTION` | `promote-production.yml` | 22:00–06:00 Bogotá | yes (`/opt/opsly`) |

Live promote SSH requires `workflow_dispatch` with **dry_run unchecked**, or repository variable `AUTO_PROMOTE_PRODUCTION=true`. Default is gate-only so a delayed cron cannot bounce prod.

## Image tags

- Push to `main`: `:staging` + `:${sha}` (not `:latest`) so Watchtower on prod does not auto-update.
- Promote: retag `:${sha}` → `:latest`, then compose pull on `/opt/opsly`.

## Deny list

`NIGHT_MERGE_DENY_PRS` defaults to `1123`. Never merge that PR as collateral.

## Tests

```bash
node --test scripts/ci/__tests__/release-pipeline.test.mjs
bash scripts/ci/__tests__/night-merge-select-deploy.test.sh
DRY_RUN=1 GITHUB_EVENT_NAME=schedule node scripts/ci/check-production-change-window.mjs --mode promote --event schedule
```
