# NPM Audit Exemptions

This file documents pre-existing security vulnerabilities that are known but currently blocked by monorepo constraints or awaiting upstream fixes.

**Note:** the `npm audit (moderate+)` CI gate (`.github/workflows/security.yml`) only fails on `--omit=dev`, so anything reachable exclusively through a devDependency (e.g. `prisma` CLI tooling) does not block merges even if `npm audit` (without `--omit=dev`) still reports it.

## Resolved (2026-09-04)

`d3-color`, `fast-uri`, and `qs` (plus its dependents `body-parser`/`express`) were flagged by the moderate+ gate. Root cause: the `overrides` block in root `package.json` already pinned `fast-uri` (3.1.5) and `qs` (6.15.2) to versions that were *inside* the vulnerable range, and `d3-color` had no override at all (stuck at 2.0.0 via `react-simple-maps` → `d3-zoom` in `apps/peskids-franchise`). Fix: bumped the pinned overrides to patched versions (`fast-uri` → 3.1.7, `qs` → 6.16.0, both same-major/non-breaking) and added a new `d3-color` → `^3.1.0` override (matches the version `mermaid`'s own `d3` dependency already resolves to). Verified with `tsc --noEmit` on `peskids-franchise`, `notion-mcp`, and `task-orchestrator` (the apps touching these deps directly or via `express`) — no type errors introduced. `npm audit --audit-level=moderate --omit=dev` now returns 0 findings.

## Exempted Vulnerabilities

### dompurify (moderate)
- **ID:** GHSA-cmwh-pvxp-8882
- **Reason:** Introduced via `mermaid` dependency. Upgrading causes lockfile churn and version conflicts in the current environment.
- **Status:** Acknowledged.

### mermaid (moderate)
- **ID:** GHSA-c4c3-pg64-4m4v, GHSA-6x64-9x62-f2gx, GHSA-3rrr-jr9j-h3q3, GHSA-2v8p-3f2j-5mp7, GHSA-rhh3-jpg6-66xh
- **Reason:** `mermaid` is version-pinned (11.x) for diagram rendering in `apps/admin` and other consumers; neither `npm audit fix` nor `npm audit fix --force` moves the resolved version. Fixing requires a manual major-version upgrade and revalidating every diagram-rendering surface — out of scope for an unrelated feature PR.
- **Status:** Acknowledged. `npm audit` does not currently consult this file — the `npm audit (moderate+)` CI check will stay red until mermaid is upgraded or a maintainer merges with an override.

### undici (high)
- **ID:** GHSA-vmh5-mc38-953g, GHSA-pr7r-676h-xcf6, etc.
- **Reason:** Core dependency for `jsdom` used in testing.
- **Status:** Acknowledged.

### deepmerge-ts (high, devDependency only)
- **ID:** GHSA-ggr8-5vv4-36mx
- **Reason:** Pulled in by `prisma`'s `@prisma/config` (devDependency of `apps/peskids-franchise` only). An override to `^8.0.2` was attempted but left the tree in an `invalid` (unresolvable peer) state — `@prisma/config@6.19.3` pins `deepmerge-ts@7.1.5` internally in a way npm couldn't reconcile. Does not affect the CI gate (`--omit=dev` excludes it).
- **Status:** Acknowledged. Revisit when `@prisma/config` ships a release depending on `deepmerge-ts@^8`.
