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
