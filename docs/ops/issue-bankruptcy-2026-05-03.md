# Issue bankruptcy report — 2026-05-03

**Repository:** `cloudsysops/opsly`  
**Scope:** Triage, labels, and **review-only** automation scripts — **no bulk closes** executed in this pass.

## Executive summary

- **164** open issues; **164** unassigned; **164** without milestone.
- **160** issues carry `automated` + `bug` + `tenant-health` — a **homogeneous backlog** of recurring tenant reachability alerts.
- **No** issues are idle &gt;60d or &gt;90d by `updatedAt` / `createdAt`: automation keeps timestamps fresh (2026-04-14 → 2026-05-03). **Stale-close search would return ~0 candidates today.**
- **0** open issues matched a naive security/CVE/data-leak **title** regex; still treat security as **manual-only** in any future batch.

## Projections

| Scenario | Outcome |
|----------|---------|
| Status quo (daily automation updates) | `updated:<date>` stale filters stay **empty**; backlog stays high **unless** dedupe policy changes. |
| Dedupe + one epic + close duplicates with comments | Open count could drop **~150+** in a controlled human review window. |
| GitHub Actions `stale` workflow (conservative) | Surfaces true rot after automation stops touching old issues; pair with `keep-backlog` for exceptions. |

## Actions completed (this pass)

1. Exported open issues via `gh issue list` (JSON, local `/tmp/opsly-issues-open.json` during run).
2. Wrote **`docs/ops/issue-bankruptcy-2026-05-03/issues-triage.md`** — counts, buckets, top labels, oldest 20 links. (Prompt asked for `tmp/`; repo `validate-structure` blocks new root `tmp/` — artifacts live under this folder.)
3. Created triage labels on GitHub (if missing): `stale-closed`, `needs-info`, `needs-owner`, `keep-backlog`, `quick-win`, `epic`.
4. Wrote **`docs/ops/issue-bankruptcy-2026-05-03/triage-commands.sh`** — **templates only**; `bash -n` validated. **Do not** run mass `gh issue close` without per-issue comments and exclusions.
5. Wrote **`docs/ops/issue-bankruptcy-2026-05-03/quick-wins.md`** and **`docs/ops/issue-bankruptcy-2026-05-03/epics-breakdown.md`** — heuristics and epic outline (**no** sub-issues created).
6. Opened follow-up issue **Setup auto-stale workflow:** https://github.com/cloudsysops/opsly/issues/195

## Recommendations

1. **Product / ops:** Own a **dedupe policy** for `tenant-health` (one open incident per tenant per window, or link to external incident tool).
2. **Engineering:** Implement **stale** workflow with `exempt-issue-labels: keep-backlog` and long `days-before-stale` to avoid fighting automation.
3. **Process:** Before any batch close — **comment**, `sleep 1`, exclude `keep-backlog`, milestones, &gt;5 comments, and security keywords.

## References

- `docs/ops/issue-bankruptcy-2026-05-03/issues-triage.md` — full table.
- `docs/ops/issue-bankruptcy-2026-05-03/triage-commands.sh` — reviewed shell templates.
- `docs/ops/issue-bankruptcy-2026-05-03/quick-wins.md`, `epics-breakdown.md` — planning only.
