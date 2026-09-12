# Astral Arena — Steam MVP

Status: canonical launch target for the first commercial Opsly Universe game.

Working title:

**Astral Arena: Guardians of the Nexus**

Spanish marketing subtitle may use **Guardianes del Nexo**, but the Steam product identity should remain one canonical App.

## Product decision

The first Steam release is not the entire Astral Arena vision.

It is a focused, replayable vertical slice built from the systems already owned by the Opsly monorepo:

- Universe canon
- Game Core
- Astral Arena story missions
- Birth Affinity
- Technolia construction
- defensive systems lab
- modular starship progression
- Content OS for trailers, clips, screenshots and launch media

## Steam launch sequence

1. Steamworks onboarding and App creation.
2. Pay the Steam Direct app fee.
3. Create the store page and publish Coming Soon as early as possible.
4. Build a Windows desktop executable.
5. Upload builds through SteamPipe to a private branch.
6. Open a Steam Playtest for invited/external testers.
7. Publish a public demo once the first loop is polished.
8. Grow wishlists and collect playtest telemetry.
9. Decide between full release and Early Access only after the current build is strong enough to sell on its present merits.

Steam App IDs and Depot IDs are external identifiers. They must be stored in configuration only after Valve assigns them. No Steam credentials belong in git.

## First playable promise

A new player should be able to:

1. meet Arena and Brissa;
2. choose/create an Explorer;
3. derive a fictional elemental affinity;
4. enter Technolia;
5. reveal the first map region;
6. gather resources;
7. build a Nexus Core;
8. construct gateway/data infrastructure;
9. face a safe systems-defense scenario;
10. build at least one helper machine;
11. meet NX-7 and Asterion;
12. unlock the first starship module;
13. finish with a visible route to the next sector.

The player should understand one central idea without reading architecture documentation:

> the world becomes stronger because the systems they build are connected correctly.

## Demo scope

Target: **60–90 minutes** for a first full playthrough.

### Story characters in the demo

- Arena
- Brissa
- Orion the German Shepherd
- Aurora
- NX-7
- Altair
- Asterion

Umbra should appear as the threat behind the first arc, but the full resolution remains outside the demo.

### Map

Ship only a small part of Technolia:

- Crystal Landing
- Echo Ridge
- Data Canyon
- first entrance to Shadow Boundary

The rest remains visible as locked map silhouettes to create progression desire.

### Construction

Demo buildings:

- Nexus Core
- Portal Gateway
- Memory Vault
- Identity Citadel
- API Forge
- Dragon Queue
- Altair Observatory

### Machines

Demo machines:

- Zephyr Scout
- Terra Builder
- NX Sentinel

Elemental-affinity machines can appear as previews even if not all are unlockable in the first demo.

### Defensive systems scenarios

Demo scenarios:

- Bot pressure at the Portal Gateway
- Identity protection at the Identity Citadel
- Queue overload at Dragon Queue

The game uses fictional disposable systems. The objective is learning how to build resilient systems, not interacting with real external targets.

### Starship

The demo ends by constructing the first module:

**Asterion Navigation Core**

The full game expands the ship with Identity Shield, NX Event Engine, Brissa Memory Core and Wing Drive.

## Desktop architecture

The existing browser slice is not itself the Steam product.

Canonical dependency direction remains:

```
@intcloudsysops/universe
        ↓
@intcloudsysops/game-core
        ↓
@intcloudsysops/game-web
        ↓
Astral Arena desktop renderer
        ↓
Windows executable
        ↓
SteamPipe
```

For the first Steam product, the recommended path is a dedicated desktop shell around a local React/TypeScript game client, reusing Game Core and Universe directly.

### Why

- preserves the existing TypeScript canon and gameplay logic;
- allows offline/local-first play;
- avoids making the Steam game depend on the ICSO SaaS application;
- lets us add a dedicated rendering layer without forking the game rules;
- leaves Steamworks integration optional rather than blocking the first build.

The Steam executable must not require Opsly production credentials.

## Platform target

MVP:

- Windows x64
- keyboard + mouse
- 1920×1080 baseline
- windowed + fullscreen
- local save
- offline gameplay after install

Post-MVP:

- controller-first navigation
- Steam Deck validation
- Linux/SteamOS build if useful
- macOS only after the Windows pipeline is stable

## Save model

The Steam build must use a versioned local save independent from browser localStorage.

Suggested path abstraction:

`AstralArena/saves/profile-v1.json`

The save contains:

- Explorer identity
- derived elemental affinity
- Technolia progression
- discovered regions
- built structures
- machines
- starship modules
- completed story missions
- settings

Do not persist a child's raw birth date merely to preserve affinity. Persist the derived sign/element profile.

Steam Auto-Cloud can later synchronize this local save without forcing deep Steam API integration.

## Steam-specific features

### Required for first release

- executable launch configuration
- Windows depot
- private testing branch
- crash-safe local save
- clean uninstall/reinstall behavior
- store assets
- screenshots from actual gameplay
- content survey
- privacy disclosure if telemetry is enabled

### Recommended after the first playable build

- Steam Cloud
- achievements
- Steam Input
- rich presence
- Deck testing

Steamworks API integration is useful but is not a prerequisite for shipping the first build.

## AI policy for Steam v1

The shipped game should **not use live generative AI** in the first Steam version.

AI can assist the development pipeline with:

- concept exploration
- pre-generated imagery
- voice drafts
- localization drafts
- trailer/storyboard generation
- content-production support

Any AI-assisted content that actually ships to players must be tracked for the Steam Content Survey and rights review.

Maintain a provenance manifest for shipped assets:

- asset id
- source/creator
- model/tool if AI-assisted
- human review status
- rights/license status
- final file hash

No generated asset enters the Steam build until provenance and rights are clear.

## Store positioning

Core pitch:

> Build a living technology civilization with two sisters, magical guardians and Astral Dragons. Explore the map, design resilient systems, defend Technolia, and assemble a starship to reconnect the universe.

Genre positioning:

- strategy
- base building
- adventure
- educational systems thinking
- family-friendly science fantasy

Do not market it as a clone of another strategy game.

## Steam store art

The Content OS should produce candidate art, but final Steam capsules must follow Steam's exact current templates and be human-reviewed.

Required launch-art families include:

- Header Capsule
- Small Capsule
- Main Capsule
- Vertical Capsule
- screenshots from actual gameplay
- Library Capsule
- Library Hero
- Library Logo
- Library Header
- icons

Concept art and generated cinematic art may support the page, but screenshots must show actual gameplay.

## Content engine integration

Gameplay events should feed the existing Astral Arena Content OS channel.

Examples:

```
build nexus-core
  -> gameplay highlight
  -> short: "what is a control plane?"
  -> Arena/Brissa reaction clip
  -> Steam community post candidate

survive bot-pressure scenario
  -> gameplay clip
  -> defensive architecture short
  -> Technolia before/after image
  -> trailer beat

unlock asterion-navigation-core
  -> cinematic reveal
  -> store trailer beat
  -> wishlist CTA clip
```

The PC gamer remains rendering/compute capacity. It does not become the Steam source of truth.

## Store-page timing

The launch plan must account for Steam's onboarding and review windows.

Do not announce a fixed release day until:

- the desktop build exists;
- a SteamPipe private build installs correctly;
- the save loop is stable;
- the store page is approved;
- Coming Soon timing requirements are satisfied;
- external playtest feedback supports the release date.

## Definition of Steam-ready vertical slice

A Steam candidate is ready for external Playtest only when:

- the game starts from Steam;
- no web server is required;
- no production credentials are embedded;
- first-run flow works on a clean Windows machine;
- save/restore works;
- the 60–90 minute demo loop can be completed;
- all required story/canon assets resolve;
- frame pacing is acceptable on a midrange Windows PC;
- UI remains usable at 1080p;
- all external links and telemetry are optional and disclosed;
- there is a clean exit path;
- build can be reproduced from the monorepo;
- gameplay capture can be ingested by Content OS.

## Next implementation slice

Create a dedicated desktop client with:

1. game boot screen;
2. Explorer creation;
3. Birth Affinity reveal;
4. Technolia map;
5. build-placement loop;
6. resource HUD;
7. first three structures;
8. first systems-defense encounter;
9. local save;
10. Windows packaging.

That executable becomes the first Steam Playtest build.
