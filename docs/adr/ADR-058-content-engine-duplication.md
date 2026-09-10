# Two content-engines exist — consolidation deferred pending real-ffmpeg validation

Date: 2026-09-07
Status: PROPOSAL (documented, not actioned)
Author: Claude Code (session https://claude.ai/code/session_01R5iuYy3C35Mx9EXSF6cNGG)

## Context

While auditing parallel agent work in the content-production area, found two
independently-built, functionally-overlapping "content engine" render
pipelines in the same repo:

1. **`lib/content-engine`** — standalone package `@intcloudsysops/content-engine`,
   **registered in `config/modules.json`** (the canonical module registry).
   Consumed by `scripts/content-cli.ts` (`npm run content-engine:*`).
   `ContentProject`/`Scene`/`Asset` domain model, real ffmpeg pipeline
   (`render/ffmpeg-adapter.ts`: scale, trim, concat, overlayText,
   burnSubtitles, mixAudio, normalizeAudio, generateThumbnail, transcode,
   animateStill), SRT builder, YouTube metadata builder, channel presets,
   `@intcloudsysops/universe` character bridge, approval state machine.

2. **`lib/content-studio/src/content-engine/`** — a subfolder inside
   `content-studio`. **Correction (2026-09-10):** this package *is*
   registered in `config/modules.json` — the `content-studio` entry's
   `mainFile` points directly at
   `lib/content-studio/src/content-engine/index.ts`. The original claim
   here ("not in `config/modules.json`") was wrong; there is no missing
   registration to add.
   Consumed by `scripts/content-os-cli.ts` (`npm run content:create` /
   `ingest` / `transcribe` / `discover-clips` / `validate` / `render-plan` /
   `render` / `thumbnail` / `metadata` / `rights-check` / `demo`). Its own
   `ContentProject`/`Scene`/`Asset` domain model (richer status machine:
   `research`, `rights_review`, `qa`, `measured`, ...), its own ffmpeg
   wrapper (`ffmpeg.ts`), plus repurpose-pipeline-specific pieces that
   `lib/content-engine` has no equivalent for at all: transcription
   (`transcribe.ts`), clip discovery (`clip-discovery.ts`), trend detection
   (`trends.ts`), rights gating (`rights.ts`), transformative-angle scoring
   (`angles.ts`), taxonomy (`taxonomy.ts`).

3. **`scripts/ops/content-render-ffmpeg.mjs`** — a *third* independent
   ffmpeg wrapper, added after this ADR was first written. Used by
   `scripts/moneyprinter-bridge.mjs`, tested by
   `scripts/ops/__tests__/content-render-ffmpeg.test.mjs` (runs in CI via
   `node --test`, in the `scripts-check` job). Duplicates, yet again: ffmpeg
   spawning, an availability check, drawtext escaping (its `escapeDrawtext`
   happens to use the *same* four-character replacement set as
   `content-engine`'s), an `FfmpegNotAvailableError` class (same name,
   different message), title-card rendering, and thumbnail generation. Not
   in scope for the rest of this ADR's analysis, but it means the actual
   duplication count is three, not two, and any future consolidation needs
   to account for it too.

Both `content-engine` and `content-studio` read the same
`config/content-channels/*.json` files (confirmed compatible on disk —
`content-engine`'s preset normalizer tolerates the camelCase shape
`content-studio` writes) for the three channels they share, but parse them
into two **different, incompatible in-memory preset types** (`ChannelPreset`
with fractional `safeArea` vs `ContentChannelPreset` with pixel `safeArea`
and extra fields like `shadowColor`/`motionDefaults`/`tone`). They also no
longer agree on *which* channels exist: `content-studio`'s
`ContentChannel` now has five values (`bitsitos`, `splashitos`,
`opsly-universe`, `peskids`, `icso-gaming-tbd`, the last added for the
Mauro gameplay pipeline), while `content-engine`'s `KNOWN_CHANNELS` still
hard-codes the original three and its `getChannelPreset()` throws on
anything else. A shared preset loader would need to gain `peskids` and
`icso-gaming-tbd` support, not just reconcile field names.

This is the exact "reuse first, don't duplicate" violation `CLAUDE.md` warns
against — multiple agents built multiple render engines without knowing
about each other.

## What was found to NOT be safely unifiable from this session

Went in intending a full refactor (delegate `content-studio/ffmpeg.ts` to
`lib/content-engine`'s `render/ffmpeg-adapter.ts`) and stopped after finding:

- **No `ffmpeg`/`ffprobe` binary in this sandbox** — any change to actual
  ffmpeg argv/filter construction is unverifiable here. **Correction
  (2026-09-10):** `ffmpeg-smoke.test.ts` does not run in CI at all today —
  the original claim that it does was wrong. `.github/workflows/ci.yml`'s
  `test-integration` job only runs `(cd lib/content-studio && npm run
  build)`, never `npm test`; no job in the active workflow installs
  `ffmpeg`. So this test currently only ever runs on a machine that already
  has ffmpeg and someone remembers to run `vitest` by hand — there is no
  automated signal for a render-layer regression at all, local or CI,
  until a real CI step is added.
- **The two ffmpeg layers differ in explicit encoding flags, not just
  structure.** Example: `content-studio/ffmpeg.ts`'s `verticalReframe()`
  uses the *identical* scale/crop filter string as `content-engine`'s
  `scale()`, but additionally forces `-c:v libx264 -pix_fmt yuv420p -c:a aac`
  on every operation — `content-engine`'s equivalents leave codec/pix_fmt to
  ffmpeg's build defaults. Swapping the implementation could silently
  change the compatibility profile of every rendered video (YouTube/player
  compatibility hinges on `yuv420p` specifically) with no local or CI signal
  to catch it beyond "the file exists and has the right dimensions."
- **`feat/content-studio-youtube`** (open, unmerged as of this writing) is
  actively building 24x7 automated YouTube publishing for Bitsitos/Splashitos
  on top of this exact `content-studio/content-engine` code path right now.
  An unverified behavior change here lands underneath in-flight work by
  another agent with no way for either of us to catch a regression before it
  ships to a real YouTube channel.

## Decision

**Defer the actual code consolidation** until it can be validated against a
real `ffmpeg`/`ffprobe` binary (a dev machine, the VPS, or CI running the
new code path directly) rather than merged from a sandbox that can't render
a single test frame.

## What IS safe to unify whenever this is picked up

No behavior risk, verifiable by type-check/unit test alone, no real ffmpeg
needed:

- Add `@intcloudsysops/content-engine` as a dependency of
  `@intcloudsysops/content-studio`.
- `content-studio/ffmpeg.ts`'s `ffmpegAvailable()` → delegate to
  `content-engine`'s `isFfmpegAvailable()` (identical `spawnSync ffmpeg
  -version` check).
- `probeMedia()` → delegate to `content-engine`'s `probe()`, mapping
  `{durationSec, width, height}` → `{duration, width, height}` (pure field
  rename, same ffprobe invocation).
- The `FfmpegNotAvailableError` class shape (name + "not installed" message)
  — three near-identical copies exist now, safe to consolidate since none of
  its callers inspect anything but the error existing.

## What needs a real ffmpeg before touching

Anything that changes what ends up in the rendered file: `concat`/
`concatVideos`, `thumbnail`/`generateThumbnail`, `verticalReframe`/`scale`,
`captionBurn`/`burnSubtitles`, `extractClip`/`trim` (also differ in
`-c copy` vs re-encode — not just codec flags), and the two `ChannelPreset`
shapes (would require touching every call site in both packages, and
extending `content-engine`'s channel set to cover `peskids` and
`icso-gaming-tbd`).

**Correction (2026-09-10):** `escapeDrawtext` (`content-engine`,
`content-render-ffmpeg.mjs`) and `sanitizeDrawtext`
(`content-studio/ffmpeg.ts`) are not interchangeable and do **not** belong
in the "safe to unify" list above — an earlier version of this ADR put them
there. `escapeDrawtext` only backslash-escapes `\ : ' %`, preserving the
text; `sanitizeDrawtext` *removes* `' : \ [ ]`, collapses whitespace, trims,
and truncates to 90 characters. Any caption with punctuation, repeated
whitespace, brackets, or over 90 characters would render differently
depending on which one runs. Unifying these needs an explicit decision on
the intended contract plus before/after render tests, not a drop-in swap.

## Consequences

- Duplication stays for now; both `content-cli.ts` and `content-os-cli.ts`
  keep working exactly as they do today — zero behavior change from this
  ADR by itself.
- Whoever picks this up next should add a real CI step that installs
  `ffmpeg` and runs `ffmpeg-smoke.test.ts` (it currently doesn't run
  anywhere automated), and use it — or a manual `ffmpeg -i sample.mp4 ...`
  diff of before/after output — to validate any render-layer change. Do not
  merge one on type-check/unit-test green alone; today that green tells you
  nothing about ffmpeg output.
- `scripts/ops/content-render-ffmpeg.mjs` needs a consolidation decision
  too once the two-package merge direction is picked — it's a third copy of
  the same drawtext-escaping/availability-check/error-class pattern.
