# Peskids — Data assurance runbook

This runbook separates application safety, database safety and data
operations. It is evidence-based: a migration file is not evidence that the
migration is applied, and a backup is not evidence of recoverability until a
restore drill succeeds.

## Current application boundary audit

| Surface | Auth boundary | Data authority | Client | Write | Current risk / next proof |
| --- | --- | --- | --- | --- | --- |
| Public `POST /api/leads` | Public intake schema | Server fixes tenant through canonical lead path | Server Supabase service role | Yes | Requires live idempotency proof and webhook delivery audit |
| Admin `/api/admin/**` | `validateStaffSession` + operational role | Server `tenantSlug()` and route/service query | Server service role | Mixed | Must complete route-by-route forged tenant/unit negative tests |
| Family `/api/portal/**` | Supabase session/family scope | Server session and family membership | Server/service clients | Mixed | Verify every response shape excludes unrelated child PII |
| Teacher `/api/submissions/**` | Staff/teacher auth | Authenticated teacher and class scope | Server service role | Mixed | Verify teacher cannot access financial or unrelated-unit data |
| External webhooks | Route-specific secret/signature where implemented | Validated payload plus fixed Peskids tenant | Server service role | Yes | Inventory replay/idempotency coverage per provider |
| Browser Supabase client | Anonymous key only | RLS must be authoritative | Browser anon client | Possible | Never use browser input as tenant or role authority |

This is not a claim that all rows are production-safe. It is the starting
inventory for the Application loop.

## Environment boundary

Non-development runtimes now require:

- `PESKIDS_ENVIRONMENT=staging|production` (or an equivalent `DOPPLER_CONFIG`);
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`;
- `PESKIDS_EXPECTED_SUPABASE_URL` matching the actual URL;
- optional `PESKIDS_STAGING_SUPABASE_URL` and
  `PESKIDS_PRODUCTION_SUPABASE_URL` sentinels to reject cross-environment use.

The check is server-side and fails closed. The browser receives only the
public Supabase URL and anon key. It never selects the environment, tenant or
unit scope.

## Database loop

The repository contains Peskids migrations through `20260819`, including
operations RLS and additive Franchise Core RLS. Current Git evidence does not
prove the staging or production schema version. Before any production
migration, capture the migration ledger from the Supabase project, compare it
with Git, and classify every delta as:

`NONE` · `SAFE_ADDITIVE` · `BACKWARD_COMPATIBLE` · `REQUIRES_APP_COORDINATION` ·
`DESTRUCTIVE` · `MANUAL_REVIEW`.

`apps/peskids/migrations/20260819_franchise_core_rls.sql` is explicitly
marked `NEEDS_PRODUCTION_MIGRATION_APPROVAL`; it must not be applied by an
application deploy.

## RLS acceptance matrix

Run against an isolated staging/local Postgres using user JWTs, never a
service-role key:

| Actor | Allowed | Must be denied |
| --- | --- | --- |
| Anonymous | Public lead intake only | Admin, student, family, franchise reads |
| Family | Own family/student records | Other family, staff notes, unrelated units |
| Teacher | Assigned classes and permitted feedback | Royalties, payments, unrelated classes |
| Support/staff | Operational Peskids leads within assigned scope | Other tenant/unit data |
| Franchise admin | Assigned Peskids franchise units | Other tenant and unassigned units |
| Platform admin | Explicitly governed Peskids scope | Any scope not granted by policy |

The matrix is a test contract, not a substitute for running the tests.

## Data operations gates

Destructive Peskids cleanup scripts source
`scripts/lib/peskids-data-safety-guard.sh`. They refuse production based on
`PESKIDS_ENVIRONMENT` or `DOPPLER_CONFIG`, including dry-run execution. Demo
seeding already has a separate production guard. No production reset, seed,
truncate or fixture load is permitted from this repository path.

Required operational evidence before declaring `DATABASE_ASSURANCE_READY`:

1. staging and production Supabase/Auth/Storage project identifiers recorded
   without secrets;
2. schema drift report and migration ledger;
3. RLS/constraint negative tests green;
4. clean-database migration replay, including a second replay check;
5. provider backup/PITR status, retention and last successful backup;
6. isolated restore drill with measured RPO/RTO;
7. connection, slow-query, deadlock and failed-auth telemetry;
8. retention decision for leads, family/student PII, uploads and audit logs.

## RPO / RTO

Policy targets (not yet measured on a restore drill):

- **RPO:** 15 minutes with PITR, otherwise 24 hours.
- **RTO:** 2 hours for a read-only Peskids site after isolated restore.

Procedure and backup-scope gap: [`PESKIDS-DATA-OPERATIONS.md`](./PESKIDS-DATA-OPERATIONS.md).
Staging project split: [`PESKIDS-STAGING-DATA-PLANE.md`](./PESKIDS-STAGING-DATA-PLANE.md).

## Emergency restore sequence

```text
incident
  -> stop risky writes
  -> identify last known-good backup/point
  -> restore an isolated target
  -> run integrity and application read smoke
  -> obtain human approval for promotion/redirect
  -> verify health, SHA and audit trail
```

No rollback of database migrations is automatic. Code rollback and database
recovery are separate decisions.

