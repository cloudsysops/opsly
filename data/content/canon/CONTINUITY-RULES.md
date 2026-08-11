# Continuity Rules

## Character consistency (per character)

Every character must keep, across every episode and every generated asset:
canonical silhouette, wardrobe, color palette, symbols, proportions,
personality, and speech style, exactly as fixed in their `characters/*.json`
Character Bible entry. Use each character's `generation_prompt` +
`negative_prompt` as the prompt lock for any image/video generation —
don't freehand a description from memory.

## Relationship to the pre-existing MVP Character Bible (important)

The Content Production MVP shipped 2026-08-11 already defined three
characters: `opsly-founder`, `opsly-robot-luna`, `wavo`. This universe adds
two new ones: `the-traveler`, `nova`.

**This is an intentional inconsistency, documented rather than silently
resolved:**

- `the-traveler` and `opsly-founder` both represent Cristian, but as
  different design directions — `opsly-founder` is an unmasked, direct
  visionary; `the-traveler` is masked, more mysterious, more explicitly
  fictionalized. **`the-traveler` is the canonical protagonist going
  forward for any new Opsly Universe content.**
- `nova` and `opsly-robot-luna` both represent an ancestral/companion robot,
  but `opsly-robot-luna` is a wise adult-coded companion while `nova` is
  explicitly a child-coded inner-child archetype with a different narrative
  function. **`nova` is canonical for new universe content.**
- `opsly-founder` and `opsly-robot-luna` are **not deleted or renamed** —
  they remain valid, tested, and in active use by the `opsly-origins` series
  (the simpler, direct-to-camera factual episodes from the MVP, including
  the already-scripted pilot `opsly-origins-001`). Retiring or migrating
  `opsly-origins` onto the new canon is a product decision for a human to
  make, not something this session does unilaterally mid-flight.
- `wavo` is unchanged and shared by both layers without conflict — see
  `WAVO.md`.

Any future agent picking a character for **new** universe content should
default to `the-traveler` / `nova` unless explicitly asked to extend the
`opsly-origins` line with `opsly-founder` / `opsly-robot-luna`.

## Series consistency

`opsly-parallel-path` (this universe's Season 1) and `opsly-origins` (the
MVP's factual founder series) may both run on the channel. They are not in
conflict — `opsly-origins` is the plain, direct telling;
`opsly-parallel-path` is the cinematic, fictionalized telling of
overlapping real material. Do not merge their `series.json` entries or
episode numbering.

## Symbol consistency

See `SYMBOLS.md` — reuse the same geometry family across every episode and
every character's emblem/mask pattern. Do not introduce a second unrelated
symbol system.

## Season 1 reorder (2026-08-11, same day as initial build)

The first draft of Season 1 shipped as 10 episodes with a different order:
Peskids (Episode 4) came before Blueprint (Episode 5). When the fuller
Origin Saga was provided (see `ORIGIN-SAGA.md`), it placed platform
formation (Act V) *before* the first tenant-world (Act VI) — Opsly is built
as a general way of building, and Peskids is the first real thing to run on
it, not the trigger for realizing a blueprint is possible.

**Resolution:** adopted the Origin Saga's ordering as canonical and
reordered the season (Blueprint now Episode 5, Peskids now Episode 6),
rather than keeping two conflicting timelines. Three new episodes were also
inserted to cover previously-missing acts: IntCloudSysOps (Episode 4, Act
IV), The Venture Studio (Episode 9, Act IX), The Creator (Episode 11, Act
XI) — extending the season from 10 to 13 episodes. Episode ids were
renumbered accordingly (old `opsly-parallel-path-004` "Peskids" is now
`opsly-parallel-path-006`, etc.) — this is a same-day change before any
episode outside 001 left `idea`/`storyboard` status, so no published
content or external links were broken.

A second inconsistency was caught and fixed in the same pass: Episode 2
("Too Many Lives" / Act I) originally showed NØVA in dialogue, but the saga
is explicit that NØVA doesn't exist until Act II (Episode 1). Episode 2 was
rewritten so The Traveler travels alone, with a structure note explaining
the season's intentionally non-linear viewing order (Episode 1 airs first
as a cold open; Episode 2 is the chronological flashback before it).

## Merge with `feat/icso-youtube-kids-swim` canon (2026-08-11)

A separate agent independently built a parallel "Opsly Universe" canon on
branch `feat/icso-youtube-kids-swim`, stored as flat JSON under
`config/content-studio/saga/` (no Zod schema, no `lib/content-studio`
integration) plus `docs/brand/icso/OPSLY-UNIVERSE-BIBLE.md`. User asked to
reconcile by merging their canon **into** this typed structure (not the
reverse) — this section is the merge record.

**Same character, different name — merged, not duplicated:**
"El Viajero" (their canon) and "The Traveler" (this canon) are the same
character. Recorded as `also_known_as: ["El Viajero"]` on
`characters/the-traveler.json` rather than creating a second character
entry. NØVA is identical in both canons — no change needed.

**New characters merged in (additive, `narrative_role` enum extended with
`antagonist`/`messenger`):**
- **Peki** (`characters/peki.json`, see [`PEKI.md`](PEKI.md)) — new
  Peskids teaching hero, added *alongside* Wavo, not replacing it. They
  split roles: Peki teaches swimming/confidence directly to kids, Wavo
  handles tech/dashboard/automation framing. **Not yet used** in the
  already-scripted Episode 6 ("Peskids") — that episode still only
  features Wavo, since retrofitting a second character into an already-
  `storyboard`-status script wasn't worth the rework for this pass.
- **NULL** (`characters/the-null.json`, see [`THE-NULL.md`](THE-NULL.md))
  — the universe's first antagonist (danger of removing uncertainty
  through total optimization). **Not used in Season 1** — the already-
  scripted 13 episodes have no antagonist arc, and retrofitting one into
  storyboard-status scripts would mean real rework. NULL is canon and
  available for a future season.
- **Messenger** (`characters/messenger.json`, see
  [`MESSENGER.md`](MESSENGER.md)) — mythic threshold entity. Same
  not-used-in-Season-1 status as NULL, for the same reason.

**World model upgraded:** the informal "Real World / Parallel World" two-
plane framing became the three-layer MUNDUS/NEXUS/AETHER model from their
canon (see [`WORLDS.md`](WORLDS.md)) — fully backward compatible, nothing
in already-scripted episodes needed to change ("Real World" ≈ MUNDUS,
"Parallel World" ≈ NEXUS+AETHER). Also merged: **Peskids Planet** as the
formal tenant-planet framing for Episode 6's setting, and **Bitsitos
Zone** as a documented-but-not-yet-produced future world (tech/AI for
kids, tenant `bitsitos`) — no `data/content/series/` entry created for it.

**Symbol systems merged, not replaced:** this canon's five-fragment
English cipher (`YOU ARE NOT LOST...`) stays Season 1's actual mystery
device. Their shape+number vocabulary (○ Circle, △ Triangle, ◇ Diamond,
⬡ Hexagon, ↻ Spiral + 0-9 numerology-as-shorthand) was added to
[`SYMBOLS.md`](SYMBOLS.md) as the concrete visual language the cipher and
every other recurring symbol is actually drawn from — not a competing
system.

**Naming collision flagged, not resolved:** the pre-existing MVP series
`peki-lab` (features Wavo only) now shares a name with the new character
Peki, who doesn't appear in it. Left as-is — renaming the series or adding
Peki to it is a product decision, not something to resolve unilaterally
mid-merge.

**Deliberately not touched in this merge:** `feat/icso-youtube-kids-swim`
also contains a separate, more production-ready initiative — the
**Splashitos** YouTube Shorts channel (`config/content-studio/channels/
splashitos/`, `scripts/content-splashitos-enqueue.sh`) — a non-Peskids-
branded kids swim-tips channel with 5 ready-to-render drafts that actually
enqueue BullMQ `content-video` jobs to the real MoneyPrinterTurbo render
pipeline. This merge only reconciled the *narrative canon* (characters/
worlds/symbols); Splashitos' production pipeline is untouched and remains
on that branch pending a separate decision.
