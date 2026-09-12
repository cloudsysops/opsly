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
