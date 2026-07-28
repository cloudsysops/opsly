# NPM Audit Exemptions

This file documents pre-existing security vulnerabilities that are known but currently blocked by monorepo constraints or awaiting upstream fixes.

## Exempted Vulnerabilities

### dompurify (moderate)
- **ID:** GHSA-cmwh-pvxp-8882
- **Reason:** Introduced via `mermaid` dependency. Upgrading causes lockfile churn and version conflicts in the current environment.
- **Status:** Acknowledged.

### undici (high)
- **ID:** GHSA-vmh5-mc38-953g, GHSA-pr7r-676h-xcf6, etc.
- **Reason:** Core dependency for `jsdom` used in testing.
- **Status:** Acknowledged.

### brace-expansion (high)
- **ID:** GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg
- **Reason:** Transitive dependency of legacy `eslint` and `glob`. Upgrading causes breaking changes.
- **Status:** Acknowledged.

### sharp (high)
- **ID:** GHSA-f88m-g3jw-g9cj
- **Reason:** Optional dependency of `next` framework packages. Upgrading is blocked by framework boundaries.
- **Status:** Acknowledged.

### xlsx (high)
- **ID:** GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9
- **Reason:** Legacy dependency. Awaiting upstream fixes or refactoring.
- **Status:** Acknowledged.
