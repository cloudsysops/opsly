---
status: canon
owner: founder
last_review: 2026-09-11
type: operating-plan
---

# Revenue-First Operating Plan

## Current repo reality

Observed from GitHub on 2026-09-11:

- open issues: 290
- open PRs: 39
- open issues labeled `automated`: 281
- open issues labeled `tenant-health`: 275
- open issues created before 2026-06-01: 287

Therefore the raw issue count is not the human backlog.

Historical automated alerts are operational evidence, not 275 independent founder tasks.

## Revenue priorities

### P0 — protect paying production

Peskids is explicitly tracked as a paying production tenant in issue #1193.

Goal:

- prove runtime state;
- protect lead intake;
- verify backups/health;
- prevent agents from mutating production without approval.

### P0 — create next sellable vertical

Issue #1192 defines Health Tourism Colombia as the next demo-ready revenue vertical.

Ship only the smallest synthetic end-to-end flow:

`provider -> catalog -> quote -> case -> booking -> dashboard`

Do not generalize the entire platform before demoing/selling it.

### P0 — increase execution capacity

Issue #1191 brings the PC Gamer online as a local compute/agent worker through the existing Opsly stack.

This is leverage, not a product by itself.

## Product bets

Ranked by time-to-revenue:

1. sell vertical operating systems to SMBs directly;
2. license Opsly to agencies/consultants per tenant;
3. package Agent Ops / engineering control loop for developers;
4. validate Career OS using the founder as dogfood.

## Backlog policy

### Human WIP

Only work that affects:

- revenue;
- customer retention;
- production safety;
- security;
- strategic platform leverage;

may enter founder WIP.

### Automated alerts

Automated historical health issues:

- do not enter the sprint automatically;
- deduplicate by tenant/service/incident window;
- preserve security/CVE/data-loss items;
- close or archive stale duplicates only through conservative policy with comments/evidence.

### WIP

Maximum active build/review workstreams: 4.

If more than 4 are active, finish before starting.

## Weekly founder metrics

Business:

- MRR
- paying tenants
- qualified pipeline
- demos
- proposals
- conversion

Engineering:

- active workstreams
- lead time to merge
- CI failure rate
- production incidents
- agent task success rate
- AI/provider spend

The objective is not maximum code output.

The objective is:

`founder decision time -> shipped customer/revenue outcome`.
