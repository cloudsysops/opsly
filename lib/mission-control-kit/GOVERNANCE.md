# Mission Control Kit — Governance

**Owner:** platform
**Module:** `@intcloudsysops/mission-control-kit`
**Status:** stable (v1 contracts)

## Scope

Reusable **contracts** for Mission Control shells:

| Mode | Consumer example | Owns |
|------|------------------|------|
| `platform` | Opsly Moon (`apps/admin`) | Cross-tenant control plane |
| `agency` | ICSO (`apps/icso`) | Agency pipeline / catalog / delivery |
| `tenant` | Peskids / future clients | Client ops panel |

## Rules

1. Logic and schemas live here; **branding + domain data** stay in `apps/<slug>`.
2. Never ship secrets, MRR ficticio, or cross-tenant PII helpers that encourage leaks.
3. Breaking profile schema → MAJOR version + migration note.
4. New nav presets must pass `assertNoForbiddenNavPaths` for the profile's `dataBoundaries`.

## Review

PRs that change `profile.ts` / presets require architecture glance (ADR-044 modularity).
