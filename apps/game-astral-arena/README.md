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

Current playable placeholder:
- walk through the Crystal Temple;
- mouse/right-stick camera;
- jump;
- interact with Arena and Brissa crystals;
- mission text comes from the Opsly content pack.

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
