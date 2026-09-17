# Opsly Games / Games Lab

## Product hierarchy

```text
Opsly Games
├── Astral Arena
├── Astral Remixes
├── Open-Source Originals
├── Arcade Lab
└── Emulator Lab
```

**Opsly Games is the player-facing container. Astral Arena is a first-party title inside Games.**

Canonical staging routes:
- Games home: `/games/`
- Astral Arena: `/games/astral-arena/`
- legacy `/astral-arena/` redirects to the canonical nested route.

The repository path may still use historical `game-astral-arena` names while the migration is in progress; those internal names do not define product hierarchy.


## Purpose

Give Arena and Brissa a safe place to:
- play small mechanics;
- compare what feels fun;
- save ideas;
- clone a mechanic into an Astral concept;
- explore legally usable retro/homebrew content.

## Three lanes

### Retro Originals

Opsly-owned browser prototypes:
- Star Paddle;
- Crystal Breaker;
- Nexus Snake;
- Meteor Dodge.

These are mechanic studies. They use original code/names/visuals and are intentionally
simple enough to clone.

Browser action **Clonar mecánica** stores only the pattern/idea. It does not copy any
third-party game asset.

CLI:

```bash
node scripts/games/clone-retro-mechanic.mjs \
  --source star-paddle \
  --slug aurora-orbit \
  --title "Aurora Orbit"
```

### Emulator Lab

Frontend: EmulatorJS.

V1 allowlist:
- NES → FCEUmm → GPLv2;
- Game Boy → Gambatte → GPLv2;
- GBA → mGBA → MPLv2;
- Atari 2600 → Stella 2014 → GPLv2.

ROM files are opened through a browser object URL and are not uploaded/stored by
Opsly in V1.

## License gate

Machine-readable policy:

`config/games/retro-lab-license-policy.json`

Validation:

```bash
node scripts/games/validate-retro-lab-licenses.mjs
```

Rules:
- default deny;
- unknown license = blocked;
- non-commercial core = blocked for this product;
- emulator license and game-content rights are separate;
- no commercial ROM packs;
- no proprietary BIOS without rights;
- no copied sprites/music/names/levels for cloned mechanics.


### Clone Lab

Clone Lab studies permissively licensed open-source game code and converts useful mechanics into original Astral experiments.

Pinned upstream:
- Godot demo repository commit `a3b5c113112f77291d5f3d1360f33a882fdc52f7`;
- Meteor Dodge+ ← `2d/dodge_the_creeps`;
- Michelle Butterfly Quest ← `2d/platformer`;
- Aurora Sky Islands ← `3d/platformer`;
- Sisters Crystal Arena ← `networking/multiplayer_bomber`.

Rules:
- upstream commit must be pinned;
- code license must pass machine validation;
- upstream assets are reviewed separately from code;
- graduating products require original characters, visual identity, level expression and audio unless redistribution rights are explicitly preserved;
- commercial game IP is never a Clone Lab source.

Validation:

```bash
node scripts/games/validate-clone-lab-sources.mjs
```
