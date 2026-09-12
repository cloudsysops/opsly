# Astral Arena — First Steam Game

## Product decision

**Astral Arena: Guardians of the Nexus** is the first Opsly Universe game we will package as a commercial PC title.

The monorepo remains the source of truth:

`@intcloudsysops/universe → @intcloudsysops/game-core → @intcloudsysops/game-web → desktop client`

Content production remains:

`gameplay / canon events → @intcloudsysops/content-studio → PC Gamer render → review → distribution`

Steam is a distribution target, not a second game architecture.

## Release target

### Phase 0 — vertical slice

Ship a local Windows build that proves the complete loop:

1. start the game;
2. meet Arena and Brissa;
3. enter the Crystal Temple;
4. unlock the first Astral powers;
5. rescue people with Orion;
6. discover Aurora;
7. reactivate NX-7;
8. enter Technolia;
9. build the first three structures;
10. complete one safe Cyber Arena defense;
11. earn collectibles;
12. save, quit, reload, and continue.

The vertical slice should be fun before the large roadmap is implemented.

### Phase 1 — Steam demo

The demo expands the slice with:

- Crystal Temple story arc;
- Spark Era of Technolia;
- first three Cyber Arena scenarios;
- first Console Museum missions;
- one Home Lab mission;
- one Raspberry Pi mission;
- content capture hooks for gameplay clips.

Physical-object camera collection is intentionally **after** the first vertical slice unless it becomes essential to the core fun.

### Phase 2 — first commercial release

Add:

- Network Era and Automation Era;
- starship construction;
- Dragon Current arc;
- more Astral affinity abilities;
- deeper Home Lab / Linux / network missions;
- safe containerized Cyber Arena;
- Steam achievements and Cloud Saves;
- controller-first UX;
- Steam Deck validation.

## Core game pillars

### 1. Story adventure

Arena and Brissa are the emotional center.

The player explores Astral Arena, the Crystal Temple, Celestial City, Dragon Sanctuaries, Technolia, and the Great Rift.

### 2. Build Technolia

Strategy progression inspired by classic build-and-advance games without copying their world, assets, factions, or rules.

Loop:

`explore → gather → research → construct → automate → defend → expand`

Buildings map to real systems:

- Portal Gateway → edge / reverse proxy;
- Identity Citadel → auth / authorization;
- API Forge → service contracts;
- Dragon Queue → asynchronous messaging;
- NX Foundry → worker compute;
- Memory Vault → database;
- Crystal Vault → secrets;
- Altair Observatory → logs, metrics, traces;
- Asterion Archive → backup and recovery;
- Resilience Grid → failover and graceful degradation.

### 3. Cyber Arena

All offensive actions are synthetic and confined to disposable game/lab state.

The learning loop is:

`understand architecture → observe simulated failure → choose defense → validate recovery → upgrade Technolia`

The goal is secure design, not real-world intrusion.

### 4. Learning Arcade

Tracks:

- video-game history;
- console architecture;
- Home Lab;
- Raspberry Pi;
- Linux;
- networking;
- electronics;
- local AI;
- software architecture;
- cyber defense;
- space systems.

### 5. Collection

Digital collectibles come from missions, discoveries, builds, dragons, and technical achievements.

Later, user-submitted photos of owned/authorized physical objects can become reviewed collection entries.

## Desktop direction

### Windows first

The first commercial target is **Windows x64**.

Reasons:

- PC Gamer is already Windows-capable compute;
- Steam's largest conventional desktop path is straightforward;
- one executable/installer target keeps the first release tractable;
- macOS/Linux/Steam Deck can follow once the gameplay loop is stable.

### Keep game logic engine-agnostic

Do not move canon or progression logic into a proprietary scene file.

The reusable packages remain authoritative:

- Universe owns identity and canon;
- Game Core owns deterministic rules;
- Game Web owns presentation contracts;
- the desktop shell owns rendering/input/window lifecycle;
- Steam integration is an adapter.

This lets us change rendering technology later without rewriting the story or progression systems.

## Steamworks integration sequence

### First

- create Steamworks partner/app;
- obtain AppID;
- create Windows depot;
- define launch option;
- upload private builds through SteamPipe;
- test using a private beta/playtest branch.

Valve's SteamPipe system supports private beta branches and build rollback, so the first goal is a reproducible Windows depot, not achievements.

### Second

Add optional Steamworks APIs only after the first playable is stable:

- achievements;
- Cloud Saves;
- controller integration;
- rich presence;
- Steam Deck-specific work.

## Secrets and build policy

Never commit:

- Steam account password;
- Steam Guard material;
- publisher secrets;
- signing keys.

Use a dedicated Steam build account with only the permissions required for builds/publishing.

PC Gamer may compile/render/test, but release credentials remain outside the game runtime and outside source control.

## Steam product timeline constraints

For the first titles, Steam currently documents:

- a **$100 USD Steam Direct fee per app**;
- a **30-day waiting period** after paying the app fee before the first release;
- a public **Coming Soon page for at least two weeks** before release;
- store/build review before launch.

Therefore onboarding should begin before the game is finished.

## Store page strategy

Do not publish Coming Soon while art direction is still volatile.

Publish when we have:

- final title treatment;
- stable Arena/Brissa visual identity;
- screenshots from actual gameplay;
- clear description of the core loop;
- a short gameplay trailer;
- a demo/vertical slice close enough to what the page promises.

Content OS should generate candidate clips and promotional assets, but final Steam store assets require human review.

## Definition of the first playable

The build is considered a real first playable only when all are true:

- Windows executable starts without Opsly developer tooling;
- no mandatory VPS connection for the main loop;
- controller + keyboard/mouse navigation works;
- save/load works;
- one story arc is complete;
- Technolia construction is interactive;
- one Cyber Arena scenario is playable end to end;
- inventory/collectibles visibly persist;
- no developer credentials are packaged;
- game can run offline after install for the supported slice;
- Content OS can ingest a gameplay recording and produce a reviewable short.

## Scope discipline

The full universe is intentionally larger than the first Steam game.

Do **not** block the first playable on:

- all seven dragons;
- all four Technolia eras;
- all Home Lab missions;
- real-world object recognition;
- multiplayer;
- live AI generation required for gameplay;
- every Steamworks feature.

Those become expansions once the first loop is fun and stable.
