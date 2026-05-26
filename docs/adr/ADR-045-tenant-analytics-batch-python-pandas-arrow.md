---
status: draft
owner: architecture
last_review: 2026-05-26
type: adr
tags:
  - opsly/adr
---

# ADR-045 — Tenant analytics via Python/pandas batch snapshots, Arrow for interchange, no Spark in core

## Estado

Proposed.

## Arquitectos

- Claude
- Codex

## Contexto

Peskids and future tenants need richer BI and operational analytics:

- admin wants live operational metrics and alerts
- teachers need class and student metrics
- families need their own progress and chat metrics
- support needs case and escalation metrics

We need an analytics path that is:

1. reusable across tenants
2. lightweight enough for Opsly incubation
3. safe to run as a batch job
4. easy to extract later with the tenant

We evaluated Apache Spark, Apache Arrow, and Apache Superset:

- Spark is a distributed processing engine intended for cluster and large-scale workloads.
- Arrow is a multi-language columnar data toolbox and interchange layer, including Swift support.
- Superset is a data exploration and visualization platform that sits on top of existing SQL data sources.

For the current tenant-incubation stage, Spark is more operational weight than we need.

## Decision

Use a **Python batch snapshot pipeline** for tenant analytics, with **pandas** for metric computation and **Arrow/Parquet-compatible data interchange** where needed.

### Required pattern

1. Compute BI in a batch job per `tenant_slug`.
2. Persist a JSON snapshot or columnar artifact for the dashboard to read.
3. Keep the computation reusable and tenant-agnostic.
4. Keep the output contract stable so the tenant can later extract to its own VPS.
5. Use Arrow/Parquet when moving large tabular data between tools or languages.

### Not selected now

- Apache Spark as the default core analytics runtime
- a tenant-specific analytics fork
- a separate cluster-first architecture before the tenant justifies it

### Optional later

- Apache Superset as a visualization layer if we want a self-service BI surface
- Spark only if a tenant reaches data volume or job complexity that clearly exceeds single-node batch processing

## Consequences

### Positive

- Fast to implement and easy to operate inside Opsly
- Reusable by tenant through a common batch contract
- Fits the current incubation/extraction model
- Keeps the analytics decision inside the same architectural rules as the rest of the platform

### Negative

- Not a distributed cluster architecture
- Batch snapshots can be slightly stale
- Large-scale cross-tenant analytics may eventually need a warehouse or Spark-like engine

### Mitigations

- Run the snapshot frequently enough for the dashboard use case
- Keep the schema stable and versioned
- Add tenant-level tests for snapshot generation
- Extract to dedicated infra only when the tenant proves the need

## Operational Rules

- Every analytics job must be keyed by `tenant_slug`.
- Every reusable metric should live in the shared batch pipeline, not inside a tenant fork.
- Every dashboard should read from the snapshot contract, not from custom one-off logic.
- Any future visualization layer must stay optional and pluggable.

## Reference implementation

- `apps/peskids/analytics/peskids_bi.py`
- `apps/peskids/lib/bi-snapshot.ts`
- `apps/peskids/lib/role-metrics.ts`
- `apps/peskids/components/admin/dashboard-view.tsx`

## Related Documents

- `AGENTS.md`
- `docs/01-development/VISION.md`
- `docs/00-architecture/ARCHITECTURE.md`
- `docs/00-architecture/TENANT-INCUBATION-LIFECYCLE.md`
- `docs/adr/ADR-044-core-first-tenant-slug-extraction.md`

## Referencias

- Apache Spark Documentation: distributed processing and pandas on Spark
- Apache Arrow Overview: columnar format and multi-language toolbox, including Swift
- Apache Superset Overview: visualization platform and dashboarding

