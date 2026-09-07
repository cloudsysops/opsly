# Two content-engines exist — consolidation deferred pending real-ffmpeg validation

Date: 2026-09-07
Status: PARTIALLY IMPLEMENTED (safe adapter delegation only)
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
   `content-studio`, **not its own package, not in `config/modules.json`**.
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

Both read the same `config/content-channels/*.json` files (confirmed
compatible on disk — `content-engine`'s preset normalizer tolerates the
camelCase shape `content-studio` writes), but parse them into two
**different, incompatible in-memory preset types** (`ChannelPreset` with
fractional `safeArea` vs `ContentChannelPreset` with pixel `safeArea` and
extra fields like `shadowColor`/`motionDefaults`/`tone`).

This is the exact "reuse first, don't duplicate" violation `CLAUDE.md` warns
against — two agents built two render engines without knowing about each
other.

## What was found to NOT be safely unifiable from this session

Went in intending a full refactor (delegate `content-studio/ffmpeg.ts` to
`lib/content-engine`'s `render/ffmpeg-adapter.ts`) and stopped after finding:

- **No `ffmpeg`/`ffprobe` binary in this sandbox** — any change to actual
  ffmpeg argv/filter construction is unverifiable here. `ffmpeg-smoke.test.ts`
  (`describe.skipIf(!ffmpegAvailable())`) skips locally and only runs in CI,
  and even there it only asserts output *dimensions*, not codec/pixel-format
  correctness.
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

## Safe slice implemented

The first low-risk slice is now implemented in `lib/content-studio`:

- `@intcloudsysops/content-studio` depends on the canonical
  `@intcloudsysops/content-engine` package.
- `ffmpegAvailable()` delegates to the canonical cached availability check.
- `probeMedia()` delegates to the canonical `probe()` implementation and only
  maps field names (`durationSec` to `duration`, optional dimensions to zero).
- The duplicate `ffprobe` process wrapper was removed.
- A content-studio test exercises the delegation with a real generated media
  fixture when FFmpeg is available.

No operation that changes rendered video output was redirected. The codec,
pixel-format, filter, concat, thumbnail, caption and audio paths remain on
their existing implementation until the production FFmpeg build is validated.

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
- Shared drawtext text-escaping (`escapeDrawtext` vs `sanitizeDrawtext`) and
  the `FfmpegNotAvailableError` class — currently duplicated with slightly
  different escaping rules.

## What needs a real ffmpeg before touching

Anything that changes what ends up in the rendered file: `concat`/
`concatVideos`, `thumbnail`/`generateThumbnail`, `verticalReframe`/`scale`,
`captionBurn`/`burnSubtitles`, `extractClip`/`trim` (also differ in
`-c copy` vs re-encode — not just codec flags), and the two `ChannelPreset`
shapes (would require touching every call site in both packages).

## Consequences

- Duplication stays for now; both `content-cli.ts` and `content-os-cli.ts`
  keep working exactly as they do today — zero behavior change from this
  ADR by itself.
- Whoever picks this up next should run the `ffmpeg-smoke.test.ts`-style
  check (or a manual `ffmpeg -i sample.mp4 ...` diff of before/after output)
  on a machine with ffmpeg installed, not merge a render-layer change on
  type-check/unit-test green alone.
- `config/modules.json` (governance-protected) should eventually register
  `content-studio`'s content-engine subfolder or fold it into
  `@intcloudsysops/content-engine` outright — whichever direction the
  render-layer consolidation above lands on.
