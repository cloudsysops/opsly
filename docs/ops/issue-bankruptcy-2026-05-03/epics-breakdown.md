# Epic breakdown (suggested) — do **not** auto-create sub-issues

Epics are **logical** groupings for humans to create manually when ready.

## Epic 1 — Tenant health & automated alerts

**Theme:** 🔴 [Auto] Tenant *&lt;slug&gt;* unreachable after restart (and variants).

**Suggested sub-issues (titles only):**

1. Dedupe / rate-limit GitHub issue creation from tenant-health automation.
2. Per-tenant runbook: verify n8n + uptime URLs + Traefik labels after restart.
3. Single “incident” issue template: link stack logs, compose project name, last deploy.
4. Exit criteria: &lt; N open `tenant-health` issues per week (define N).

**Label:** `epic` + `keep-backlog` until policy approved.

## Epic 2 — GitHub Actions & repo hygiene

**Theme:** CI noise, actionlint, branch protection, stale workflows.

**Suggested sub-issues:**

1. Add GitHub **stale** / **lock** workflow with safe defaults (see parent report `docs/ops/issue-bankruptcy-2026-05-03.md` and issue #195).
2. Confirm required checks and CODEOWNERS for sensitive paths.
3. Document “automation opens issue” ownership (`needs-owner` rotation).

## Epic 3 — Security & compliance (placeholder)

**Theme:** CVE, data leak, secret exposure.

**Note:** Current open set had **0** title matches for security/CVE/data-leak heuristics; keep this epic for **manual** escalation when applicable — **never** auto-close.
