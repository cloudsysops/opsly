---
status: proposed
owner: devops
date: 2026-09-05
type: policy
tags:
  - opsly/database
---

# Database Migration & Release-Gate Policy

> **Scope.** How a schema change gets from a developer's machine to the Peskids
> production database. Companion to
> [`docs/runbooks/PRODUCTION-CHANGE-WINDOW.md`](../runbooks/PRODUCTION-CHANGE-WINDOW.md),
> which governs *when* a prod-impacting merge may happen. That runbook owns the
> clock; this document owns the schema. Neither replaces the other, and a
> migration must satisfy both.

---

## 0. The problem this policy exists to solve

Opsly has **two independent migration chains** that both write to the same
Supabase project:

| Chain | Files | Applied by |
|---|---|---|
| `supabase/migrations/*.sql` | 99 | Supabase CLI, lexical order |
| `apps/peskids/migrations/*.sql` | 38 | by hand, out of band |

They are not independent in content. `apps/peskids/migrations/001_create_peskids_schema.sql`
creates `public.leads`, `public.students`, `public.followups` and `public.messages`;
**18 migrations in the `supabase/` chain fail on a clean database because those
objects do not exist yet.** In the other direction, seven migrations in the
`peskids/` chain fail because `platform.*` has not been created yet. Neither
chain replays standalone, and no single ordering of the union replays either —
verified, not assumed:

```bash
tools/db-assurance/replay.sh --chain supabase   # 18 failures
tools/db-assurance/replay.sh --chain peskids    #  7 failures
tools/db-assurance/replay.sh --chain resolve    #  4 failures at the fixpoint
```

`--chain resolve` re-sweeps the union until no further progress is possible, so
whatever still fails there cannot be explained by ordering. **A migration file
existing in Git therefore proves nothing about production.** Everything below
follows from that.

---

## 1. Risk classification

Every migration carries exactly one class. Regenerate the full table with:

```bash
node tools/db-assurance/classify-migrations.mjs
```

| Class | Meaning | Gate |
|---|---|---|
| `SAFE_ADDITIVE` | Adds tables, columns, indexes or comments. Nothing existing changes meaning. | Standard gate |
| `BACKWARD_COMPATIBLE` | Changes constraints or access control. Running code keeps working, but who can do what changes. | Standard gate + RLS suite green |
| `REQUIRES_APP_COORDINATION` | Renames, retypes, or adds `NOT NULL` without a default. Old and new application code cannot both be correct against this schema. | Expand/contract, two releases |
| `DESTRUCTIVE` | Drops or rewrites data, a column, or a table. | Backup verified *and restore-tested* within 24h, named human approver |
| `MANUAL_REVIEW` | Cannot be replayed from clean, or is non-atomic and touches a sensitive table. | Blocked until reclassified |

**Current state of the repository (136 files):**

| Class | Count |
|---|---:|
| `DESTRUCTIVE` | 3 |
| `REQUIRES_APP_COORDINATION` | 0 |
| `MANUAL_REVIEW` | 47 |
| `BACKWARD_COMPATIBLE` | 78 |
| `SAFE_ADDITIVE` | 8 |

**94 of 136 migrations have no `BEGIN`/`COMMIT`.** Without one, `psql` runs each
statement in its own transaction: a failure halfway through leaves the first
half applied and the rest not, with nothing recording that it happened. This is
the single largest source of drift risk in the repository, and it is why 47
files land in `MANUAL_REVIEW`.

### The four that cannot apply to a clean database

| Migration | Failure |
|---|---|
| `supabase/0019_agent_sessions.sql` | `GRANT USAGE ON SEQUENCE platform.agent_sessions_id_seq` — the PK is a UUID, so that sequence never exists. The file's own comment says *"puede no existir (UUID)"*, but the `GRANT` is unconditional. The file **is** wrapped in `BEGIN`/`COMMIT`, so the whole migration rolls back: `platform.agent_sessions` may not exist in production at all. |
| `supabase/0099_franchise_core_rls.sql` | References `gross_sales_minor`, `royalty_due_minor`, `amount_minor`, `canonical_fee_minor`. `0098_franchise_core.sql` actually creates `gross_sales numeric(18,2)`, `royalty_due numeric(18,2)`, `amount numeric(18,2)` and `canonical_fee jsonb`. Written against a minor-units schema that was never built. Also transactional, so **none** of its RLS policies, tenant-consistency triggers or CHECK constraints exist. |
| `apps/peskids/20260819_franchise_core_rls.sql` | Same file, same failure, duplicated into the other chain. |
| `apps/peskids/20260524_add_rls_policies_peskids.sql` | References `created_by` and `tenant_slug` on `public.leads`; neither exists at that point (`created_by` is added later by `supabase/0064`). Non-atomic, so it **partially applies**: `public.leads` is left with RLS enabled, `FORCE` set, and only the admin policies created. |

The last one is the most dangerous, because a partial apply is invisible. Which
policies `public.leads` actually carries in production depends on which chain
ran first and how far each got — and that is not knowable from this repository.

---

## 2. Promotion path

```
local → staging → verify → backup → human approval → production
```

**Production data never flows backwards.** Staging is seeded from
generated fixtures, never from a copy of production. Peskids production holds
children's names, ages, parents' contact details and payment records; copying
that into a lower environment multiplies the number of places it can leak and
the number of people who can reach it, and it is not reversible once done.

### Local

```bash
tools/db-assurance/start-local-pg.sh     # ephemeral, throwaway, loopback only
tools/db-assurance/replay.sh --chain resolve --twice
tools/db-assurance/rls-test.sh
```

The `--twice` pass re-applies the whole chain over an already-migrated database.
Any failure there is a migration that cannot be safely re-run — which matters
because a partially-applied migration will be re-run.

### Staging

1. Apply the chain to staging **from clean**, not incrementally.
2. Run the smoke suite.
3. Run `tools/db-assurance/rls-test.sh` against staging.
4. Diff staging's live schema against `docs/database/EXPECTED-SCHEMA.md`.
   Any difference is drift and blocks promotion.

### Production

Only after the release gate below is fully green.

---

## 3. Release gate

Every box must be ticked, by a named person, before a migration reaches
production. This gate is **currently manual**: nothing in CI enforces it today.
The only automated production gate that exists is the nightly change window in
[`PRODUCTION-CHANGE-WINDOW.md`](../runbooks/PRODUCTION-CHANGE-WINDOW.md), which
checks *when* you merge, not *what* you are merging.

| # | Check | Evidence required | Automatable? |
|---|---|---|:-:|
| 1 | Migration reviewed by a second person | PR approval naming the reviewer | — |
| 2 | Risk class assigned and appropriate | `classify-migrations.mjs` output in the PR | yes |
| 3 | Replays clean from an empty database | `replay.sh --chain resolve` exits 0 | yes |
| 4 | Re-runnable (idempotent) | `replay.sh --twice` exits 0 | yes |
| 5 | Wrapped in `BEGIN`/`COMMIT`, or documented why not | reviewer confirms | yes |
| 6 | Applied to staging from clean | staging apply log | partly |
| 7 | Staging smoke suite green | CI run link | yes |
| 8 | Negative RLS suite green on staging | `rls-test.sh --strict` exits 0 | yes |
| 9 | Staging schema matches `EXPECTED-SCHEMA.md` | diff output, empty | yes |
| 10 | **Production backup verified for this specific change** | backup id + timestamp + checksum | partly |
| 11 | **Restore tested from that backup** (`DESTRUCTIVE` only) | restore drill record | — |
| 12 | Rollback plan written and reviewed | the down-migration, or the documented reason there is none | — |
| 13 | App compatibility proven | old code runs against new schema (or expand/contract documented) | partly |
| 14 | Named human approval recorded | PR comment | — |
| 15 | Inside the production change window | `production-change-window` CI check | yes |

Items 10 and 11 cannot currently be satisfied from the repository: see
[`BACKUP-RESTORE-VERIFICATION.md`](./BACKUP-RESTORE-VERIFICATION.md). Until
someone completes that runbook, **no `DESTRUCTIVE` migration should be applied
to production.**

---

## 4. Rules for writing a migration

1. **Wrap it in `BEGIN` / `COMMIT`.** The only exception is `CREATE INDEX
   CONCURRENTLY` / `DROP INDEX CONCURRENTLY`, which cannot run in a transaction.
   When you take that exception, say so in a header comment and make every
   statement individually idempotent — see `0102_index_hygiene.sql`.
2. **Never edit a migration that has been applied anywhere.** Add a new one.
3. **Add constraints `NOT VALID` first.** `ALTER TABLE ... ADD CONSTRAINT ...
   NOT VALID` enforces the rule for new writes without scanning the table, so it
   cannot fail on existing data and takes no long lock. `VALIDATE CONSTRAINT` is
   then a separate, deliberate step. See `0100_peskids_data_integrity.sql`.
4. **Adding a `NOT NULL` column needs a default**, or it is
   `REQUIRES_APP_COORDINATION` and needs the expand/contract dance.
5. **Guard with `IF NOT EXISTS` / `IF EXISTS`,** or a `DO` block that checks
   `pg_constraint` / `pg_class`. Assume the file will be run twice.
6. **Enable RLS on any table holding tenant, customer or child data,** in the
   same migration that creates it. A table with RLS on and a `service_role`
   policy behaves identically today and is protected the day someone adds a
   grant.
7. **Never write a policy that trusts a session GUC.** `current_setting('app.settings.tenant_id')`
   and friends are settable by any role in the session. Tenant identity comes
   from the verified JWT via `auth.jwt()` / `auth.uid()`. See the
   `latent-guc-service-role-backdoor` case in `tools/db-assurance/tests/`.
8. **Never hardcode an identity in a policy.** `public.is_owner()` currently
   compares `auth.email()` to a literal Gmail address, which puts a personal
   account in the schema and makes offboarding a migration.
9. **Money is `integer`/`bigint` minor units, or `numeric(p,s)`. Never
   `float`/`double precision`.** Prefer `bigint` for minor units in COP:
   `integer` caps at ~21.5M COP, and `peskids.classes.price_cents`,
   `peskids.payments.amount_cents` and `peskids.subscriptions.monthly_price_cents`
   are all `integer` today.
10. **One chain.** New migrations go in `supabase/migrations/` only. See §5.

---

## 5. Converging the two chains

The two-chain split is the root cause of the drift risk in §0, and it should be
closed. Proposed sequence, none of which is safe to do blind from this
repository:

1. Determine what production actually has, table by table, against
   `EXPECTED-SCHEMA.md`. Requires Supabase access.
2. Write one reconciling migration in `supabase/migrations/` that brings a clean
   replay to match production — guarded so it is a no-op where production
   already matches.
3. Mark `apps/peskids/migrations/` read-only (a `README` plus a CI check that
   fails on new files there).
4. Fix or supersede the four unreplayable migrations in §1.
5. Land the missing `BEGIN`/`COMMIT` problem by policy going forward; do not
   retro-edit applied migrations.

Step 1 gates all the others.

---

## 6. Tooling

| Command | What it does |
|---|---|
| `npm run db:replay` | Replay both chains into ephemeral Postgres, report order-independent failures |
| `npm run db:rls-test` | Negative RLS + integrity suite (31 cases, none as `service_role`) |
| `npm run db:audit` | Regenerate `EXPECTED-SCHEMA.md`, `RLS-MATRIX.md`, `SCHEMA-FINDINGS.md` |
| `npm run test:prod-guards` | Prove destructive scripts refuse to run against production |
| `node tools/db-assurance/classify-migrations.mjs` | Regenerate the classification in §1 |

---

## Related

- [[database/EXPECTED-SCHEMA|EXPECTED Schema]] — replay ground truth
- [[database/RLS-MATRIX|RLS Policy Matrix]]
- [[database/SCHEMA-FINDINGS|Schema Findings]]
- [[database/BACKUP-RESTORE-VERIFICATION|Backup & Restore Verification]]
- [[database/DATA-RETENTION-POLICY|Data Retention Policy]]
- [[database/DB-OBSERVABILITY|Database Observability Spec]]
- [[runbooks/PRODUCTION-CHANGE-WINDOW|Production change window]]
- [[runbooks/BACKUP-RECOVERY|Backup & Recovery runbook]]
