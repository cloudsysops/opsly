# Astral Arena — Godot vertical slice

This directory is the first real consumer of the reusable Opsly `godot-steam` game blueprint.

## Run locally

1. Install Godot 4.7.2.
2. From the monorepo, regenerate canonical game data:

   ```bash
   npm run game:astral:content-pack
   ```

3. Open:

   ```
   apps/game-astral-arena/project.godot
   ```

4. Press **F6/F5**.

Current playable surfaces:
- Family Quick Play;
- single-player;
- Sisters local co-op;
- selectable companion and aura;
- Hybrid Battle Lab with live 2D ↔ 3D switching;
- 2D top-down world;
- 3D Crystal Temple;
- mission/content data from the Opsly content pack.

## Controls

- WASD / left stick — move
- mouse / right stick — look
- Space — jump
- E — interact
- Esc — release/capture mouse

## Boundary

Do not hand-author canon in Godot. Canon and reusable rules remain in:
- `@intcloudsysops/universe`
- `@intcloudsysops/game-core`

Regenerate `generated/game-content.pack.json` after changing the canonical first-playable content.


## Family quick play

The fastest playable path is:

```
JUGAR AHORA
→ choose 1 Player or Sisters Co-op
→ choose Arena / Brissa when applicable
→ choose an Astral companion
→ choose aura
→ start Hybrid Battle
```

Current companion families:
- real pet — Orion;
- futurist AI — NX-7;
- prehistoric — Echo Raptor;
- Astral Dragon — Asterion;
- fantasy — Aurora;
- myth/legend — Pegasus Arc;
- celestial — Seraph Nova.

In **Sisters Co-op**, Arena, Brissa and the selected companion each receive action
buttons and play cooperatively against the Shadow simulation.

The battle can switch between 2D and 3D at any moment without resetting battle state.
Use either:
- the on-screen **Cambiar 2D ↔ 3D** button;
- `TAB` on a keyboard.

### One-command local demo

With Godot 4.7.2 installed:

```bash
chmod +x scripts/games/play-astral-arena.sh
./scripts/games/play-astral-arena.sh
```

### PR staging preview

The Web Preview workflow is configured to publish same-repository PR builds to:

`https://peskids-staging.op-sly.com/astral-arena/`

This is an isolated Traefik path and does not replace the Peskids staging application.


## Windows / Steam packaging

Build contract:

```
dist/astral-arena/
├── AstralArena.exe
├── SHA256SUMS.txt
└── build-manifest.json
```

Prepare SteamPipe only after real Steam IDs exist:

```bash
STEAM_APP_ID=... \
STEAM_DEPOT_WINDOWS_ID=... \
node scripts/games/render-astral-steampipe.mjs
```

Steam remains an adapter. The standalone Windows build must continue to run without
Steam installed or Steamworks initialized.


## Verified CI status — 2026-09-12

### Web

The complete Web staging pipeline has succeeded at least once:

- run `34724858943`;
- staging path `https://peskids-staging.op-sly.com/astral-arena/`.

### Windows

First successful Windows x64 artifact:

- run `34725562503`;
- artifact `astral-arena-windows-10cc0c54c81752f150208f7c6c77fe998f2ec978`;
- digest `sha256:4146a33a8b7b0e6d27ed49d651b83fb6e7869e6d37134e2884b23bc59603c63d`.

This proves export/package generation. A Windows runtime playtest is still required.

## Documentation index

- product status: `docs/01-development/ASTRAL-ARENA-STATUS.md`;
- execution map: `docs/01-development/ASTRAL-ARENA-AGENT-EXECUTION-MAP.md`;
- CI fast lane: `docs/01-development/ASTRAL-ARENA-CI-FAST-LANE.md`;
- Mac runner: `docs/01-development/ASTRAL-MAC-RUNNER.md`;
- legacy reuse: `docs/01-development/ASTRAL-ARENA-LEGACY-REUSE-MATRIX.md`;
- Steam readiness: `docs/01-development/ASTRAL-ARENA-STEAM-RELEASE.md`;
- reusable game blueprint: `docs/blueprints/GAME-PRODUCT-BLUEPRINT.md`.
