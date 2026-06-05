---
status: draft
owner: architecture
last_review: 2026-05-26
---

# Tenant Analytics Implementation Guide

This guide turns ADR-045 into an implementation sequence for Opsly and any
tenant that needs BI, including Peskids.

## Goal

Deliver reusable tenant analytics without introducing a cluster-first runtime.
The default path is:

1. collect operational data by `tenant_slug`
2. compute metrics in a Python batch job with `pandas`
3. persist a snapshot artifact
4. let the app/dashboard read the snapshot when present
5. extract to tenant-owned infra later without changing the contract

## Recommended stack

- Python 3.11+
- `pandas` for aggregation and window calculations
- `requests` for Supabase REST reads
- `python-dotenv` for local runs
- Arrow / Parquet-compatible artifacts when moving tabular data between tools
- Existing Next.js dashboards for rendering
- Apache Superset only if the tenant needs self-service BI over SQL sources

## Not the default

- Apache Spark
- a new analytics cluster
- tenant-specific BI forks

Spark can be introduced later if the data volume or job complexity clearly
requires distributed execution. It is not the starting point for incubation.

## Snapshot contract

The batch should produce one JSON artifact per tenant:

- `generatedAt`
- `tenantId`
- `admin`
- `teacher`
- `families.byParentEmail`
- `trends`

The snapshot should remain stable so the app can consume it without code forks.

## Implementation sequence

### 1. Add the batch job

Place the batch runner inside the tenant app or a shared analytics package.
It should:

- read tenant data from Supabase
- aggregate by `tenant_slug`
- write the snapshot to a runtime path or object store

For Peskids in this repo, the current batch runner is:

- `scripts/peskids-bi-snapshot.sh`
- `apps/peskids/analytics/peskids_bi.py`

On VPS, install the cron with:

```bash
sudo bash /opt/opsly/scripts/install-peskids-bi.sh
```

### 2. Add the runtime loader

The Next.js app should:

- read the snapshot if it exists
- fall back to live aggregation if the snapshot is missing
- never block the dashboard on the batch job

### 3. Expose role metrics

Use the same snapshot to feed:

- admin cockpit
- teacher dashboard
- family dashboard

### 4. Keep extraction-safe

The snapshot contract must survive tenant extraction to a dedicated VPS.
Only the storage location and deployment mode should change.

### 5. Add visualization later if needed

If the tenant outgrows the embedded dashboard, Superset can sit on top of the
same SQL sources. Do not couple the batch logic to the visualization layer.

## Operational rules

- Every job is keyed by `tenant_slug`.
- Every metric is generated from shared logic.
- Every UI surface reads the same snapshot contract.
- Every new tenant gets the batch through configuration, not by copy-paste.

## Current reference

- `apps/peskids/analytics/peskids_bi.py`
- `apps/peskids/lib/bi-snapshot.ts`
- `apps/peskids/lib/role-metrics.ts`
- `apps/peskids/components/admin/dashboard-view.tsx`

## Related docs

- `ARCHITECTURE.md`
- `TENANT-INCUBATION-LIFECYCLE.md`
- `../adr/ADR-044-core-first-tenant-slug-extraction.md`
- `../adr/ADR-045-tenant-analytics-batch-python-pandas-arrow.md`
