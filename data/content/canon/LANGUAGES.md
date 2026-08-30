# Languages

Multi-language content pipeline, added 2026-08-11 to make production more
agile — write once, localize incrementally, never block on translating
everything at once.

## Supported codes

| Code | Language | Status |
|---|---|---|
| `es` | Spanish (LatAm neutral) | **Required** — base language for all content |
| `en` | English | **Required** — base language for all content |
| `zh` | Chinese (Simplified) | Optional, additive |
| `ja` | Japanese | Optional, additive |
| `pt` | Portuguese (Brazil) | Optional, additive |
| `ar` | Arabic | Optional, additive — covers Arabic-speaking audiences including Jordan |

`es`/`en` stay mandatory because every existing episode, character sample
line, and CLI tool assumes they're present — `LocalizedTextSchema` (in
`lib/content-studio/src/episodes/schema.ts`) enforces this at validation
time. Any other language code can be added to `title`/`hook`/
`metadata.captions` on any episode without touching the schema — it's an
open `Record<string, string>`, not a closed list.

## How to add a language to an episode

Edit `episode.json`, add the new key to `title`, `hook`, and
`metadata.captions`:

```json
{
  "title": { "es": "...", "en": "...", "pt": "..." },
  "hook": { "es": "...", "en": "...", "pt": "..." },
  "metadata": {
    "captions": { "es": "...", "en": "...", "pt": "..." }
  }
}
```

`npm run content:validate` will accept it immediately — no code change
needed for a new language on an existing field.

## Character voice per language

`characters/*.json` → `voice.language` stays `'es' | 'en' | 'both'`
(narration language for that character's audio) — this is about which
languages a character's *voiceover* is recorded in, separate from which
languages an episode's on-screen text is translated into. A character
voiced in `'both'` can still appear in an episode localized to more
written languages than it has recorded audio for (subtitle-only in that
case).

## What's translated so far

Only the pilot episode (`opsly-parallel-path-001`, "The Question") has
`zh`/`ja`/`pt`/`ar` translations, as a proof that the pipeline works end
to end. Translating the remaining 12 Season 1 episodes into all 4
additional languages is a real, sizeable translation task — not done in
this pass. Recommended order: translate the episodes closest to actually
being produced first, not all-at-once.

## Why this instead of per-language duplicate files

An earlier alternative considered was one `episode.{lang}.json` per
language. Rejected: it would fragment `production.status` per language
(which one is "the" status?), break `EpisodeManager`'s id-based lookups,
and multiply the files needing to stay in sync on every script edit. A
single open language map keeps one file, one status, one source of truth.
