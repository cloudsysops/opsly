---
status: proposed
owner: devops
date: 2026-09-05
type: spec
tags:
  - opsly/database
  - opsly/observability
---

# Database Observability, Connections & Query Performance

> Covers what the production database should tell you, what it currently tells
> you, and what the repository can and cannot establish. Live verification —
> actual connection counts, slow-query logs, `EXPLAIN ANALYZE` against real
> data — is **BLOCKED**: it needs Supabase dashboard/API access to project
> `jkwykpldnitavhmtuzmo`.

---

## 1. What monitoring exists today

Monitoring is **not absent** — it is pointed at a different database.

`monitoring/prometheus/prometheus.yml` scrapes a `postgresql` job at
`postgres-exporter:9187`, and `monitoring/prometheus/rules/hermes_alerts.yml`
defines `DBConnectionPoolExhausted` on `pg_stat_activity_count >= 95`. But
`infra/docker-compose.phase4.yml:84` configures that exporter as:

```
DATA_SOURCE_NAME: "postgresql://postgres:${DB_PASSWORD}@infra-postgres:5432/hermes_db?sslmode=disable"
```

`infra-postgres` / `hermes_db` is the **self-hosted Postgres on the VPS**. It is
not the Supabase project that holds Peskids' students, payments and leads.

**Consequence:** every `pg_*` metric, dashboard panel and alert in this
repository describes a database that contains no customer data. Supabase
Postgres has no Prometheus scrape configured anywhere in the repo. If
`DBConnectionPoolExhausted` fires it says nothing about Peskids, and — more
importantly — if Peskids' database saturates, nothing fires at all.

| Signal | Covered for `hermes_db` | Covered for Supabase (Peskids) |
|---|:-:|:-:|
| Connection count / saturation | yes | **no** |
| CPU / memory | yes (node-exporter) | **no** |
| Disk / storage growth | yes (`DiskSpaceLow`) | **no** |
| Slow queries | no | **no** |
| Deadlocks | no | **no** |
| Failed auth attempts | no | **no** |
| RLS denials | no | **no** |
| Migration failures | no | **no** |
| Backup success/failure | Discord webhook from `backup-tenants.sh` | see `BACKUP-RESTORE-VERIFICATION.md` |

Supabase exposes a Prometheus-compatible metrics endpoint on paid plans
(`/customer/v1/privileged/metrics`). Whether this project is on such a plan, and
whether that endpoint is scraped, is **BLOCKED** — check the dashboard.

---

## 2. Required signals

Ordered by what would actually have caught a real incident.

### 2.1 Tenant isolation (nothing monitors this today)

| Signal | Why | Suggested threshold |
|---|---|---|
| **RLS denial rate** by table and role | The only direct evidence that isolation is being tested — by a bug or by someone probing. A sudden non-zero rate on `public.students` is an incident. | any denial on child-data tables → page |
| **Queries running as `service_role`** vs `authenticated` | Every server path currently uses the service key (§4). Tracking the ratio makes a shift toward user-scoped access measurable rather than aspirational. | trend, no threshold |
| **Rows returned per request on tenant-scoped endpoints** | A missing `.eq('tenant_id', …)` shows up as a result set an order of magnitude too large long before anyone reports it. | alert on p99 > 10× median |

### 2.2 Availability and saturation

| Signal | Threshold |
|---|---|
| Connection count vs. plan limit | warn 70%, page 90% |
| Connections by application / role | trend; a single client hoarding connections is the usual cause |
| Idle-in-transaction connections | page if any exceeds 60s — this is what blocks migrations |
| CPU utilisation | warn 70% sustained 10m |
| Disk usage and growth rate | warn 75%, page 85%, and alert on the *rate* — Supabase storage does not shrink on its own |
| Replication lag (if read replicas) | page > 30s |

### 2.3 Query health

| Signal | Threshold |
|---|---|
| p95 / p99 statement duration | alert on a 2× week-over-week regression, not an absolute number |
| Statements > 1s | log always; alert on rate |
| Deadlocks | any deadlock → warn; deadlocks are a code bug, not load |
| Sequential scans on tables > 100k rows | weekly report, not an alert |
| `pg_stat_statements` top-20 by total time | weekly review |

### 2.4 Correctness and change

| Signal | Threshold |
|---|---|
| Migration applied / failed | page on failure — see §0 of `MIGRATION-POLICY.md` for why a *partial* apply is the real risk |
| Failed authentication attempts | alert on a spike per IP or per account |
| Backup completed with non-trivial size | page if missing or if size drops sharply vs. the trailing median |
| Retention job rows-deleted per table | alert on **zero across all tables**, which is what a silently broken job looks like (see `DATA-RETENTION-POLICY.md`) |
| Audit-log write rate | alert on a drop to zero while traffic continues |

---

## 3. Connections and pooling

**There is no application-level connection pool to configure, and that is
correct for this architecture.** Peskids talks to Postgres exclusively through
`@supabase/supabase-js` (`apps/peskids/lib/supabase.ts`), i.e. PostgREST over
HTTPS. No `pg`, `knex`, `drizzle` or `prisma` dependency exists in
`apps/peskids` or `apps/api`. Pooling is therefore Supabase's Supavisor, on the
server side, and nothing in this repository configures it.

Direct-Postgres consumers are limited to:

| Consumer | Connection |
|---|---|
| `scripts/backup-tenants.sh` | `DB_CONNECTION_STRING` (Doppler) |
| `scripts/purge-peskids-demo-data.sh` | PostgREST, not direct |
| Hermes stack | its own `infra-postgres`, unrelated to Supabase |

**What is not established anywhere in the repository, and needs the dashboard:**

- the connection limit of the current Supabase plan
- whether the app connects via the pooler (port 6543) or directly (5432)
- pool mode (transaction vs session) — session mode with serverless functions
  is the classic way to exhaust a Supabase connection limit
- `statement_timeout` and `idle_in_transaction_session_timeout`

That last one matters more than it sounds. With no `statement_timeout`, one
runaway dashboard query holds a connection indefinitely; with no
`idle_in_transaction_session_timeout`, one abandoned transaction blocks every
subsequent `ALTER TABLE` — which is how a routine migration turns into an
outage. Neither is set anywhere in this repo. **Recommend setting both at the
role level** for `authenticated` and `service_role`, which is a one-line
`ALTER ROLE` and does not need a code change.

---

## 4. Query performance — static review

Reviewed the service layer behind the dashboards named in the audit brief:
`lead-pipeline`, `lead-admin`, `dashboard`, `attendance-risk`, `student`,
`class`, `agenda` (`apps/peskids/lib/services/`).

### Architectural note

Every server-side query is issued by a client constructed with the **service
role key** (`apps/peskids/lib/supabase.ts:19`), optionally overriding the
`Authorization` header with a user token. Because `service_role` is BYPASSRLS,
the default path performs **no** row-level filtering: tenant isolation is
`.eq('tenant_id', tenantSlug)` written by hand at each call site. This is the
application-side mirror of the RLS findings in `RLS-MATRIX.md` — the database
policies are a backstop that is currently never consulted.

### Indexes added (migration `0102`)

Only where a query in the code demonstrably lacks support. This is deliberately
not a blanket indexing pass.

| Query | Location | Gap | Added |
|---|---|---|---|
| `leads WHERE tenant_id = ? ORDER BY created_at DESC` | `lead-pipeline.service.ts:273` | `idx_leads_tenant` gives the filter but not the ordering; the two composites lead with `(tenant_id, franchise_id)` and `(tenant_id, lead_type)`, so neither supplies it either | `idx_leads_tenant_created (tenant_id, created_at DESC)` |
| `students WHERE tenant_id = ? AND status = 'active'` | `dashboard.service.ts:88`, `attendance-risk.service.ts:106` | only single-column `idx_students_tenant` and `idx_students_status` | `idx_students_tenant_status (tenant_id, status)` |

### Duplicate indexes removed (migration `0102`)

Byte-for-byte identical pairs created by two migrations under different names.
A duplicate index is written on every INSERT and UPDATE and never chosen twice.

| Table | Dropped | Kept |
|---|---|---|
| `public.leads` | `idx_leads_tenant_id` | `idx_leads_tenant` |
| `platform.feedback_decisions` | `idx_decisions_type` | `idx_decisions_type_created` |

### Not indexed, on purpose

`docs/database/SCHEMA-FINDINGS.md` lists ~180 `FK_NOT_INDEXED` findings. Most
are on low-cardinality or low-volume tables where an index would cost more in
writes than it saves in reads. They matter when the parent row is deleted or
updated; revisit them if tenant deletion ever becomes a routine operation.

**BLOCKED:** none of the above is validated against real data volumes. Before
acting further, get `pg_stat_statements` top-20 by total time and
`EXPLAIN (ANALYZE, BUFFERS)` for the two queries above from production. At
Peskids' current size the planner may reasonably ignore both new indexes; they
are cheap insurance, not a measured win.

---

## 5. Implementation order

1. Point a Prometheus scrape at the **Supabase** project, or accept the
   dashboard as the only source and say so explicitly. Today the alerts imply
   coverage that does not exist, which is worse than no alerts.
2. Set `statement_timeout` and `idle_in_transaction_session_timeout` at the role
   level.
3. Alert on backup absence and on retention-job silence (§2.4) — both are
   currently failure modes that produce no signal at all.
4. Add RLS-denial and rows-per-request metrics (§2.1) once the RLS gaps in
   `SCHEMA-FINDINGS.md` are closed; before then they would be uniformly zero and
   falsely reassuring.
5. Enable `pg_stat_statements` and start the weekly top-20 review.

---

## Related

- [[database/MIGRATION-POLICY|Migration & Release-Gate Policy]]
- [[database/BACKUP-RESTORE-VERIFICATION|Backup & Restore Verification]]
- [[database/RLS-MATRIX|RLS Policy Matrix]]
- [[database/SCHEMA-FINDINGS|Schema Findings]]
- [[runbooks/TENANT-MONITORING|Tenant monitoring]]
