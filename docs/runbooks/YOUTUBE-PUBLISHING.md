---
status: active
owner: content
last_review: 2026-08-13
type: runbook
tags:
  - opsly/content
  - opsly/youtube
---

# YouTube Publishing — setup + operation

Connector: `lib/content-studio/src/publishers/youtube.ts` (`YouTubePublisher`).
CLI: `npm run content:youtube:publish -- <episode-id> --video <path.mp4> ...`
(`scripts/content/youtube-publish.ts`).

**Factory 24×7 (Bitsitos / Splashitos):** `scripts/ops/content-studio-24x7.sh`
+ LaunchAgent `com.opsly.content-studio-24x7`. Sube el siguiente unpublished
(`--limit 1`, unlisted, tope 6/día). Runbook: `docs/runbooks/CONTENT-FACTORY-NOW.md`.

**Status (CLI `content:youtube:publish`):** connector unit-tested; live factory
uses `scripts/content-studio-publish-youtube.sh` + Doppler `YOUTUBE_*`.

## What this does NOT do

- Does not render video. It uploads an already-rendered local `.mp4` file
  you give it — see `lib/content-studio/src/rendering/episode-render-plan.ts`
  (still dry-run-only) for the render side.
- Does not auto-publish anything. The CLI defaults to a dry-run that prints
  exactly what would be uploaded and makes no API call; you must pass
  `--live` to actually upload.
- Does not bypass human review. It refuses to run (dry-run or live) unless
  the episode's `production.status` is `reviewed` or `published` — see
  `data/content/canon/CANON-STATUS.md`.

## One-time setup (human, ~15 min)

1. **Create/select a Google Cloud project** for the channel that will own
   the uploads.
2. **Enable the YouTube Data API v3** for that project (APIs & Services →
   Enable APIs).
3. **Configure the OAuth consent screen** (External, or Internal if using
   Google Workspace) — add the `https://www.googleapis.com/auth/youtube.upload`
   scope.
4. **Create OAuth 2.0 credentials** (Desktop app type) → note the
   **Client ID** and **Client Secret**.
5. **Generate a refresh token once**, using the OAuth Playground
   (https://developers.google.com/oauthplayground) or a short local script:
   - In the Playground, click the gear icon → check "Use your own OAuth
     credentials" → paste your Client ID/Secret.
   - Select scope `https://www.googleapis.com/auth/youtube.upload`.
   - Authorize with the Google account that owns/manages the target
     YouTube channel.
   - Exchange the authorization code for tokens → copy the **refresh
     token** (this is what the connector uses long-term; access tokens
     expire in ~1h and are refreshed automatically by `googleapis`).

## Doppler configuration

Never put these in `.env`, code, or a commit. Add to Doppler under the
project's config (per `AGENTS.md` — `ops-intcloudsysops / prd`, or a
dedicated `content` config if the team prefers isolating this credential
set):

```
YOUTUBE_CLIENT_ID=<from step 4>
YOUTUBE_CLIENT_SECRET=<from step 4>
YOUTUBE_REFRESH_TOKEN=<from step 5>
```

**This step requires explicit confirmation from a human with Doppler
access** — per `AGENTS.md` AUTONOMY RULES, agents don't edit Doppler
secrets unattended.

## Usage

Always dry-run first:

```bash
npm run content:youtube:publish -- opsly-parallel-path-001 \
  --video ./renders/opsly-parallel-path-001.mp4 \
  --made-for-kids false
```

Prints the title, description, tags, privacy, made-for-kids flag, and file
size that *would* be uploaded. No network call, nothing changes on disk.

When ready to actually publish:

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  npm run content:youtube:publish -- opsly-parallel-path-001 \
    --video ./renders/opsly-parallel-path-001.mp4 \
    --made-for-kids false \
    --privacy unlisted \
    --live
```

On success, updates that episode's `episode.json`:
`production.status → "published"`, `production.published_at`,
`production.published_platforms` gains `"youtube"`,
`production.publish_urls.youtube` gets the video URL.

## `--made-for-kids` — required every time, no default

YouTube legally requires every upload to be self-declared as "made for
kids" (COPPA) or not — this changes comments, personalized ads, and
notifications behavior on the video. The CLI and the underlying
`YouTubePublisher.publish()` both refuse to run without an explicit
`true`/`false` — there is no default, on purpose. **Peki Lab** episodes
(children's swim content) should be `true`; **Opsly Origins** /
**Opsly: The Parallel Path** / **Build With Opsly** (general/founder
audience) should typically be `false` — confirm per episode, don't assume.

## Approval gate details

`production.status` must already be `reviewed` (a human watched the
rendered cut and approved it) or `published` (re-running is a no-op-ish
metadata refresh) before this CLI will do anything — `idea`, `script`,
`storyboard`, `assets`, and `rendered` are all rejected. This mirrors the
approval-first policy already documented for the Splashitos channel pack
(`docs/brand/icso/YOUTUBE-KIDS-SWIM-CHANNEL.md`, on
`feat/icso-youtube-kids-swim`) — no episode goes out without a human
watching the actual cut first.

## Enlaces relacionados

- [`../00-architecture/CONTENT-PRODUCTION-MVP.md`](../00-architecture/CONTENT-PRODUCTION-MVP.md)
- [`../../data/content/canon/CANON-STATUS.md`](../../data/content/canon/CANON-STATUS.md)
- [`../brand/icso/YOUTUBE-KIDS-SWIM-CHANNEL.md`](../brand/icso/YOUTUBE-KIDS-SWIM-CHANNEL.md) (on `feat/icso-youtube-kids-swim`)
