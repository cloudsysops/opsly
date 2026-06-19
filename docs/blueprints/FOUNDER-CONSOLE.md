---
status: draft
owner: architecture
last_review: 2026-06-18
---

# Opsly Founder Console

Minimum executive read model for Cristian.

**Purpose:** show operational truth in one place so the founder can decide what to sell, what to fix, and what to delegate.

## Core sections

### 1. Clients

- active clients
- incubating tenants
- extraction-ready tenants
- stalled tenants

### 2. Leads

- leads last 7 days
- leads by source
- converted leads
- pending follow-ups

### 3. GHL Sync

- location health
- webhook reachability
- pipeline / form mapping status
- last successful sync

### 4. Platform Health

- API health
- orchestrator health
- LLM gateway health
- Redis health
- tenant health

### 5. Deploy State

- latest deploy run
- branch / commit
- current VPS sync status
- smoke check last result

### 6. Critical Errors

- failing webhook routes
- failed health checks
- failed deploys
- unresolved approvals

### 7. Action Queue

- tasks per client
- manual approvals pending
- next recommended action

## Metrics to show

Only the metrics that answer a decision:

1. active clients
2. new leads in the last 7 days
3. leads by source
4. GHL sync status
5. platform health status
6. last deploy status
7. critical errors
8. tasks pending per client
9. ready-for-demo status
10. next action recommended

## Data sources

| Metric | Likely source |
| --- | --- |
| Active clients | tenant registry / tenant configs |
| Leads last 7 days | tenant APIs / Supabase |
| Leads by source | Supabase / event logs |
| GHL sync status | `/api/health/ghl` and GHL validation |
| Platform health | `/api/health`, orchestrator / gateway health |
| Last deploy | GitHub Actions / `gh run list` |
| Critical errors | log summaries / incident routes |
| Tasks pending | approvals queue / runbooks |
| Demo readiness | smoke scripts |
| Next action | derived from the above |

## Read model rules

- Read-only first.
- Tenant-scoped by default.
- No cross-tenant data leakage.
- Approval queue is visible, not silently executed.
- Every status widget should be explainable from a source path or API route.

## MVP layout

- header: founder status, branch, deploy, demo readiness
- row 1: clients, leads, GHL sync
- row 2: health, errors, approvals
- row 3: next actions and tenant drill-down

## Not in v0

- billing
- deep analytics
- AI autopilot
- cross-tenant benchmarking
- mutable actions

