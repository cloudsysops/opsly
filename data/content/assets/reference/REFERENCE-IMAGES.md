# Reference Images — Opsly Universe

Concept art provided by the team as visual reference for how the actual
generated video/image assets should look. These are **mood/composition
references for generation agents to match**, not final production assets —
treat them as the visual target when prompting Higgsfield/image-gen tools,
alongside each character's `generation_prompt`/`negative_prompt` in
[`../../characters/`](../../characters/).

All files resized to max 1600px long edge, JPEG q82, to keep the repo lean
(originals were 2-4.5MB PNGs; these are ~350-450KB each).

## Catalog

### `s01-parallel-world-overlook.jpg`
The Traveler and NØVA standing on a golden circular platform at the edge of
a vast floating city at sunset — establishing wide shot of the Parallel
World. **Maps to:** series key art / general Parallel World establishing
shots, usable across multiple episodes (03, 05, 08) wherever a wide reveal
of the world is needed. Confirms silhouette/proportions for both
characters at full-body scale relative to environment.

### `e06-peskids-pool-world.jpg`
The Traveler and NØVA arriving at a glowing blue-crystal pool complex with
children and small companion robots swimming. **Maps to:** Episode 6
"Peskids" — this is the closest visual match in the whole reference set to
that episode's core scene (Wavo's world). Note: the small robots swimming
in this image are generic/unbranded — when generating the actual episode,
swap any close-up companion robot for Wavo specifically (see
`../../characters/wavo.json` for Wavo's locked design; don't reuse this
image's generic robot design as Wavo's final look).

### `e08-mission-control-globe.jpg`
The Traveler and NØVA before a massive holographic globe covered in
connected data nodes, inside an ornate control-room interior. **Maps to:**
Episode 8 "Mission Control" — near-literal match for the Moon interface
described in `../../canon/ORIGIN-SAGA.md` Act VIII. Strong reference for
framing (both characters small against a much larger interface) and for
Moon's visual language (connected nodes, floating panels, small world-
thumbnails).

### `e10-workshop-repair-scene.jpg`
The Traveler and NØVA close together at a workbench, hands-on, building or
repairing something small and glowing, in a dense mechanical workshop with
a Parallel World cityscape visible through a round window. **Maps to:**
Episode 10 "The Machine" (repairing the borrowed PC) — also a strong
generic reference for Episode 3 "The First System" (early hands-on
building). Good reference for intimate two-shot framing and for how tools/
mechanical clutter should read in The Traveler's workshop space.

### `series-key-art-bridge-path.jpg`
The Traveler and NØVA walking a long glowing bridge toward distant
spires, hexagram symbols floating along the path, faint Spanish text
overlay ("El comienzo de la leyenda" — "The beginning of the legend").
**Maps to:** primary series key art / trailer thumbnail candidate — the
"path" framing fits the show's title and theme better than any single
episode. Secondary reference for Episode 13 "The Map" (the walking-forward
finale beat) and for the recurring hexagram/geometry motif from
`../../canon/SYMBOLS.md`.

### `parallel-world-atlas-map.jpg`
Labeled wide map of the Parallel World ("The Atlas of Parallel Universes")
showing named regions (The Nexus, Crystal Peaks, The Astral Cathedral, The
Forge of Origins, Luminara, etc.). **Maps to:** world-building reference
only — the specific named regions here are illustrative, not canon place
names (no episode currently references "Luminara" or "The Astral
Cathedral" by name). Useful as a density/scale reference for how the full
Parallel World should feel from above, and as a candidate source for
future region names if the saga extends past Season 1.

### `official-character-roster-la-saga.jpg`
Full-cast infographic ("PERFILES OFICIALES — LA SAGA") supplied directly by
the user: portrait + role/origin/abilities/quote card for 8 characters —
The Traveler, NØVA, KAI, LYRA, ORION, ATLAS, MAYA, ECHO — plus a "los
portales" world-index (8 named portal categories: MIND, FUTURE, WILD,
HUMAN, EARTH, MOVE, LAB, ORIGINS, UNKNOWN) and a color-meaning legend
(azul/dorado/violeta/turquesa). **Maps to:** general cast/roster reference.

**⚠️ Real, unresolved discrepancy with `../../characters/*.json` — flagged,
not silently reconciled:** this roster's NØVA is drawn as a humanoid young
man. `../../characters/nova.json`'s locked design is explicitly a **small
round-bodied hovering robot** with `"do not make adult-humanoid
proportions"` as a stated `prohibited_variations` entry. KAI, LYRA, ORION,
ATLAS, and MAYA don't exist anywhere in the current character bible at
all — this image introduces a materially larger ensemble cast than what's
canonized. Before this image is used to prompt any generator, someone
needs to decide: does the bible get revised to match this roster (new
canonical NØVA design + 5 new characters), or does this image get
excluded as non-canonical concept art? Not decided here.

### `world-scenes-collage.jpg`
6-panel scene collage supplied directly by the user: (1) The Traveler +
a round companion robot walking a golden circuit-path through a floating
city at sunset, (2) The Traveler + robot before a holographic globe of
connected nodes in an ornate interior, (3) a round white/blue companion
robot swimming underwater with children among coral, (4) The Traveler +
robot walking toward a glowing portal arch, (5) a round white/blue/orange
robot with goggles and a tablet in a bright tech interior, (6) a
geometric multi-world diagram — several small worlds connected by golden
lines around a central globe. **Maps to:** panels 1/2/4 closely match
`s01-parallel-world-overlook.jpg`/`e08-mission-control-globe.jpg`'s
framing and could supplement Episodes 3/8/13; panel 3 is a strong
Peskids/Wavo-world reference (closer to Wavo's actual locked design than
`e06-peskids-pool-world.jpg`'s generic robots — the robot here is
round/hovering, consistent with `../../characters/wavo.json`); panel 5's
robot is unbranded and doesn't match any locked character design as-is;
panel 6 is a general world-connectivity reference, comparable to
`parallel-world-atlas-map.jpg`. **Note:** this collage's NØVA/companion-
robot designs (round, hovering) are consistent with the existing
character bible, unlike the humanoid NØVA in
`official-character-roster-la-saga.jpg` above — the two user-supplied
images are not mutually consistent with each other either.

## Usage note for generation agents

None of these images should be reproduced verbatim — they establish mood,
color palette (deep blue/purple/gold), composition style (wide establishing
shots, two-character framing with The Traveler always taller/behind-left,
NØVA smaller/foreground-right), and the geometric-symbol density expected
throughout the Parallel World. Actual character design must follow the
locked `generation_prompt`/`negative_prompt` fields in each character's
JSON file — these images predate and inspired those prompts, not the
other way around.
