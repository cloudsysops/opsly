# Astral Games Lab

## Purpose

Give Arena and Brissa a safe place to:
- play small mechanics;
- compare what feels fun;
- save ideas;
- clone a mechanic into an Astral concept;
- explore legally usable retro/homebrew content.

## Two lanes

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
