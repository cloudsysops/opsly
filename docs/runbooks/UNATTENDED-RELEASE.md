---
status: canon
owner: operations
last_review: 2026-09-07
---

# Unattended night release (AI Board → wait → promote → verify → rollback)

The founder is not a cron job. LOW/MEDIUM Peskids releases can promote
unattended **after** the AI Board persists an immutable Release Candidate.

Approval belongs to a **SHA**, never to `main` / `HEAD`.

## Hosts

| Rol | URL |
| --- | --- |
| Production | `https://www.peskids.com` |
| Staging | `https://peskids-staging.op-sly.com` |
| Not prod | `peskids.op-sly.com` (308 to www) |

## Durable state

`config/release-candidates.json`

- `autonomousPromotion.enabled` — global kill switch. Default **`false`**.
- `autonomousPromotion.products.peskids` — per-product. Default **`false`**.
- `circuit.peskids` — open after 2 consecutive rollbacks until a human clears it.
- `candidates[]` — one row per approved SHA.

Do not store approval only in chat or a workflow log.

## State machine

`DRAFT → VALIDATING → BOARD_REVIEW → APPROVED → WAITING_FOR_WINDOW → PROMOTING → VERIFYING → RELEASED`

Also: `BLOCKED`, `SUPERSEDED`, `FAILED`, `ROLLING_BACK`, `ROLLED_BACK`, `EXPIRED`, `WAITING_FOR_HUMAN`.

## Policy (fail closed)

Autonomous promote only when **all** of these hold:

1. Risk is `low` or `medium` (HIGH/CRITICAL stay human).
2. Board seats Product / Architecture / Security / Database / QA / Release = `APPROVE`.
3. `migrationPlan` is `none` (do not auto-apply `0098`, `0099`, `0103`–`0106`).
4. Staging health is green **and** staging SHA equals the RC SHA.
5. Production is currently healthy. Rollback SHA is present.
6. Bogotá window `22:00–06:00` is open. RC has not expired (06:00 after that night).
7. Circuit is closed. Feature flags above are on.

If `main` later becomes `abcd1234`, promotion still deploys the approved RC SHA.

## Scheduler

[`.github/workflows/promote-approved-rc.yml`](../../.github/workflows/promote-approved-rc.yml)

- Cron **22:10 America/Bogota** (`10 3 * * *` UTC).
- Revalidates reality, then calls canonical **Deploy Peskids** with `release_sha`.
- Does **not** create a second deploy path.
- Default `workflow_dispatch.dry_run=true`.

## Rollback

If post-deploy health, SHA, homepage, `/admin/login`, or `hot_lead_alerts`
fails: deploy `previousProductionSha`, then record an incident. Do not retry
an application regression.

Wake the founder only for rollback-failed, outage, security, data, or payment
issues. Routine `RELEASED` / `ROLLED_BACK_PRODUCTION_HEALTHY` wait for the
morning report.

## Enable (after dry-run)

1. Run **Promote Approved Release Candidates** with `dry_run=true`.
2. Confirm decision JSON: `action=hold`, `reason=autonomy_disabled`, `deploySha` exact.
3. Board review. Then set:

```json
"autonomousPromotion": { "enabled": true, "products": { "peskids": true } }
```

4. Leave every other product `false`.

## Local

```bash
npm run test:release-rc
node scripts/ops/release-candidate.mjs --revalidate --json --evidence-file /tmp/rc-evidence.json
node scripts/ci/check-production-change-window.mjs --check-now
```

## Manual pin (until autonomy is on)

```bash
gh workflow run deploy-peskids.yml --repo cloudsysops/opsly --ref f27efea66 -f release_sha=f27efea66c37969bfcdce267a3aeb1c51ce4f226
```

Never: `22:00 → deploy main`.
