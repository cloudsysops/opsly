# NPM Audit Exemptions

The `npm audit (moderate+)` CI gate (`.github/workflows/security.yml`) is a
**required check** on every PR. It reads
[`docs/security/npm-audit-exemptions.json`](./npm-audit-exemptions.json) via
`scripts/ci/check-npm-audit-exemptions.mjs` and only fails the build for
moderate+ advisories that are **not** listed there by GHSA ID. This file is
the human-readable summary of that JSON — the JSON file is the source of
truth the CI job actually reads.

Adding an entry requires a reason and PR review — it's for vulnerabilities
with no available fix or where the fix is a disproportionate/breaking
change, not a way to silence an inconvenient failure. A new advisory on an
already-listed package is **not** auto-exempted; its GHSA ID must be added
explicitly.

## Currently exempted

None. The exemption list is empty — `npm audit --audit-level=moderate
--omit=dev` currently reports 0 vulnerabilities without needing any.

## Previously exempted, now resolved (no longer needed)

- `dompurify` (GHSA-cmwh-pvxp-8882) and `undici` — resolved via
  `package.json` `overrides` version bumps.
- `xlsx` (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) — SheetJS stopped
  publishing patched builds to npm, so this was exempted rather than fixed.
  Made moot by PR #888, which removed the `xlsx` dependency from
  `apps/peskids` entirely (Excel import replaced with CSV-only, explicitly
  to avoid the vulnerable parser on untrusted uploads).

All three removed from the exemption list — an exemption for an
already-fixed or already-removed advisory is dead weight, not a real gate.
