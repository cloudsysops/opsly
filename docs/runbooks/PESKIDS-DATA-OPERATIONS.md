---
status: draft
owner: operations
last_review: 2026-09-05
type: runbook
tags:
  - opsly/peskids
  - opsly/database
  - opsly/backup
---

# Peskids — Data operations

Staging/prod URL split is not enough. This runbook is the third loop:
backups, restore, RPO/RTO, drift, observability, and child/family retention.

**Do not restore into production from this path.** Isolated target only.

## Targets (policy)

| Metric | Target | Current evidence |
| --- | --- | --- |
| RPO | ≤ 15 minutes if Supabase PITR is on the paid project; otherwise ≤ 24 hours (daily dump) | Policy in `docs/governance/internal/BUSINESS-CONTINUITY-POLICY.md`. **PITR status not verified in this session.** |
| RTO | ≤ 2 hours for Peskids site read path after isolated restore + redirect | Not measured. Restore drill pending. |
| Staging PII | No production family/child rows in staging | **opsly-QA** (`hljetbbgiphpjbldebpo`) has 0 non-`@example.com` leads/students after synthetic seed. Live `peskids.op-sly.com` still uses prod until #1093 deploys `stg_peskids`. See `PESKIDS-STAGING-DATA-PLANE.md`. |

## Backup scope

`scripts/backup-tenants.sh` dumps `tenant_{slug}`. Peskids data lives in
`peskids`, `platform.peskids_*`, and `public` operational tables. A
`peskids.sql.gz` from that script is not a Peskids application backup.

Use:

```bash
./scripts/ops/backup-peskids-schemas.sh --dry-run
```

Execute only with `DB_CONNECTION_STRING` in the environment (Doppler). The
script never prints the URL. `PESKIDS_RESTORE_TARGET=production` exits 1.

## Emergency restore

```text
incident
  ↓
stop risky writes if needed (feature flags / maintenance)
  ↓
identify last known-good backup or PITR point
  ↓
restore isolated copy (new Supabase project or local Postgres)
  ↓
integrity checks (row counts, FK, lead/student samples — no PII in logs)
  ↓
application read smoke against the isolated URL
  ↓
human approval
  ↓
promote/redirect only in the production window
  ↓
verify health + request_id trail
```

Never copy staging data to production. Never apply `0098`/`0099` as part of
restore without human approval.

## Schema drift

A Git migration file is not proof of production. Before any production
migration:

1. Read `supabase_migrations.schema_migrations` on the target project.
2. Diff against `supabase/migrations`.
3. Classify: `SAFE_ADDITIVE` · `BACKWARD_COMPATIBLE` ·
   `REQUIRES_APP_COORDINATION` · `DESTRUCTIVE` · `MANUAL_REVIEW`.
4. Known historical drift: `0075` registered without DDL, repaired by `0084`.

## Observability

Use the shared platform checks in `docs/database/DATABASE-OPERATIONS.md`:
connections, `pg_stat_statements`, locks. Peskids-specific alerts are not
wired yet. Minimum wanted: connection saturation, storage, slow queries,
deadlocks, failed auth.

## Retention (child / family)

`0062_governance_retention.sql` schedules leads/forms/audit. **Pending
legal/business decision:** students, feedback (`child_name`), messages,
uploads. Staging must not receive production PII once projects are split.

## Multi-write classification

| Path | Class | Note |
| --- | --- | --- |
| Public lead intake | SAFE_EVENTUAL | Email lookup returns existing id before create |
| Inbound webhook + message + intake | SAFE_EVENTUAL | `external_id` replay returns 200 without re-intake |
| Stripe / Wompi mark-paid | SAFE_EVENTUAL | Checkout session / payment link already used as idempotency key |
| Lead convert → student | ATOMIC_REQUIRED | Not wrapped; do not implement until isolated staging exists |
| Checkout + enrollment | ATOMIC_REQUIRED | Payment mark is idempotent; enrollment create is not a single TX |
| Agreement + franchisee | ATOMIC_REQUIRED | Two writes; Franchise OS flag stays off |
| Inbound multi-write (message + outbound + draft) | UNKNOWN | Partial failure possible; replay is safe |

Do not add cross-service transactions against production while staging shares
the production project.

## Coordinated loops

| Loop | PR / branch | Role |
| --- | --- | --- |
| Application | #1094 `feat/peskids-data-safety` + this branch | Env boundary, tenant/unit authority, PII, flags |
| Database | #1095 `feat/db-assurance-loop` (draft — do not merge temp CLI files) | RLS matrix, replay, migrations 0100+ |
| Staging promotion | #1093 | Separate deploy path; still needs a distinct Supabase project |
| Data operations | this runbook | Backup scope, restore, RPO/RTO, retention |
