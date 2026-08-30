---
title: "lib/franchise-core Governance"
description: "Reusable Franchise OS core — versioned royalties, tenant-agnostic"
---

# lib/franchise-core Governance

- **Owner:** operations / platform
- **Consumers:** `apps/peskids` (first adapter), future tenant apps (academies, restaurants, barbershops)
- **Non-dependencies:** must NOT import `apps/*`, `content-studio`, YouTube agents, or any tenant vertical library. Business verticals (swimming, food…) live in tenant adapters, never here.

## Versioning

- Semantic versioning (`semver`).
- Pure additive exports (new types/functions) → **MINOR**.
- Behavior change to royalty arithmetic, territory overlap semantics, agreement status derivation or audit scoring → **MAJOR** with an ADR and a migration note.
- `RoyaltyCalculation` snapshots are immutable contract: never change how past history is interpreted.

## Eligibility (what this package accepts)

Peskids specifics (swimming standards, `llanogrande-principal`, `domicilios-peskids`) are forbidden here. They map via `apps/peskids/lib/franchise/*.adapter.ts`.

## Review

- PRs touching `src/royalty.ts`, `src/territory.ts` or `src/agreement.ts` require a human pass before merge.
- Test coverage gate: ≥80% on the engine modules (royalty, territory, agreement, audit).
- Royalty rule changes must never silently recompute history.