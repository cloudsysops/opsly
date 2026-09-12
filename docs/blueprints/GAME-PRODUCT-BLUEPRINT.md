# Opsly Game Product Blueprint

## Decision

For the reusable PC/Steam game line, Opsly uses:

- **Godot 4.7.2 stable** as the initial native game client/rendering engine.
- **Opsly Universe** as canon source.
- **Game Core** as reusable domain/rule owner and content-pack compiler.
- **Content Studio / Content OS** for gameplay-derived media.
- **SteamPipe** as a distribution adapter.

We do not fork or clone the Godot engine source for normal game development.

The only external repository worth cloning as a **reference library** is the official
`godotengine/godot-demo-projects`, pinned to the matching stable Godot branch.
Copy lessons/patterns selectively; never make that repository our product base.

## Why Godot

Astral Arena needs:
- native Windows build;
- 3D adventure;
- RTS/building scenes;
- controllers;
- local/offline gameplay;
- future Linux/Steam Deck support;
- reusable scenes and plugins.

Godot provides a native 2D/3D engine and Windows export path without requiring us
to maintain an engine fork.

Phaser remains useful for browser-first 2D games, but it is not the default
blueprint for the Astral Arena family because Phaser 4 is intentionally a 2D engine.

## Architecture

```
                OPSLY MONOREPO
                     │
        ┌────────────┴────────────┐
        │                         │
 @intcloudsysops/universe   @intcloudsysops/game-core
        │                         │
        └───────────┬─────────────┘
                    │
             Game Content Pack
             (versioned JSON)
                    │
        ┌───────────▼────────────┐
        │  Godot Game Blueprint │
        │                        │
        │ input / controller     │
        │ save / settings        │
        │ mission interpreter    │
        │ inventory              │
        │ UI / scenes            │
        │ gameplay capture       │
        │ Steam adapter          │
        └───────┬─────────┬──────┘
                │         │
             Steam      Content OS
                          │
                       PC Gamer
                     render / media
```

## Reusable vs game-specific

### Reusable blueprint modules

- input mapping + controller abstraction;
- settings;
- accessibility;
- save/load versioning;
- localization;
- scene router;
- generic mission interpreter;
- inventory / collectibles;
- generic tech-tree interpreter;
- generic map/unlock interpreter;
- content-pack loader;
- gameplay capture hooks;
- Steam adapter;
- achievements adapter;
- Cloud Save adapter;
- telemetry;
- crash/log packaging;
- CI export and smoke tests.

### Game-specific modules

- characters;
- story;
- worlds;
- 3D models;
- animations;
- sound/music;
- mission data;
- tech-tree content/balance;
- branded UI;
- Steam AppID/store assets.

## Content pack contract

Every game receives a generated versioned JSON pack. The Godot client does not
become the source of truth for canon.

Example:

```json
{
  "schema_version": 1,
  "game_slug": "astral-arena",
  "characters": [],
  "worlds": [],
  "missions": [],
  "tech_trees": [],
  "collectibles": [],
  "balance": {}
}
```

This makes the engine replaceable and keeps future games compatible with the
same Opsly authoring/control plane.

## Blueprint command

```bash
./scripts/provisioning/clone-game-launch.sh \
  --blueprint godot-steam \
  --slug astral-arena \
  --title "Astral Arena: Guardians of the Nexus" \
  --dry-run
```

For the next game:

```bash
./scripts/provisioning/clone-game-launch.sh \
  --blueprint godot-steam \
  --slug guardian-lab \
  --title "Guardian Lab"
```

The second command must produce a clean product without Arena/Brissa lore.

## External references

### Official Godot demos

Use the official Godot demo repository for examples of:
- 3D movement;
- navigation;
- GUI;
- audio;
- loading;
- networking;
- shaders.

Pin examples to the same stable Godot line as the game.

### Steam integration

Do not depend on a community Steam plugin for the first vertical slice.
SteamPipe delivery can ship the executable without runtime Steam API usage.

Runtime features such as achievements, Cloud Saves and rich presence use an
adapter introduced after the standalone first playable works.

The original GodotSteam GitHub repository moved away from GitHub in 2026, so
if we later adopt its community plugin, pin a version/source explicitly rather
than treating the old archived GitHub repository as a moving dependency.

## Blueprint graduation criteria

A shared feature enters the blueprint only after:
1. Astral Arena uses it successfully;
2. a second test game can use it without Astral-specific assumptions;
3. the feature has a stable contract and smoke test.

This prevents the blueprint from becoming a giant speculative framework.
