# NPM Audit Exemptions

This file documents pre-existing security vulnerabilities that are known but currently blocked by monorepo constraints or awaiting upstream fixes.

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
