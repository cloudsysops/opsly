# @intcloudsysops/franchise-core

Reusable **Franchise OS** core — networks, franchisees, units, territories,
agreements, a **versioned royalty engine**, audits and corrective actions.
Tenant-agnostic; **Peskids is the first adapter**.

> Never create a new Opsly tenant per franchise/sede. A tenant hosts one or more
> franchise networks; a franchisee operates 1..N units; owned units
> (flagship/owned/mobile) have a null franchisee.

## Install

```bash
npm install @intcloudsysops/franchise-core
```

Next.js consumers add it to `transpilePackages` (NodeNext source is shipped as
TypeScript via `main/types: ./src/index.ts`).

## Modules

| Module | Responsibility |
| --- | --- |
| `constants.ts` | Single source of truth for enum unions (also used by `schemas.ts`) |
| `types.ts` | Domain types (units, franchisees, territories, agreements, royalties, audits…) |
| `schemas.ts` | Zod input contracts (no vertical-specific logic) |
| `territory.ts` | Conservative exclusivity/overlap detection (haversine + bbox; no GIS engine) |
| `agreement.ts` | Agreement lifecycle: derived status, expiry alerts, notice compliance |
| `royalty.ts` | Versioned reproducible royalty arithmetic + immutable snapshots |
| `audit.ts` | Audit + corrective-action status flow and composite scoring |

## Royalty engine (must-read)

- A `RoyaltyRule` is versioned. `createNextRuleVersion(prev, patch)` bumps the
  version and closes the previous window (`effectiveTo = end of the day before
  the new effectiveFrom`). History is never mutated in place.
- `computeRoyaltyForReport` selects the rule in force for the report period and
  builds an immutable `RoyaltyCalculation` pinning `ruleVersion` with
  `inputs` / `calculation` / `result` JSON snapshots.
- Idempotency: `royaltyCalculationKey({ tenantId, unitId, salesReportId, ruleVersion })`
  → `{tenant}:{unit}:{report}:v{N}` (mirrored by a UNIQUE constraint in the
  `royalty_calculations` table).

```ts
import {
  computeRoyaltyForReport,
  createNextRuleVersion,
  snapshotRule,
} from '@intcloudsysops/franchise-core';

const { next, superseded } = createNextRuleVersion(v1, { percentage: 6, effectiveFrom: '2026-07-01' });
const calc = computeRoyaltyForReport({ rules: [superseded, next], salesReport, tenantId, unitId });
```

## Territory engine

`territoriesOverlap` reports `confidence: 'high' | 'unknown'`. Polygon and
municipality checks are conservative (bounding boxes / reference data needed) so
a human confirms before enforcing exclusivity. No GIS engine is embedded.

## Persistence

Generic tables + RLS live in `supabase/migrations/0098_franchise_core.sql`.
`royalty_calculations` is immutable (service_role INSERT/SELECT only, like
`platform.audit_events`).

## Adapters

- Peskids → core: `apps/peskids/lib/franchise/` (unit + sales-report mapping).
- Signatures / payments are adapter contracts, not built in core.

## Development

```bash
npm run type-check -w @intcloudsysops/franchise-core
npm run test -w @intcloudsysops/franchise-core
```

See `GOVERNANCE.md` for versioning and review rules.