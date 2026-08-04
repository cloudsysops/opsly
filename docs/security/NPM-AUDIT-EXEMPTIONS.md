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

### xlsx (high) — GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9
- **Reason:** Prototype Pollution + ReDoS when parsing crafted XLSX files.
  SheetJS stopped publishing patched builds to npm (moved to
  cdn.sheetjs.com); no npm-registry fix exists.
- **Exposure:** Confined to `apps/peskids/lib/import/spreadsheet.ts`,
  dynamically imported client-side only, parsing files the tenant's own
  authenticated admin uploads in their browser — not exposed to
  untrusted/public input or server-side execution.
- **Status:** Acknowledged. Revisit if SheetJS resumes npm publishing, or
  replace with a maintained alternative (e.g. `exceljs`) if usage grows
  beyond this single admin-import path.

## Previously exempted, now resolved (no longer needed)

`dompurify` (GHSA-cmwh-pvxp-8882) and `undici` were previously listed here
as acknowledged risks. Both were resolved via `package.json` `overrides`
version bumps and no longer appear in `npm audit` — removed from the
exemption list since an exemption for an already-fixed advisory is dead
weight, not a real gate.
