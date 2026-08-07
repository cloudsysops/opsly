# NPM Audit Exemptions

This file documents pre-existing security vulnerabilities that are known but currently blocked by monorepo constraints or awaiting upstream fixes.

**Current status:** `npm audit --audit-level=moderate` (with or without `--omit=dev`) reports **0 vulnerabilities** as of 2026-08-07. No active exemptions.

## Resolved

### mermaid (moderate) — resolved 2026-08-07
- **ID:** GHSA-c4c3-pg64-4m4v, GHSA-6x64-9x62-f2gx, GHSA-3rrr-jr9j-h3q3, GHSA-2v8p-3f2j-5mp7, GHSA-rhh3-jpg6-66xh
- **Vulnerable range:** `>=11.0.0-alpha.1 <11.16.1`
- **Fix:** a non-alpha patched release (`11.16.1`) became available upstream after this exemption was written. Bumped the root `overrides.mermaid` and the two direct `"mermaid"` dependency declarations (`package.json`, `apps/admin/package.json`) from `^11.4.0` to `^11.16.1`, then regenerated `package-lock.json` with `npm install`. No `apps/admin` type-check regressions.
- **Previous reason (no longer applies):** "no hay versión no-alpha con fix disponible" — was true when this doc was written; is not true anymore. Re-check `npm view mermaid versions` before re-adding an exemption for this package.

### dompurify (moderate) — resolved 2026-08-07 (twice)
- **First pass — GHSA-cmwh-pvxp-8882:** was introduced transitively via `mermaid`; resolving mermaid to `11.16.1` (see above) also cleared this one. `dompurify` stayed pinned at `3.4.12` via `overrides`.
- **Second pass — GHSA-55q2-fjhq-7xh7:** a newer moderate advisory (`IN_PLACE` hook removal XSS) started flagging `dompurify <=3.4.12` after the first pass landed. Bumped the direct `"dompurify"` dependency and the `overrides.dompurify` entry (both in `package.json`) from `3.4.12` to `3.4.13`, then ran `npm install`. No type-check regressions in `peskids` or `admin`.
- **Takeaway:** dompurify needed re-pinning twice in one day as new advisories landed — check `npm view dompurify versions` and re-run `npm audit` before assuming a prior fix still holds.

### undici (high) — resolved (date unknown, confirmed clean 2026-08-07)
- **ID:** GHSA-vmh5-mc38-953g, GHSA-pr7r-676h-xcf6, etc.
- **Status:** `overrides.undici` is pinned at `7.29.0`; `npm audit` no longer flags it. Left the override in place (harmless, keeps `jsdom`'s transitive `undici` pinned to a known-good version).

## How to re-check

```bash
npm audit --audit-level=moderate --omit=dev   # exact command the CI gate runs
npm audit --audit-level=moderate               # includes dev deps, for visibility
```

If either reports vulnerabilities again, check `npm view <pkg> versions` for a newer
patched release before assuming a version bump is impossible — the `mermaid` entry
above was exempted for months based on a "no fix available" assumption that stopped
being true once upstream shipped `11.16.1`.
