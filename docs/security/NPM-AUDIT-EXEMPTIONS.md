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
