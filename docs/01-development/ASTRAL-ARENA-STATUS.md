# Astral Arena — Current Product Status

Last verified: **2026-09-12**

Branch: `feat/astral-arena-universe`  
PR: **#1300**  
Fast preview branch: `preview/astral-arena`  
Product: **Astral Arena: Guardians of the Nexus**

This is the canonical implementation-status snapshot. Design documents describe
architecture; GitHub Actions and issues remain the execution source of truth.

## What is real today

### Game runtime

Implemented in Godot 4.7.2:

- 3D Crystal Temple path;
- 2D top-down world;
- Hybrid Battle Lab;
- live 2D ↔ 3D presentation switching without recreating battle state;
- family quick play;
- single-player;
- Sisters local co-op;
- Arena / Brissa guardian selection;
- selectable companion;
- companion nickname;
- player alias;
- aura customization;
- touch-friendly battle buttons;
- battle restart and menu controls.

Shared battle state preserves:

- round;
- health;
- energy;
- defense/control effects;
- selected party;
- winner state.

## Companion catalog

Current reusable families:

| Family | Current example |
|---|---|
| REAL_PET | Orion |
| FUTURIST_AI | NX-7 |
| PREHISTORIC | Echo Raptor |
| ASTRAL_DRAGON | Asterion |
| FANTASY | Aurora |
| MYTHIC_LEGEND | Pegasus Arc |
| CELESTIAL | Seraph Nova |

The companion model is data-driven and reusable by future game products.

## Distribution surfaces

### Browser staging

Target:

`https://peskids-staging.op-sly.com/astral-arena/`

Verified successful pipeline:
- workflow: **Astral Arena Web Preview**
- successful run: **#49**
- run id: `34724858943`
- source SHA: `87b8ba3bc8fc4797a2a1c511630fa8c31916306f`

The pipeline successfully completed:

`Godot Web export → artifact → GHCR image → staging container → Traefik route → HTTPS smoke`

A newer preview run may supersede this build; use GitHub Actions for live deployment
status.

### Windows x64

First real Windows artifact: **SUCCESS**

- workflow: **Astral Arena Windows Artifact**
- run: **#1**
- run id: `34725562503`
- source SHA: `10cc0c54c81752f150208f7c6c77fe998f2ec978`
- artifact: `astral-arena-windows-10cc0c54c81752f150208f7c6c77fe998f2ec978`
- artifact size: ~38.96 MB
- artifact digest:
  `sha256:4146a33a8b7b0e6d27ed49d651b83fb6e7869e6d37134e2884b23bc59603c63d`

The artifact contract is:

```
dist/astral-arena/
├── AstralArena.exe
├── build-manifest.json
└── SHA256SUMS.txt
```

This proves the Windows export pipeline. It does **not** yet prove installation and
play through the Steam client.

## Steam readiness

Implemented:

- Windows export;
- checksummed Windows artifact;
- SteamPipe VDF templates;
- SteamPipe package renderer;
- fail-closed AppID/DepotID injection;
- Steam adapter boundary;
- store asset manifest;
- protected/human-approved release model.

External/operator inputs still required:

- Steamworks partner onboarding;
- Steam Direct fee;
- legal/tax/bank verification;
- real AppID;
- Windows DepotID;
- Steam build account / Steam Guard;
- final store copy/pricing/disclosures;
- Valve review.

No Steam credential or numeric AppID/DepotID is committed.

## CI / runner model

### GitHub-hosted

Use for:
- validation;
- security;
- Web image publication;
- lightweight integration work.

### MacBook self-hosted

Prepared but requires physical registration of the Mac runner.

Labels:

`self-hosted, macOS, astral-fast, godot, mac-build`

Trusted triggers only:
- `preview/astral-arena` pushes;
- manual workflow dispatch.

It must not run arbitrary public pull-request code.

### PC gamer

Target for:
- Windows/Steam validation;
- GPU-heavy media;
- Content OS rendering;
- optional additional self-hosted runner capacity.

It remains replaceable compute and never becomes canon or game-state authority.

## Source-of-truth boundaries

```
Opsly Universe  ── canon
      │
Game Core       ── reusable deterministic rules
      │
Content Pack    ── versioned bridge
      │
Godot           ── presentation/input/local client
      │
├─ Web          ── preview/testing adapter
├─ Windows      ── desktop artifact
└─ Steam        ── distribution/runtime adapter
```

Steam, Web and Windows never own game canon.

## Current priority order

1. Family-playtest the staging build.
2. Install/launch the Windows artifact outside Godot Editor.
3. Register Mac runner to add trusted build capacity.
4. Finish save/load and first end-to-end story loop.
5. Onboard Steamworks and obtain AppID/DepotID.
6. Generate private SteamPipe package.
7. Install from Steam private/playtest branch.
8. Produce real gameplay screenshots/trailer from Content OS.
9. Submit store page/build for Valve review only after feature claims are verified.


## Transmedia franchise layer

Implemented in Content Studio:

- `ContentProjectEnvelope.transmedia`;
- generic `bindTransmediaContext()`;
- Astral Arena Season 1 manifest;
- mission ↔ story event ↔ episode mapping;
- gameplay build SHA/capture-marker linkage;
- Moon Creator Studio **Franchise** tab;
- CI continuity validation.

Canonical machine-readable map:

`config/games/astral-arena-transmedia.json`

Architecture:

`docs/01-development/ASTRAL-ARENA-TRANSMEDIA.md`

This does not create a second canon. Universe remains canonical; Content Studio
owns transformation/production/distribution.


## Franchise Control Board

Moon Creator Studio now includes a **Franchise** control board backed by the
transmedia manifest and the real Content Studio series.

It shows:
- Season 1;
- chapter status;
- 16 story-event/mission slots;
- episode IDs;
- editorial production state;
- runtime ContentProject status when present;
- target surfaces.

The first four episodes exist as real Content Studio storyboards under:

`data/content/series/astral-arena/episodes/`

This series references Universe character IDs via `character_source: universe`;
canonical character definitions are not duplicated into `data/content/characters`.
