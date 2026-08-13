# Canon Status — read this before adding to the Opsly Universe

**Purpose:** stop parallel agents (Cursor, Codex, Claude sessions, humans)
from rebuilding the same characters/worlds/symbols independently. This
file is the single answer to "does this already exist, and can I touch
it?" — check it **before** creating a new character, world, or mystery
device, not after.

## The rule in one sentence

**Extend, don't reinvent.** If a concept already has an entry below,
add to it (new field, new episode, new doc section) instead of creating a
parallel version with a different name. If genuinely unsure whether
something exists, `npm run content:list` and read
[`CONTINUITY-RULES.md`](CONTINUITY-RULES.md) before writing anything.

## Where things live (single source of truth)

| Concept | Canonical location | Do NOT create a second one at |
|---|---|---|
| Characters | `data/content/characters/*.json` (validated via `CharacterRegistry`) | `config/content-studio/saga/characters.json` or any other path |
| Series/Seasons | `data/content/series/*/series.json` | any other JSON config |
| Episodes | `data/content/series/*/episodes/*/episode.json` + `script.md` | flat batch files, one-off script dumps |
| Symbols/cipher/mythology | `data/content/canon/SYMBOLS.md` (S1 cipher + shape/number vocabulary), `THE-MIRROR.md` (multi-season 9-symbol payoff), `ANCESTORS.md`, `THE-NULL.md`, `MESSENGER.md` | a new "mythology.json" or duplicate bible doc |
| World/layer model | `data/content/canon/WORLDS.md` | a new worlds.json |
| Macro story arc | `data/content/canon/ORIGIN-SAGA.md` | a competing "universe bible" doc |
| Reference art | `data/content/assets/reference/` + `REFERENCE-IMAGES.md` | scattered image files with no manifest |
| Multi-language text | `LANGUAGES.md` + open language maps in `episode.json`/`characters/*.json` (see below) | per-language duplicate episode files |

## Status per character (locked vs. open)

Read `personality.narrative_role` + the character's canon doc for the full
picture; this table is the quick index.

| Character | File | Status |
|---|---|---|
| The Traveler (aka El Viajero) | `the-traveler.json` | **Locked visual/voice.** Used in all 13 scripted Season 1 episodes — don't change design without a continuity review. |
| NØVA | `nova.json` | **Locked core design**, but customizable-by-viewer is canon (see `NOVA.md`) — variant skins/accessories are fine to add as long as the base silhouette/eyes/personality rule stays. |
| Wavo | `wavo.json` | Locked, used in Episode 6 as scripted. |
| Peki | `peki.json` | New (merged 2026-08-11). Not yet in any scripted episode — free to use in new Peskids content. |
| NULL | `the-null.json` | New. **Not used in Season 1 by design** — available for Season 2+. |
| Messenger | `messenger.json` | New, generic. Named individual messengers (Ariel, Lumiel, El Guardián) are a planned extension — see `MESSENGER.md`. |
| opsly-founder / opsly-robot-luna | (MVP characters) | Superseded for new Universe content by The Traveler/NØVA, but still live — used by the `opsly-origins` series. Don't delete. |

## Status per season/arc

| Arc | Status | Notes |
|---|---|---|
| Season 1 — `opsly-parallel-path` (13 episodes) | **Scripted, `storyboard` status.** | Full scenes + bilingual script.md for all 13. Treat as locked unless explicitly asked to revise — see `ORIGIN-SAGA.md`. |
| Saga II — "Los Mundos" (tenant planet expansion) | **Documented only**, no episodes yet. | See `WORLDS.md`. Planets named so far: Peskids (ocean), Bitsitos (tech/AI), Turismo, Salud, Construcción, Restaurantes, Guardian, Panini. |
| Saga III — "La Fractura" (NULL's arc) | **Documented only**, no episodes yet. | See `THE-NULL.md` for NULL's argument + draft climactic dialogue. |
| The Mirror / 9-symbol mystery | **Documented only**, framed as a multi-season mystery layered above Season 1's 5-fragment cipher. | See `THE-MIRROR.md` + `SYMBOLS.md`. |
| The Ancestral Archive | **Documented only**, a location not an episode. | See `ANCESTORS.md`. |
| NØVA viewer customization | **Documented product concept only**, not implemented. | See `NOVA.md` "Viewer customization". |

## Before you build

1. `npm run content:list` — see what episodes already exist.
2. `npm run content:validate` — confirm the repo is in a known-good state before you start.
3. Read this file + [`CONTINUITY-RULES.md`](CONTINUITY-RULES.md) for the full merge history and any open naming collisions (e.g. the `peki-lab` series name vs. the Peki character — still unresolved, see CONTINUITY-RULES).
4. If you're adding a *new* character/world/symbol that isn't in the tables above: add it, then add a row here in the same change. An addition without a `CANON-STATUS.md` update is incomplete.
5. If you're extending something already listed: edit in place (new fields, new episodes) — don't fork a parallel file.

## History of merges (append, don't rewrite)

- **2026-08-11:** Merged parallel canon from `feat/icso-youtube-kids-swim`
  (Peki, NULL, Messenger, MUNDUS/NEXUS/AETHER, shape+number symbols) into
  this typed structure. See `CONTINUITY-RULES.md` "Merge with
  feat/icso-youtube-kids-swim canon" for the full record.
- **2026-08-11 (same day):** Merged a richer narrative draft ("Los
  Arquitectos del Umbral") adding Ancestors, named Messengers, the
  9-symbol Mirror mystery, and Saga II/III structure — all recorded as
  Season 2+ material, not retrofitted into the locked Season 1 scripts.
  See `CONTINUITY-RULES.md`.
- **2026-08-11 (same day):** Added multi-language support — `title`/
  `hook`/`metadata.captions` on episodes are now an open language map
  (`es`/`en` required, any other code additive) instead of a closed
  `{es, en}` object. See `LANGUAGES.md`. Pilot episode
  (`opsly-parallel-path-001`) translated into `zh`/`ja`/`pt`/`ar` as
  proof of concept; the other 12 Season 1 episodes are not yet
  translated beyond es/en.
- **2026-08-13:** Added the real YouTube Data API v3 publisher
  (`lib/content-studio/src/publishers/youtube.ts`,
  `npm run content:youtube:publish`) — see
  `docs/runbooks/YOUTUBE-PUBLISHING.md`. Code exists and is tested
  (mocked API), but no Doppler credentials are configured yet, so nothing
  can actually be uploaded until a human completes the one-time OAuth
  setup. The approval gate (rejects anything not `reviewed`/`published`)
  was verified live against `opsly-parallel-path-001` (correctly refused,
  since it's still `storyboard`).
