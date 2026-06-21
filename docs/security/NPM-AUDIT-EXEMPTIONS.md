# NPM Audit Exemptions

This file documents known vulnerabilities that are currently exempted from blocking CI, typically because they are in devDependencies or have no viable fix in the current environment.

## Currently Exempted (Resolved in this PR)

- hono: Resolved by upgrading to 4.12.26
- tmp: Resolved by upgrading to 0.2.7
- undici: Resolved by upgrading to 8.5.0
- dompurify: Resolved by upgrading to 3.4.11

## Known Baseline (Dev Dependencies)

- esbuild (used in dev/test)
- vitest (used in dev/test)
