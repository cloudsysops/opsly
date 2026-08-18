# OPSLY Universe

Opsly Universe is the canonical memory layer for the Opsly/ICSO story world: its origin, vision, safety rules, characters, worlds, and game-ready canon.

It exists so future agents and humans can reuse one source of truth instead of rebuilding the lore, safety boundaries, or product philosophy from scratch.

It comes from a long-running sequence of systems work, experiments, tenants, and canon already preserved in the repository under `config/universe/` and `data/content/canon/`.

## Canon entry points

- [ORIGIN.md](ORIGIN.md)
- [VISION.md](VISION.md)
- [MANIFESTO.md](MANIFESTO.md)
- [TIMELINE.md](TIMELINE.md)
- [CANON.md](CANON.md)
- [GAME-VISION.md](GAME-VISION.md)
- [GAME-CORE.md](GAME-CORE.md)
- [CHILD-SAFETY-PRINCIPLES.md](CHILD-SAFETY-PRINCIPLES.md)
- [DECISIONS.md](DECISIONS.md)

## Machine-readable foundation

- `config/universe/foundation.json`
- `config/universe/foundation.schema.json`

## Runtime API

The package `@intcloudsysops/universe` exposes the foundation through:

- `getFoundation()`
- `getVision()`
- `getPrinciples()`
- `getHistory()`
- `getNonNegotiables()`
