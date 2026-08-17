---
status: draft
owner: product
last_review: 2026-08-16
---

# Game Core

`@intcloudsysops/game-core` is the bounded game module. It consumes
`@intcloudsysops/universe`. It does not own characters, worlds, or visual DNA.

## Dependency direction

Foundation → Universe → Game Core → (later) game-runtime container

PC Gamer is compute only. Authoritative session state must not live only there.
`game-engineer` is a future **dev** profile, not production.

## First Portal

Aligns with `GAME-VISION.md`:

1. Explorer wakes in Universe world `nexus`.
2. THE TRAVELER is the threshold.
3. NØVA guides a broken workshop puzzle: INPUT → PROCESS → OUTPUT.
4. A knowledge fragment and a map fragment are earned.
5. Events are observations (`mission.retried`, `mission.completed`), not diagnoses.

## Not in this package

- Phaser / Three.js / Godot client
- Multiplayer chat
- Docker `game-runtime` / `game-engineer`
- Cyber range offensive tooling
- Parent UI (contracts only via events)
