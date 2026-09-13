# Universe canon migration — 1.1

Date: 2026-09-12

## Why the minor bump

Canon 1.1 adds immutable identity traits for the Astral Arena cast, including
Arena, Brissa, Orion, Aurora, NX-7, Altair, Umbra and the first Astral Dragons.

Per `lib/universe/GOVERNANCE.md`, adding immutable traits requires a MINOR canon
version bump.

## Consumer impact

Consumers that cache composed Universe context or generated prompts by
`canonVersion` must treat `1.1` as a new canon snapshot.

No existing character identity is renamed or removed by this migration.
