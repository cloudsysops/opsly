---
title: "lib/game-core Governance"
description: "Game state contracts for Opsly Universe play"
---

# lib/game-core Governance

- **Owner:** operations / game systems
- **Consumes:** `@intcloudsysops/universe` (characters, worlds, safety principles)
- **Must not depend on:** content-studio, YouTube, Peskids apps, Docker sockets
- **Must not own:** global Universe canon

## Boundary

Universe owns who/what exists. Game owns player sessions, missions, inventory,
and observation events. Growth may later aggregate those events. Game never
emits diagnoses (IQ, personality labels, career destiny).

## Runtime topology

- Authoritative game state belongs on the Opsly control plane, not on PC Gamer.
- PC Gamer is optional GPU/compute. It is replaceable.
- `game-runtime` (future container) is the product service.
- `game-engineer` is development-only and must not ship in production compose.

## Versioning

`GAME_SCHEMA_VERSION` is independent of the npm patch. Breaking session or
event fields requires a MAJOR schema bump and a migration note.
