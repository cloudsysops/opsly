# mission-control Archive

Archived on 2026-04-24 per ADR-031.

## Why archived

- Scope and runtime ownership were not finalized.
- Keeping it in active top-level apps created ambiguity.

## How to revive

1. Define concrete product/ops scope and owner.
2. Move back to active `apps/` namespace.
3. Re-enable CI checks and deployment path.
4. Update ADR and architecture docs with explicit role.
