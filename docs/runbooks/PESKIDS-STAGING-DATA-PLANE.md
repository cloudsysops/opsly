---
status: draft
owner: operations
last_review: 2026-09-05
type: runbook
tags:
  - opsly/peskids
  - opsly/supabase
  - opsly/staging
---

# Peskids — Staging data plane

Application env guards are not isolation. Staging and production must not
share database, Auth, Storage, or service-role credentials.

## Current evidence (2026-09-05 night)

| Resource | Production | Staging / QA |
| --- | --- | --- |
| Supabase project | `jkwykpldnitavhmtuzmo` (`opsly-prod`) | **`hljetbbgiphpjbldebpo` (`opsly-QA`)** — created 2026-09-05 |
| Doppler | `prd` | **`stg_peskids`** (do not use Smile `stg` / `stg_qa`) |
| Schema applied | live prod | **`0001`–`0097` (93 versions). `0098`/`0099` not applied.** |
| Production PII in QA | n/a | **0** non-`@example.com` leads/students after seed |
| Live host `peskids.op-sly.com` | still on prod project until #1093 deploys `stg_peskids` | container `peskids-staging` not flipped in this loop |
| Franchise OS | `PESKIDS_FRANCHISE_OS_ENABLED=false` | Keep false. App franchise files skipped `20260819_franchise_core_rls.sql` |

`DB_URL` in `stg_peskids` is a leftover private Postgres (`psql://10.x`, db
`appdb`). It is **not** the QA database. Do not run migrations against it.
Peskids uses `SUPABASE_URL` + service role.

Do **not** point Peskids staging at Smile QA. Do **not** copy production
customer data.

## Schema apply notes (QA only)

Fresh `opsly-QA` needed two staging-only repairs before `0001`–`0097`
completed. Historical files were **not** rewritten in git (prod checksums):

1. `0019` grants a UUID table sequence that does not exist — skip if missing.
2. Schema `peskids` is created in `apps/peskids` migrations, not in
   `supabase/migrations`. Create it before `0055`.
3. `public.leads` / operational tables come from `apps/peskids/migrations`
   (`001`+). Apply those except `20260819_franchise_core_rls.sql`.

Repeatable entry: `./scripts/peskids-apply-staging-schema.sh --dry-run`.

## Remaining human items

1. Auth redirect URLs on `opsly-QA` for the QA host only.
2. Create staging Auth users (admin, teacher, support, franchise admin,
   auditor) with `PESKIDS_STAGING_SEED_PASSWORD` in Doppler `stg_peskids`
   — never print it. RLS tests must use those JWTs, not service role.
3. Separate Storage buckets on `opsly-QA`.
4. Merge #1093 so VPS `peskids-staging` downloads `stg_peskids` and fails
   if the project ref is production.
5. Point staging n8n / inbound webhooks at test-safe workflows only.
6. Confirm PITR on the **production** dashboard:
   `PITR_ENABLED` · `PITR_DISABLED` · `UNKNOWN_REQUIRES_ACCOUNT_CHECK`.
7. Isolated restore drill + measured RTO. Do not restore into production.

Deploy fails if staging project ref equals `jkwykpldnitavhmtuzmo`
(`scripts/ci/assert-peskids-staging-isolation.sh`).

## Approved staging schema set

`0001`–`0097` in `supabase/migrations/` (current safe production-compatible
set). Explicitly excluded: `0098_franchise_core.sql`,
`0099_franchise_core_rls.sql`, and any `0100+`.

## Webhooks

| Environment | Destination |
| --- | --- |
| Production | production n8n / WACRM / Stripe / Wompi live endpoints |
| Staging | staging webhook + test-safe n8n + test recipients only |

Staging must not notify real families.

## PITR

Do not claim 15-minute RPO until a human confirms PITR on the **production**
project dashboard. Allowed values: `PITR_ENABLED` · `PITR_DISABLED` ·
`UNKNOWN_REQUIRES_ACCOUNT_CHECK`.
