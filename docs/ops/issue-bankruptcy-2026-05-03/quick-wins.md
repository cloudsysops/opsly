# Quick wins (heuristic triage) — opsly open issues

**Context:** 164 open issues; **160** share `automated` + `bug` + `tenant-health` — recurring **tenant unreachable after restart** style alerts.

## Effort **S** (same day, mostly process / config)

1. **Dedupe automation issues** — One runbook + one tracking epic; close or merge duplicates **with a comment** pointing to the canonical incident or dashboard (avoid silent mass close).
2. **Tune nightly / health job** — Open a single issue: “Reduce duplicate GitHub issues from tenant-health bot” (threshold, dedupe key per tenant+day, or `state_reason`).
3. **Apply `needs-owner`** to a bounded batch of unassigned items once owners are defined (see `triage-commands.sh` in this folder).

## Effort **M** (few days)

1. **Root-cause one tenant stack** — Pick highest-noise tenant from titles; fix compose/Traefik/health until alerts stop; document in `docs/runbooks/`.
2. **Wire alerts to Discord/on-call** instead of only GitHub issues — fewer open issues, same visibility.

## Effort **L** (epic)

1. **Observability platform** — SLO per tenant, alert grouping, incident IDs — see `epics-breakdown.md` in this folder.

## Candidates tagged in GitHub

Use label **`quick-win`** on issues that are truly isolated (docs typo, one-line config, single-tenant false positive). **Do not** mass-tag the 160 automated duplicates without a dedupe policy.
