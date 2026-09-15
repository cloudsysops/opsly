---
status: canon
owner: content
last_review: 2026-09-09
type: architecture
tags:
  - opsly/content
  - opsly/architecture
  - opsly/agents
---

# Content pipeline — canonical

> Agents: read `config/content-capabilities.json` before writing any
> ingest / clip / highlight / render / publish code.
> Historical docs stay historical. This file is the production path.

## Architecture

Three video stacks exist in the monorepo. Only one is the Mauro gameplay
production path.

| Stack | Path | Role |
| --- | --- | --- |
| **Content OS v2** | `lib/content-studio/src/content-engine/` | **CANONICAL** gameplay + commentary + owned ingest |
| Scene compose | `lib/content-engine/` | **ADAPTER** — scripted stills→ffmpeg. Not gameplay. |
| Event drafts + MPT | `lib/content-studio/src/{mappers,generators,rendering/moneyprinterturbo.ts}` + BullMQ `content-video` | **ADAPTER** — tenant/ops stories. Not gameplay. |
| Hermes MCP render | `apps/rendering-engine` | **SUPERSEDED** for this pipeline |

State of truth for gameplay: `ContentProjectEnvelope` at
`runtime/content-os/tenants/<tenant>/projects/<id>/project.json`.
Channel for Mauro: `icso-gaming-tbd` (youth/adult). Never Bitsitos kids.

```
PC gamer (execution)                         VPS (control)
NVIDIA / OBS file
        │
        ▼
watcher + clip-agent  --CLI-->  Content OS pipeline
ffmpeg / optional STT            envelope + rights + QA
                                 Moon approve/reject
                                 publish credentials
```

Incoming implementation (not on `main` yet): #1155 intake + #1158 session MVP.

Related: [ADR-058](https://github.com/cloudsysops/opsly/pull/1131) (ffmpeg
consolidation deferred). Do not merge the two ffmpeg adapters in this loop.

## Canonical pipeline

```
GAMEPLAY
  → INGEST          ingestOwnedVideo / ingestPrecutHighlight / prepareGameplaySession
  → SESSION         envelope.session (no second registry)
  → TRANSCRIPT      optional; sidecar or future TranscriptionAdapter; gameplay skips
  → HIGHLIGHTS      discoverProjectClipsFromAudio (silencedetect)
  → SCORE           scoreGameplayCandidate / selectPrimaryCandidates
  → CLIP            extractClip
  → RENDER          verticalReframe + captionBurn → renderTopClips
  → CONTENT STUDIO  envelope persisted
  → RIGHTS          evaluateRightsGate
  → QA              runContentQaCheck (advisory)
  → READY_FOR_REVIEW approval.state = ready_for_review
  → APPROVAL        Moon / CLI human approve|reject
  → PUBLISH         gate + optional adapter; never without approve
```

This is the only production path for Mauro gameplay.

## Capability owners

| Capability | Implementations found | Canonical owner | Status | Duplicates | Decision |
| --- | --- | --- | --- | --- | --- |
| gameplay.ingest | `ingestOwnedVideo`, `ingestPrecutHighlight`, watcher `ingest` (old), `prepareGameplaySession` (#1158) | `pipeline.ts` | CANONICAL | bare ingest for Instant Replay | KEEP session path; Instant Replay → `prepare-session` |
| session.registry | `envelope.session` (#1158) | `types.ts` envelope field | CANONICAL | none | KEEP; no DB table |
| transcription | `transcribe.ts` sidecar; Whisper blocked | `transcribe.ts` | CANONICAL interface, adapter missing | WhisperX / gamer STT not wired | ADAPT future STT into this file only |
| highlight.detect | `audio-peak-discovery.ts`, `clip-discovery.ts`, Auto-clipper research | `audio-peak-discovery.ts` | CANONICAL | transcript discovery; Auto-clipper | KEEP audio-peak; clip-discovery ADAPTER for scripted; Auto-clipper ADAPT patterns only |
| highlight.score | `highlight-score.ts` (#1158); raw `clip.score` | `highlight-score.ts` | CANONICAL | discovery heuristic | KEEP; quality > quota |
| clip.extract | studio `extractClip`; content-engine `trim` | `ffmpeg.ts` `extractClip` | CANONICAL | second ffmpeg | KEEP studio; ADAPT engine later (ADR-058) |
| vertical.reframe | `verticalReframe`; engine `scale` | `ffmpeg.ts` `verticalReframe` | CANONICAL | engine scale lacks yuv420p lock | KEEP studio |
| captions | `captionBurn`/`writeSrt`; engine SRT; `caption-generator.ts` | `ffmpeg.ts` | CANONICAL for video | 3 caption systems | KEEP video captions here; generator = other domain |
| render | `renderTopClips`; engine `compose`; `ContentVideoWorker`+MPT; Hermes; Remotion research | `renderTopClips` | CANONICAL | 4 render stacks | KEEP FFmpeg; MPT ADAPTER other domain; Remotion REFERENCE_ONLY |
| dragon.overlay | `DragonCyberMode=NONE` stub (#1158) | `types.ts` + future `ffmpeg.ts` | STUB | none | KEEP stub; do not vendor LivePortrait |
| rights | `rights.ts`; `compliance-checker.ts` | `rights.ts` | CANONICAL | secrets regex on drafts | KEEP RightsGate |
| qa | `runContentQaCheck`; `validation.ts` | `runContentQaCheck` | CANONICAL | schema validation is not QA | KEEP advisory flags |
| approval | `setProjectApproval`+Moon; engine state-machine; `content-approval-queue` | Moon + `setProjectApproval` | CANONICAL | 3 approval UIs/stores | KEEP Moon for gameplay |
| publish | `publishing.ts` gate; `YouTubePublisher`; youtube CLI | `publishing.ts` | CANONICAL gate | upload adapter separate | KEEP gate; YouTube ADAPTER on VPS only |
| metrics | `capabilities.ts` `not-wired-no-metrics-source` | none | MISSING | fake dashboards | BLOCK invented numbers |

Full machine-readable copy: `config/content-capabilities.json`.

## Worker roles

### PC gamer — execution plane only

May provide: `local_llm`, vision, transcription adapter, ffmpeg, video.render,
highlight.detect (ffmpeg silencedetect).

Must **not** own: canonical envelope state, publishing secrets, approval
state, rights/business rules, customer upload.

Host pieces: `scripts/ops/pc-gamer-gameplay-watcher.mjs`,
`scripts/ops/pc-gamer-clip-agent.py` (stdlib coordinator), compose workers
(#1157). Always `OPSLY_CONTENT_PUBLISHING=disabled` on the gamer.

Python on gamer: stdlib only until a proven gap. No pip/torch/whisper/opencv/yolo.

### VPS — control plane

Owns: jobs, envelope persistence, policies, Moon approvals, publishing
credentials (Doppler), scheduling, audit trail.

`ContentVideoWorker` stays the MoneyPrinterTurbo job runner for event/kids
drafts. It is **not** the gameplay watcher and **not** a second orchestrator.

## Approval model

1. Pipeline stops at `ready_for_review` / `human_review`.
2. Human Approve or Reject in Moon (`/moon/creator`) or CLI.
3. QA flags are advisory. They never approve.
4. `mode: commentary` always requires human review (`rights.ts`).
5. Reject does not publish. Approve does not upload by itself.

## Publishing model

1. `assertHumanApprovedPublish`.
2. `OPSLY_CONTENT_AUTO_PUBLISH` must stay off.
3. `enqueueApprovedPublishJob` (#1158) writes `publishJobs[]` `queued` only.
4. `YouTubePublisher` runs only on VPS with Doppler credentials, after
   approve, against an explicit target. Default privacy unlisted/draft.
5. `MUSIC_RIGHTS=UNKNOWN` is not publish-ready.

## CLI map (names are overloaded)

| Script | npm | Package | Use |
| --- | --- | --- | --- |
| `scripts/content-os-cli.ts` | `content:ingest` … | Content OS v2 | Gameplay ingest/discover |
| `scripts/content-engine.ts` | `content:approve` / `content --` | Content OS v2 public API | Approve/reject/render envelope |
| `scripts/content-cli.ts` | `content-engine:*` | `lib/content-engine` | Scene compose only |

Do not add a fourth CLI.

## OSS project policy

| Project | Decision | Why |
| --- | --- | --- |
| Auto-clipper | **ADAPT** | Steal highlight patterns into `audio-peak-discovery` / score. Do not vendor. |
| OpenCut (`floomhq/opencut`) | **REFERENCE_ONLY** | Timeline/captions ideas. Do not embed the app. |
| OpenCut-app GUI | **REJECT** | CapCut clone; out of scope. |
| Remotion / remotion-clip | **REFERENCE_ONLY** | Company license + cost. Prod render stays FFmpeg until ADR + human cost approval. |
| MoneyPrinterTurbo | **ADAPT** | Keep as synthetic kids/event adapter. Not gameplay. |
| TwitchDownloader | **REFERENCE_ONLY** | VOD/chat later. |
| Hermes `apps/rendering-engine` | **SUPERSEDED** | Do not route Mauro through MCP render_video. |
| LivePortrait / Kokoro | **REFERENCE_ONLY** | Dragon/TTS later; no clone into this repo. |

Vendor clones live outside the monorepo (`opsly-content-research`, #1151).
Do not copy `vendor/` here.

## Deprecated / do-not-extend paths

- Watcher Instant Replay → bare `ingest` (superseded by `prepare-session` in #1158)
- New BullMQ job types for gameplay (watcher is not a second orchestrator)
- New highlight engine (YOLO/OpenCV/Auto-clipper as runtime)
- New publisher beside `publishing.ts` + `YouTubePublisher`
- Fake metrics dashboards
- Mixing Mauro gameplay into Bitsitos

## Migration plan (no mass-delete)

| Path | Action |
| --- | --- |
| `lib/content-studio/src/content-engine/` | **KEEP** — gameplay owner |
| `lib/content-engine/` | **KEEP** as scene-compose ADAPTER; **ADAPT** ffmpeg later per ADR-058 |
| `ContentVideoWorker` + MPT | **KEEP** for event/kids; do not point gameplay at it |
| `scripts/content-os-cli.ts` + `content-engine.ts` | **KEEP**; document; later **MOVE** approve into one CLI |
| `scripts/content-cli.ts` | **KEEP** namespaced `content-engine:*` |
| Moon `/moon/creator` | **KEEP** / **ADAPT** reject+scores via #1158 |
| `apps/rendering-engine` | **ARCHIVE** for this pipeline (do not delete this loop) |
| Superpowers Mauro specs/plans | **ARCHIVE** as history; this doc wins |
| `CONTENT-STUDIO-ARCHITECTURE.md` | **KEEP** historical Phase 2 events |
| `CONTENT-PRODUCTION-MVP.md` | **KEEP** historical brand bible |
| Auto-clipper / Remotion clones | **KEEP** outside repo |

## Agent rule

**NO NEW CONTENT PIPELINE**  
**NO NEW RENDER ENGINE**  
**NO NEW PUBLISHER**  
**NO NEW HIGHLIGHT ENGINE**

unless the canonical owner is explicitly `missing` in
`config/content-capabilities.json` and a human confirms.

Duplication guard: exists? who owns it? is another worktree building it?
Can I extend the owner? If yes → reuse. If unclear → BLOCK and report.

## Definition of done (this unification loop)

- [x] every capability inventoried
- [x] one owner per capability
- [x] duplicate paths identified
- [x] canonical pipeline documented
- [x] PC gamer role clear
- [x] VPS role clear
- [x] OSS projects classified
- [x] capability registry exists
- [x] agents must check registry before coding
- [x] worktrees classified (see report / this session)
- [x] no production changes
- [x] no duplicate feature created

## Next implementation job

Do **not** start Remotion, Auto-clipper, Whisper, or Dragon overlay.

1. Night stack only: #1154 → #1157 → #1155 → #1158.
2. First real Instant Replay through watcher → Moon review.
3. Only then: STT adapter behind `transcribe.ts`, or ffmpeg golden tests for ADR-058.

## Enlaces relacionados

- [[00-architecture/CONTENT-STUDIO-ARCHITECTURE|CONTENT-STUDIO-ARCHITECTURE]] (historical Phase 2 events)
- [[00-architecture/CONTENT-PRODUCTION-MVP|CONTENT-PRODUCTION-MVP]] (historical brand bible)
- [[04-infrastructure/PC-GAMER-WORKER|PC-GAMER-WORKER]]
- Skill `opsly-content-studio`
- PR #1131 ADR-058 · #1151 vendor research · #1155 intake · #1158 session
