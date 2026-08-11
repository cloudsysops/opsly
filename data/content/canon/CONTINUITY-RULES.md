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
