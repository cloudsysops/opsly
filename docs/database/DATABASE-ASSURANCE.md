---
status: report
owner: devops
date: 2026-09-05
type: audit-report
severity: high
tags:
  - opsly/database
---

# Database Assurance — audit report

> **Scope of evidence.** This audit ran with **no access to any live database**:
> no Supabase dashboard or API, no VPS, no Doppler, no staging or production
> Postgres. Everything asserted here was derived from files committed to this
> repository, or measured by replaying those files into a throwaway local
> Postgres. Nothing was applied to, read from, or mutated on any real system.
>
> Where a question could only be answered by touching live infrastructure, it is
> marked **BLOCKED** and says what access would resolve it. Those are not
> failures of the audit; they are the honest boundary of what a static review
> can establish. Several of them are the most important open items here.

---

## 1. Environments

### What the repository documents

| | Value | Source |
|---|---|---|
| Supabase project (all environments?) | `jkwykpldnitavhmtuzmo` | `supabase/config.toml`, `.claude/CLAUDE.md`, `config/opsly.config.json` |
| Production Postgres version | 17.6 | `supabase/migrations/supabase/.temp/postgres-version` |
| Exposed PostgREST schemas | `public`, `graphql_public`, `platform`, `peskids` | `supabase/config.toml` |
| Doppler project / config | `ops-intcloudsysops` / `prd` | `config/opsly.config.json` |
| Declared layers | local → sandbox → qa → prod | `docs/01-development/LAYERS-SANDBOX-QA-PROD.md` |
| Doppler configs per layer | `sandbox`, `qa`, `prd` | same |
| Backup retention | 30 days, cron `0 2 * * *` | `config/opsly.config.json` |
| Extensions required by migrations | `pgcrypto`, `vector` | migration SQL |

### What the repository does **not** document

- **Any Supabase project ref other than `jkwykpldnitavhmtuzmo`.** The layers doc
  gives each layer its own `DATABASE_URL`, but every value there is the literal
  placeholder `postgresql://user:pass@qa-db`. `config/doppler-ci-required-stg.txt`
  requires a `SUPABASE_URL` for `stg`, which implies a staging Supabase exists —
  but nothing says whether it is a **separate project** or the same one.
- Connection limits, pool mode, `statement_timeout`.
- Schema version actually applied in any environment.
- PITR availability or retention.
- RLS status as deployed (as opposed to as committed).

### Environment isolation — the open question

This matters more than a missing value in a table. A Supabase project is not
just a database: it is **one Postgres + one GoTrue auth instance + one Storage
bucket set**. If staging and production share the project ref, then staging
shares production's user accounts and production's uploaded files — including
teacher applicant CVs and any file a parent has attached.

Nothing in the repository proves they are separate, and `supabase/config.toml`
(commented *"push to linked project: opsly-prod"*) pins a single ref with no
per-environment variant.

**BLOCKED — requires Supabase access.** Resolve by listing the organisation's
projects and checking which ref each Doppler config (`sandbox`, `qa`, `prd`)
actually carries for `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and
`DB_CONNECTION_STRING`. If they match, staging and production are the same
system and that should be treated as an incident, not a backlog item.

---

## 2. Findings, by severity

### CRITICAL — act before trusting production with more real data

| # | Finding | Evidence | State |
|---|---|---|---|
| C1 | **The daily backup targets a schema that does not exist.** `backup-tenants.sh` runs `pg_dump -n tenant_${slug}`; no migration in either chain creates any `tenant_*` schema. Measured: `pg_dump -n <missing schema>` exits 1 with a 0-byte output. The script discards `pg_dump`'s stderr. | `scripts/backup-tenants.sh:120`; replay produces schemas `defense, governance, panini_lab, peskids, platform, public, sandbox` | Documented in `BACKUP-RESTORE-VERIFICATION.md` §0. **Resolution BLOCKED** — needs S3 + Supabase access |
| C2 | **`platform` schema is documented as not backed up daily.** It holds `tenants`, `invoices`, `billing_subscriptions`, `royalty_calculations`, `royalty_payments`. | `docs/runbooks/BACKUP-RECOVERY.md` | BLOCKED |
| C3 | **No restore has ever been drilled**, so RPO/RTO are stated targets, not measured facts. | `BACKUP-RECOVERY.md` targets with no drill record anywhere | BLOCKED — runbook written |
| C4 | **Retention is documented as operating and does not run.** `/api/cron/retention` is implemented but never scheduled; 2 of 4 seeded rules target nonexistent tables; `public.students` has no rule. The DPIA asserts the control is in place. | `vercel.json` (only `flush-billing`), `0062_governance_retention.sql`, `docs/legal/peskids/DPIA-2026.md:120` | Documented in `DATA-RETENTION-POLICY.md`; needs legal decisions |

### HIGH

| # | Finding | State |
|---|---|---|
| H1 | **Two migration chains with a circular dependency.** Neither replays standalone; no ordering of the union replays cleanly. A migration existing in Git proves nothing about production. | Measured; `MIGRATION-POLICY.md` §0 |
| H2 | **4 migrations cannot apply to a clean database**, including `0099_franchise_core_rls.sql`, which is written against `*_minor` columns that `0098` never created — so the entire Franchise OS RLS layer, tenant-consistency triggers and money CHECKs do not exist. | Measured; `MIGRATION-POLICY.md` §1 |
| H3 | **94 of 136 migrations have no `BEGIN`/`COMMIT`.** A mid-file failure leaves half of it applied, silently. `20260524_add_rls_policies_peskids.sql` demonstrably does this to `public.leads`. | Measured |
| H4 | **RLS policies on Peskids' core tables are dead code.** `public.leads`, `public.students`, `public.followups`, `public.feedback` and `peskids.class_enrollments` carry no grant to `anon`/`authenticated`, so RLS is never consulted. All access is via the service key, and tenant isolation rests entirely on `.eq('tenant_id', …)` in application code. | Proven by `rls-test.sh` (`denial = grant`) |
| H5 | **A session-GUC backdoor in RLS policies.** Policies of the form `USING (tenant_id = current_setting('app.settings.tenant_id', true) OR current_setting('app.settings.is_service_role', true) = 'true')` treat an ordinary, caller-settable session variable as an authorisation decision. Proven: with a `SELECT` grant added, setting that GUC returns every tenant's leads. Unreachable today only because of H4. No application code sets these GUCs. | Proven by `latent-guc-service-role-backdoor` |
| H6 | **Cross-tenant read on `peskids.classes` and `peskids.pools`.** `authenticated_read_scheduled_classes USING (status = 'scheduled')` and `authenticated_read_active_pools USING (active = true)` have no tenant predicate, and both tables **are** granted (to `authenticated`, and `pools` also to `anon`). Any authenticated user reads every tenant's class schedule, instructor ids, locations and prices; anonymous visitors enumerate every tenant's locations. | Proven; **not yet fixed** — see §4 |
| H7 | **Personal identity hardcoded in the schema.** `public.is_owner()` compares `auth.email()` to a literal Gmail address, and `20260524`'s policies inline the same address. Admin authority is baked into the schema and offboarding becomes a migration. `is_owner()` is also `SECURITY DEFINER` with a mutable `search_path`. | Not fixed — needs an owner decision on the replacement role model |
| H8 | **Prometheus DB monitoring points at the wrong database.** `postgres-exporter` targets `infra-postgres/hermes_db`, not Supabase. Every `pg_*` alert, including `DBConnectionPoolExhausted`, describes a database with no customer data in it. | Documented in `DB-OBSERVABILITY.md` |
| H9 | **Tenant discriminators had no referential integrity.** `peskids.*.tenant_slug` and `public.*.tenant_id` are bare `text`. | **Fixed** for `peskids.*` by `0100` (FKs, `NOT VALID`) |

### MEDIUM / hygiene

| # | Finding | State |
|---|---|---|
| M1 | 19 tables had RLS disabled, incl. `peskids.notifications`, `push_subscriptions`, `referral_*`, `platform.peskids_franchises`, `platform.usage_events` | **Fixed** — `0100` (12 tables); 7 platform-internal/sandbox tables listed and deferred |
| M2 | 15 Peskids money columns had no `>= 0` constraint | **Fixed** — `0100` |
| M3 | Audit tables were UPDATE-able, including by the service key | **Fixed** — `0101` (trigger, effective against BYPASSRLS roles) |
| M4 | Audit rows had no request correlation id | **Fixed** — `0101` |
| M5 | Two exact duplicate indexes; two missing composites on hot queries | **Fixed** — `0102` |
| M6 | `supabase/migrations/supabase/.temp/` was tracked despite being gitignored, publishing the prod pooler host and project ref | **Fixed** — untracked |
| M7 | `PESKIDS_ALLOW_DEMO_SEED=1` overrode the production check; `seed-peskids-pools.sh` was entirely unguarded | **Fixed** — guards + 22 tests |
| M8 | Money conventions are inconsistent: integer minor units (Peskids, billing) vs `numeric(18,2)` (franchise) vs `numeric(10,6)`/`(10,4)` for the same `cost_usd` concept | Documented; no float/double anywhere, which is the important part |
| M9 | `integer` minor units cap at ~21.5M COP (`peskids.classes.price_cents`, `payments.amount_cents`, `subscriptions.monthly_price_cents`). `platform.billing_*` correctly uses `bigint`. | Documented — overflow risk, needs a product view on realistic maxima |
| M10 | `npm run migrations:create --workspace=@intcloudsysops/migrations` is prescribed by `.claude/CLAUDE.md` but no such script exists | Documented |

### Secrets — clean

No hardcoded database passwords, service-role keys, or backup credentials were
found outside Doppler references. No JWT-shaped strings are committed. The
`postgres://` URLs that exist in `infra/` are `${VAR}` interpolations or
localhost test strings. The one real issue (M6) exposed a hostname and project
ref, not a credential — but a tracked Supabase CLI state directory is exactly
where a future `supabase link` would deposit one, which is why it was untracked
rather than left alone.

---

## 3. Definition of done — honest status

| # | Criterion | Status |
|---|---|---|
| 1 | Staging and production separated | **BLOCKED** — no evidence either way; see §1 |
| 2 | Schema drift known | **PARTIAL** — `EXPECTED-SCHEMA.md` is complete and accurate as the replay ground truth. Drift vs. live is **BLOCKED** |
| 3 | RLS inventory complete | **DONE** — `RLS-MATRIX.md`, 163 tables, every policy |
| 4 | Negative RLS tests green | **DONE** — 29 pass, 0 unexplained failures, 7 known-bad tracking real defects |
| 5 | Constraints verified | **DONE** for the committed schema; gaps fixed in `0100` |
| 6 | Migration replay green | **NO** — 4 migrations cannot apply from clean. Measured, documented, not yet fixed (2 are franchise-owned) |
| 7 | Production backups verified | **BLOCKED** — and static evidence suggests they may not work at all (C1) |
| 8 | Restore drill completed | **BLOCKED** — runbook written, drill not run |
| 9 | RPO / RTO measured | **BLOCKED** — targets are stated, never measured |
| 10 | Connection policy verified | **PARTIAL** — architecture established (PostgREST, no app pool); limits and timeouts **BLOCKED** |
| 11 | Critical queries reviewed | **DONE** statically; `EXPLAIN ANALYZE` on real data **BLOCKED** |
| 12 | Monitoring exists | **NO** — exists, points at the wrong database (H8) |
| 13 | Destructive prod guards tested | **DONE** — 22 tests, `npm run test:prod-guards` |
| 14 | Release gate documented and enforced | **DOCUMENTED, NOT ENFORCED** — `MIGRATION-POLICY.md` §3; enforcement needs a CI workflow this session could not push (see PR body) |

Most of the "verified in production" rows are legitimately BLOCKED. That is the
correct answer from a static audit, and the items behind them — C1, C3 and the
§1 isolation question — are where the next hour of a human's time is worth most.

---

## 4. Deliberately not fixed

| Item | Why |
|---|---|
| `0099` / `0098` `*_minor` column mismatch | Owned by the Franchise OS work in progress on another branch; fixing it here would collide. Reported instead. |
| H6 cross-tenant `classes` / `pools` read | The fix is to add a `tenant_slug` predicate to two policies, which **changes what the running application can read**. That is `BACKWARD_COMPATIBLE`, not `SAFE_ADDITIVE`, and it needs someone to confirm the Peskids app always knows its tenant at that call site. One-line migration; needs an owner, not more analysis. |
| H7 hardcoded owner email | Replacing it needs a decision on the role model (a `platform.tenant_memberships` role? a JWT claim set server-side?). Not an audit call. |
| GUC-backdoor policy removal (H5) | Dropping a permissive policy can only reduce access, so it is safe in principle — but if production has grants this audit cannot see, it could break a read path. Wants a staging verification first. |
| Retention periods for child data | Legal determination. See `DATA-RETENTION-POLICY.md` §3 — recorded unanswered on purpose. |
| ~180 `FK_NOT_INDEXED` findings | Mostly low-volume tables where the index costs more than it saves. Not a blanket-index pass. |

---

## 5. Artifacts

| Path | What |
|---|---|
| `docs/database/EXPECTED-SCHEMA.md` | Generated. 163 tables, columns, PK/FK/UNIQUE/CHECK, RLS state |
| `docs/database/RLS-MATRIX.md` | Generated. Per-table SELECT/INSERT/UPDATE/DELETE coverage and every policy body |
| `docs/database/SCHEMA-FINDINGS.md` | Generated. Automated findings by severity |
| `docs/database/MIGRATION-POLICY.md` | Classification, promotion path, 15-point release gate |
| `docs/database/BACKUP-RESTORE-VERIFICATION.md` | Checklist + restore drill for a human with access |
| `docs/database/DATA-RETENTION-POLICY.md` | Coverage gaps + open legal decisions |
| `docs/database/DB-OBSERVABILITY.md` | Monitoring spec, connections, query/index review |
| `tools/db-assurance/` | The harness: replay, RLS/integrity tests, analyzer, classifier |
| `supabase/migrations/0100..0102` | The fixes |

Regenerate everything:

```bash
tools/db-assurance/start-local-pg.sh
npm run db:audit && npm run db:rls-test && npm run test:prod-guards
node tools/db-assurance/classify-migrations.mjs
```
