# Peskids golden flows

**Status:** Product acceptance target  
**Last reviewed:** 2026-08-28

## Flow A — franchise readiness

```text
Peskids Admin → Franchises → Candidates
→ create → qualify → discovery → financial review → approve
→ convert idempotently → franchisee + proposed unit
→ territory request/review → agreement readiness
→ opening checklist → activation readiness
```

- Candidate, Franchisee and Unit are separate records.
- Tenant is always `peskids`; auth and scope are server-side.
- Proposed units cannot be activated by a UI toggle.
- Desired territory is interest, not legal exclusivity.
- Commercial/legal values remain `PENDING` until approved.

## Flow B — content readiness

```text
Peskids Admin → Marketing → Campaign
→ brief → content project → generate → rights review
→ render → visual review → human approval → export ready
```

- `lib/content-studio` remains reusable; Peskids does not fork it.
- Every job carries `tenant_slug` and `request_id`.
- Peskids, ICSO and Universe brand data remain isolated.
- Rights must be `CLEAR` before export-ready.
- Provider metrics unavailable in V1 are `NOT_CONNECTED`.

## Evidence required

Each flow needs domain tests, API authorization tests, ephemeral Postgres/RLS
tests and a browser smoke test when credentials are available. Missing data is
reported as `UNKNOWN`, never fabricated.

