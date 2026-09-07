---
status: draft
owner: operations
last_review: 2026-09-06
type: runbook
tags:
  - opsly/peskids
  - opsly/supabase
  - opsly/staging
---

# Peskids — Staging data plane

Application env guards are not isolation. Staging and production must not
share database, Auth, Storage, or service-role credentials.

## Current evidence (2026-09-06 evening)

| Resource | Production | Staging / QA |
| --- | --- | --- |
| Supabase project | `jkwykpldnitavhmtuzmo` (`opsly-prod`) | **`hljetbbgiphpjbldebpo` (`opsly-QA`)** |
| Doppler | `prd` | **`stg_peskids`** (not Smile `stg` / `stg_qa`) |
| Public host | `www.peskids.com` (container `peskids`) | **`https://peskids-staging.op-sly.com`** (container `peskids-staging`) |
| Schema | live prod; do not apply `0098`/`0099` | **`0001`–`0097`**. `0098`/`0099` not applied. Duplicate git prefixes `0100_*` were renumbered `0103`–`0106`. |
| Auth users | production staff | QA `qa-*@example.com` via `scripts/peskids-staging-auth-seed.sh` |
| Storage | production | buckets `peskids-staging` + `peskids-qa` |
| Franchise OS | keep disabled | keep disabled; skip `20260819_franchise_core_rls.sql` |

`DB_URL` was dropped from `stg_peskids`. Peskids uses `SUPABASE_URL` + service
role against opsly-QA only. VPS checkout is `$HOME/opsly-staging` when
`/opt/opsly-staging` is not writable.

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
For the isolated Peskids operations RLS validation in PR #1110, use the
explicit QA-only opt-in after review:

```bash
./scripts/peskids-apply-staging-schema.sh \
  --project-ref hljetbbgiphpjbldebpo \
  --include-operations-rls
```

The opt-in adds only `0100_peskids_operations_tenant_rls.sql`; it refuses any
project other than the configured QA project and never includes `0098` or
`0099`. Run the same command with `--dry-run` before applying it.

## Remaining human items

1. Auth redirect URLs on `opsly-QA` (`site_url` + allow list for
   `https://peskids-staging.op-sly.com` only).
2. Point staging n8n / inbound webhooks at test-safe workflows only.
3. Confirm PITR on the **production** dashboard:
   `PITR_ENABLED` · `PITR_DISABLED` · `UNKNOWN_REQUIRES_ACCOUNT_CHECK`.
4. Isolated restore drill + measured RTO. Do not restore into production.
5. Do **not** apply `0103`–`0106` to production without review. `0098`/`0099`
   stay excluded.

Deploy fails if staging project ref equals `jkwykpldnitavhmtuzmo`
(`scripts/ci/assert-peskids-staging-isolation.sh`).

## Approved staging schema set

`0001`–`0097` in `supabase/migrations/` (current safe production-compatible
set). Explicitly excluded: `0098_franchise_core.sql`,
`0099_franchise_core_rls.sql`, and any `0100+` by default. The only approved
exception is the explicit `--include-operations-rls` QA validation described
above, which includes `0100_peskids_operations_tenant_rls.sql` only.

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
