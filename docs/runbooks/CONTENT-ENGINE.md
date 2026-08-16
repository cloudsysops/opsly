# ICSO Content Engine / Opsly Creator Studio — Runbook

Local-first structured video pipeline: `ContentProject` → `Scene`s → FFmpeg
composition → `final.mp4`. Everything in this document describes code that
exists and runs today — nothing aspirational.

## What this is (and isn't)

- **Is:** a real CLI + library that takes a structured project (scenes with
  images, optional voiceover, captions, motion) and renders a real
  `final.mp4` locally via FFmpeg, plus a thumbnail, SRT captions, and
  YouTube upload metadata (never auto-published).
- **Isn't:** an AI image/video generator, a TTS pipeline, or a YouTube
  uploader. Those are explicitly out of scope for this milestone (see
  `NEXT` in the PR description) — V1 works from manually-supplied or
  placeholder images and optional manually-supplied voice files.
- **Distinct from `lib/content-studio`:** that module generates AI marketing
  captions from dev-ops events and submits rendering to an external
  MoneyPrinterTurbo API. This module never calls an external render API —
  everything happens locally via `child_process.spawn('ffmpeg', ...)`.
- **Reconciled with the parallel story-bible effort (PR #961):** that PR
  independently built `data/content/{canon,characters,series,campaigns}` —
  a real, detailed character bible (The Traveler, NØVA, WAVO, ...) and
  scripted episodes, extending `lib/content-studio` with its own dry-run
  `content:list`/`content:validate`/`content:render-plan`/`content:episode`
  CLI. That canon data was pulled into this branch (`data/content/canon`,
  `data/content/characters`, `data/content/series`, `data/content/assets`,
  `data/content/campaigns` — siblings of this module's own
  `data/content/tenants/`, no path collision) and this module's CLI was
  renamed to the `content-engine:*` npm-script namespace specifically to
  avoid colliding with #961's `content:*` names. The pilot episode (below)
  uses real scene copy from `data/content/series/opsly-parallel-path/
  episodes/001-the-question/script.md`. lib/content-studio's
  `content:render-plan` is dry-run only; this module is the execution layer
  that actually calls ffmpeg.

## Prerequisites

- FFmpeg + ffprobe on `PATH`. Verify: `ffmpeg -version && ffprobe -version`.
  If missing on Debian/Ubuntu: `apt-get install -y ffmpeg` (pulls in
  `libx264`, `libass` for subtitle burning, and `fontconfig`/`freetype` for
  `drawtext` — all required by this module's render path).
- `npm install` at the repo root (links `@intcloudsysops/content-engine` as
  an npm workspace package).

## Storage layout

```
data/content/tenants/<tenant>/projects/<projectId>/
  project.json    — ContentProject
  scenes.json      — Scene[]
  assets.json      — Asset[] (registered assets for this project)
data/content/tenants/<tenant>/assets/
  <projectId>/...  — actual image/voice/music files, tenant-isolated

runtime/content-artifacts/<projectId>/   — build output (gitignored, regenerate via content-engine:render)
  final.mp4
  captions.srt
  thumbnail.jpg
  metadata.json
  tmp/              — intermediate scene clips, kept for debugging
```

`data/content/tenants/**` is committed (source of truth) — `data/` is this
repo's existing convention for committed structured domain data (see also
`data/growth/`). `runtime/content-artifacts/` is gitignored, matching
`runtime/`'s existing convention for regeneratable local state
(`runtime/tmp/`, `runtime/logs/`, ...). Both paths were chosen to fit
`config/root-whitelist.json`'s existing allowed top-level folders rather
than adding new ones — `node scripts/validate-structure.js` passes.

Tenant isolation is enforced at the path-resolution layer
(`resolveAssetPath` in `lib/content-engine/src/storage/paths.ts`): a
project can never resolve an asset outside its own tenant's asset
directory, even if an `Asset` record is tampered with. Verified in
`asset-store.test.ts` and `validate-project.test.ts` (`CROSS_TENANT_ASSET`).

## CLI

```bash
npm run content-engine -- --help
npm run content-engine:list [-- --tenant <slug>]
npm run content-engine:create -- --tenant <slug> --channel <bitsitos|splashitos|opsly-universe> --series <slug> --title "<title>" [--episode N]
npm run content-engine:validate -- <projectId>
npm run content-engine:render-plan -- <projectId>
npm run content-engine:render -- <projectId>
npm run content-engine:thumbnail -- <projectId> [--at <seconds>]
npm run content-engine:metadata -- <projectId>
```

`content-engine:create` scaffolds an empty project (`status: idea`, no
scenes). Add scenes by hand-editing `scenes.json` (and register assets via
`registerAsset()`/`saveAssets()` from the library — there is no
`content-engine:add-asset` CLI subcommand yet, see NEXT).

### Status lifecycle

```
idea -> drafting -> assets_pending -> ready_to_render -> rendering -> ready_for_review -> approved -> published
                                                              \-> failed -> assets_pending
```

Enforced by `CONTENT_PROJECT_TRANSITIONS` — an illegal transition throws
`InvalidStatusTransitionError` rather than silently succeeding.
`content-engine:render` refuses to run (exits `BLOCKED_RENDER`) unless the
project passes `content-engine:validate` first.

## Channel presets

Real config files, not hardcoded values: `config/content-channels/{bitsitos,splashitos,opsly-universe}.json`.
Each defines resolution/fps/duration limits/font/subtitle style/safe
area/transition/audio levels/brand colors — loaded and validated by
`lib/content-engine/src/presets/index.ts` (throws on a malformed or
unknown-channel config file rather than silently falling back).

## Rendering pipeline (what `content-engine:render` actually does)

1. Validate the project (`content-engine:validate` logic) — refuses to
   render an invalid project.
2. Per scene: turn its image into a silent Ken Burns motion clip
   (`animateStill` — scale-to-cover + `zoompan` filter for
   zoom-in/zoom-out/pan-left/pan-right/static), and render its audio
   segment (`padOrTrimAudio` on the voiceover file if present, otherwise
   `generateSilence`) at the scene's exact duration.
3. Concat all scene video clips into one silent video; concat all scene
   audio segments into one voice track.
4. Mix the voice track with an optional music asset at the channel
   preset's configured (ducked) dB levels.
5. Build `captions.srt` from scene captions (`buildSrt`) and burn it onto
   the video via `libass` (`burnSubtitles`).
6. Output `runtime/content-artifacts/<projectId>/final.mp4`.

All FFmpeg invocations go through an **allowlisted** adapter
(`lib/content-engine/src/render/ffmpeg-adapter.ts`) — every method builds
an argv array and calls `spawn('ffmpeg', args)` directly. No shell string
is ever built from project/user data; `escapeDrawtext()` filter-escapes any
text that goes into a `drawtext` filter.

## Pilot episode

`opsly-parallel-path-pilot-001` (tenant `intcloudsysops`, channel
`opsly-universe`, series "OPSLY: The Parallel Path") — 8 scenes, ~40s.
Seeded via `scripts/content-seed-opsly-origins.ts` (idempotent — safe to
re-run). Scene copy for beats 1-5 is verbatim (ES) from the canonical
script at `data/content/series/opsly-parallel-path/episodes/
001-the-question/script.md` ("La Pregunta", S1E01) — that canon's own id
for its serialized cut of this same story is `opsly-parallel-path-001`;
this project is a condensed, render-pipeline proof-of-concept cut across
that arc (it also covers beats canon defers to later episodes — the
Parallel World reveal, the map), not a claim to be the canonical episode.

**No rendered character art exists anywhere in this repo.** Canon
(`data/content/characters/the-traveler.json`, `nova.json`) has a full
character bible — silhouette/proportions/color-palette/
generation_prompt/negative_prompt, ready for an image-gen model — but no
actual character-sheet image has been generated yet (canon's own
`episode.json` lists them under `assets_needed`, and
`production.status` is still `"storyboard"`). This pilot's visuals are
honestly-labeled placeholder stills (solid color + scene description
text, `source: 'placeholder'` in each `Asset` record, generated via
`generatePlaceholderStill`), not final art. Dialogue is delivered as
burned captions — no TTS or manually-supplied voice files exist for this
pilot, so scenes have no voiceover (this is an explicitly supported V1
path, not a workaround).

Reproduce:
```bash
npx tsx scripts/content-seed-opsly-origins.ts
npm run content-engine:validate -- opsly-parallel-path-pilot-001
npm run content-engine:render -- opsly-parallel-path-pilot-001
npm run content-engine:thumbnail -- opsly-parallel-path-pilot-001
npm run content-engine:metadata -- opsly-parallel-path-pilot-001
```

## Moon Creator UI

`/moon/creator` (list, reads `listProjects()`) and `/moon/creator/[id]`
(detail — scenes, assets, validation, render output paths, approve/reject
form actions calling the real approval state machine). Read-only status
display + approve/reject only — no scene editor, per the explicit "no
Premiere-like editor" scope for V1. Runs against the local filesystem
directly (`apps/admin` imports `@intcloudsysops/content-engine` as a
workspace package) — this works in local dev where admin and the
data/content + runtime/content-artifacts directories share a filesystem;
production deployment where admin runs in a separate container without
that shared filesystem is unsolved (see NEXT).

## Character continuity

Two layers, not competing definitions:

- `lib/content-engine/src/characters/presets.ts` — this module's own
  lightweight `CharacterProfile`s (The Traveler, NØVA, WAVO) plus a
  `NovaCustomization` config primitive with one example preset per variant
  (base, aquatic, explorer, builder, science, cyber, ancestral-tech).
- `lib/content-engine/src/characters/canon-loader.ts` —
  `loadCanonCharacter(id)` / `listCanonCharacterIds()` load the **real**,
  much richer bible from `data/content/characters/*.json` (canon pulled in
  from PR #961): full silhouette/proportions/face/clothing/color-palette
  detail, `generation_prompt`/`negative_prompt` ready for an image-gen
  model, voice tone + sample line, and `prohibited_variations` a generator
  must never violate (e.g. The Traveler's face must never be shown, in any
  episode, any angle).

Neither layer feeds a visual generator yet — no such generator exists in
this repo — but the loader is real, tested against the actual repo canon
files (not a fixture), and exported from the module's public API.

## Known limitations

- No TTS integration — voice must be manually supplied (`Scene.voiceover`
  referencing a registered `voice`-type asset) or omitted.
- No AI image/video generation — visuals must be manually supplied or are
  honestly-labeled placeholders.
- `concat()`'s use of the ffmpeg concat *demuxer* with `-c copy` requires
  matching codec parameters across segments. This holds for this module's
  own generated clips (consistent encode settings throughout) but would
  need re-encoding via a filter-graph concat instead if segments came from
  heterogeneous external sources.
- No `content-engine:add-asset` CLI subcommand — asset registration is a library
  call (`registerAsset` + `saveAssets`), used directly by authoring scripts
  like the pilot seed script.
- Moon Creator UI has no production filesystem-sharing story with
  `apps/admin`'s deployment target.
