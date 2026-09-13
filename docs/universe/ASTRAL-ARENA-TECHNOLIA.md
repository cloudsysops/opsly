# Astral Arena + Technolia

## Canonical direction

Astral Arena is a game and content domain inside the Opsly monorepo. It reuses the canonical Opsly owners instead of creating a parallel platform.

```
@intcloudsysops/universe
        |
        +-- Astral Arena canon
        +-- Technolia world
        |
        v
@intcloudsysops/game-core
        |
        +-- story missions
        +-- elemental affinity
        +-- defensive systems lab
        +-- Technolia strategy progression
        |
        +------------------+
        |                  |
        v                  v
   game runtime       Content OS v2
                           |
                           v
                    PC gamer execution
                           |
                           v
                  review -> Moon approval
```

## Canon owner

Character identity, visual DNA, worlds, relationships and lore live under `lib/universe`.

Astral Arena includes Arena, Brissa, Orion the German Shepherd, Aurora the Astral Unicorn, NX-7, Altair, Umbra and the Astral Dragons.

The dog uses runtime id `orion-shepherd` so it does not collide with the existing Opsly character named Orion.

## Game layers

### Story

`lib/game-core/src/astral-arena.ts`

Season 1 contains the narrative mission chain from the sisters' awakening through the restoration of Umbra's final memory thread.

### Elemental affinity

`lib/game-core/src/astral-affinity.ts`

A supplied birth date can be used transiently to derive a fictional starting affinity:

```
date -> zodiac sign -> FIRE | EARTH | AIR | WATER -> techniques
```

It is a customization mechanic, not a scientific or personality claim. Prefer storing only the derived affinity.

Technology specialties:

- FIRE: compute, energy and propulsion
- EARTH: storage, durability and recovery
- AIR: networking, routing and observability
- WATER: data flow, queues and adaptation

### Defensive systems lab

`lib/game-core/src/cyber-arena.ts`

The lab uses disposable fictional system state to teach trust boundaries, identity, validation, queues, secrets, observability, recovery and software supply-chain hygiene. Each scenario pairs a failure with the matching defensive architecture.

### Technolia

`lib/game-core/src/technolia.ts`

Technolia is the strategy and construction layer.

Core loop:

```
EXPLORE
  -> COLLECT
  -> BUILD
  -> RESEARCH
  -> TEST THE SYSTEM
  -> DEFEND
  -> UPGRADE MACHINES
  -> UPGRADE STARSHIP
  -> OPEN MAP
  -> NEW ERA
```

Resources:

- Astral Energy
- Nexus Crystal
- Knowledge
- Data
- Alloy
- Trust

Eras:

1. Spark Era
2. Network Era
3. Automation Era
4. Stellar Era

## Buildings as software architecture

| Technolia structure | Architecture concept |
|---|---|
| Nexus Core | control plane |
| Portal Gateway | edge routing |
| Memory Vault | durable data |
| Identity Citadel | identity and permissions |
| API Forge | validated service contracts |
| Dragon Queue | asynchronous events and backpressure |
| NX Foundry | worker pool and compute |
| Altair Observatory | logs, metrics and traces |
| Asterion Archive | backup and recovery |
| Systems Lab | isolated defensive testing |
| Starship Yard | platform composition |
| Resilience Grid | failover and graceful degradation |
| Distributed Stellar Core | regional distributed architecture |

The player should see the software architecture emerge physically on the map.

## Machines

Initial buildable machines:

- Zephyr Scout: networking and routing
- Terra Builder: infrastructure and durability
- Pyra Reactor Drone: compute and energy
- Tide Repair Swarm: flow and recovery
- NX Sentinel: observability

Elemental affinity can favor a route without locking the player into it.

## Starship

The starship represents a composed system and grows across the campaign.

Initial modules:

- Asterion Navigation Core
- Identity Shield
- NX Event Engine
- Brissa Memory Core
- Wing Drive

A module should require the systems it depends on. The ship is built, not simply awarded.

## Map

Technolia expands from Crystal Landing into:

- Echo Ridge
- Data Canyon
- Dragon Docks
- Shadow Boundary
- Starship Basin
- Stellar Frontier

Map exploration reveals resources, architecture, Dragon Currents, new missions and story portals.

## Content production

Astral Arena uses Content OS v2.

- channel preset: `config/content-channels/astral-arena.json`
- universe bridge: `lib/content-studio/src/content-engine/universe-bridge.ts`
- original content adapter: `lib/content-studio/src/content-engine/astral-arena.ts`
- gameplay media: existing canonical Content OS ingest/render/review path

The PC gamer is execution capacity for local models, rendering, media processing and gameplay capture. Canon, approval and publishing authority remain on the Opsly control plane.

## Content from gameplay

A single game event can become several content artifacts.

Example:

```
build Identity Citadel
   +-- gameplay clip
   +-- architecture short
   +-- Brissa + NX-7 story scene
   +-- visual system diagram
   +-- follow-up systems-lab episode
```

The product thesis is:

> Build a world, test it safely, understand how it behaves, improve the architecture, and use what you learned to explore farther.
