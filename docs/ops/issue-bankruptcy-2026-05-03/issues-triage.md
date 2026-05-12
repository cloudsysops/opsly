# Issue triage snapshot — cloudsysops/opsly

**Generated:** 2026-05-03 (local `gh` export)  
**Source:** `gh issue list --repo cloudsysops/opsly --state open --limit 300 --json number,title,labels,createdAt,updatedAt,author,assignees,milestone,body`

## Totals

| Metric | Count |
|--------|------:|
| Open issues | **164** |
| Unassigned (`assignees` empty) | **164** |
| No milestone | **164** |
| No `updatedAt` older than 60 days (cutoff `2026-03-04`) | **0** (all touched Apr 14–May 3, 2026) |
| Titles matching security/CVE/data-leak (regex, case-insensitive) | **0** |

## Age buckets (`updatedAt`)

All 164 issues have `updatedAt` between **2026-04-14** and **2026-05-03** (automation churn). Buckets vs 2026-05-03:

| Bucket | Count |
|--------|------:|
| &lt; 30 days | 164 |
| 30–90 days | 0 |
| &gt; 90 days | 0 |

## Age buckets (`createdAt`)

| Bucket | Count |
|--------|------:|
| &lt; 30 days (created after 2026-04-03) | 164 |
| 30–90 days | 0 |
| &gt; 90 days | 0 |

## Top labels (open issues)

| Label | Count |
|-------|------:|
| `automated` | 160 |
| `bug` | 160 |
| `tenant-health` | 160 |

(Counts overlap: same issues carry all three labels.)

## Top 20 oldest by `createdAt` (all same day batch; representative)

| # | Created (UTC) | Title (trimmed) |
|---|---------------|-----------------|
| 7 | 2026-04-14 | 🔴 [Auto] Tenant localrank unreachable after restart |
| 6 | 2026-04-14 | 🔴 [Auto] Tenant jkboterolabs unreachable after restart |
| 5 | 2026-04-14 | 🔴 [Auto] Tenant intcloudsysops unreachable after restart |
| 4 | 2026-04-14 | 🔴 [Auto] Tenant smiletripcare unreachable after restart |
| 3 | 2026-04-14 | 🔴 [Auto] Tenant peskids unreachable after restart |
| … | 2026-04-14 | (same pattern; duplicates across tenants / runs) |

Links (same order as export):

- https://github.com/cloudsysops/opsly/issues/7
- https://github.com/cloudsysops/opsly/issues/6
- https://github.com/cloudsysops/opsly/issues/5
- https://github.com/cloudsysops/opsly/issues/4
- https://github.com/cloudsysops/opsly/issues/3
- https://github.com/cloudsysops/opsly/issues/12
- https://github.com/cloudsysops/opsly/issues/11
- https://github.com/cloudsysops/opsly/issues/10
- https://github.com/cloudsysops/opsly/issues/9
- https://github.com/cloudsysops/opsly/issues/8
- https://github.com/cloudsysops/opsly/issues/13
- https://github.com/cloudsysops/opsly/issues/18
- https://github.com/cloudsysops/opsly/issues/17
- https://github.com/cloudsysops/opsly/issues/16
- https://github.com/cloudsysops/opsly/issues/15
- https://github.com/cloudsysops/opsly/issues/14
- https://github.com/cloudsysops/opsly/issues/22
- https://github.com/cloudsysops/opsly/issues/21
- https://github.com/cloudsysops/opsly/issues/20
- https://github.com/cloudsysops/opsly/issues/19

## Interpretation

The open backlog is **dominated by automated tenant-health alerts** (labels `automated`, `bug`, `tenant-health`). There is **no long-idle tail** by GitHub `updatedAt`/`createdAt` in this snapshot: bankruptcy **stale-close rules do not apply yet** until issues stop receiving automation updates or a policy dedupes recurring alerts.

## Triage labels (repo)

Created or verified on `cloudsysops/opsly`: `stale-closed`, `needs-info`, `needs-owner`, `keep-backlog`, `quick-win`, `epic`.
