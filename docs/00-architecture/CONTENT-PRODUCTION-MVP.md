---
status: active
owner: operations
last_review: 2026-08-11
type: architecture
tags:
  - opsly/architecture
  - opsly/content
---

# Opsly Content Production MVP — Brand Channel (Character-Driven)

## Relationship to Content Studio (`lib/content-studio`)

This is **not** a replacement for or fork of `lib/content-studio` —
it's an additive extension of the same package, covering a genuinely
different content mode:

| | `lib/content-studio` (existing, merged) | Content Production MVP (this doc) |
|---|---|---|
| Trigger | Runtime events (deploy, merge, test pass) | Planned campaign calendar |
| Content | One-off AI-generated draft per event, per tenant | Scripted, continuity-driven episodes with fixed characters |
| Characters | None — generic `avatar_style` per tenant | Persistent Character Bible (Opsly Founder, Luna, Wavo) |
| Render | `MoneyPrinterTurboRenderClient` (stock-style AI video) | Dry-run plan only in Phase 1 — no render provider call |
| Scope | Any tenant, including `tenant_slug=opsly` | Opsly's own brand channel(s) specifically |

Both share: Zod-validated types, the same `lib/content-studio` package,
the same compliance checker (`checkDraftCompliance` / `checkEpisodeCompliance`),
and (in a later phase) the same `MoneyPrinterTurboRenderClient` for actual
rendering once an episode reaches `storyboard`+ status with generated assets.

## What was audited before building (2026-08-11)

Before writing any code, this session searched for in-flight work to avoid
duplicating other agents' output:

- **`feat/content-studio-phase2`** — already merged to `main` (PR #362, #352).
  This is the event-driven tenant content system above; confirmed distinct
  from brand-channel scripted content, so no overlap.
- **`feat/pc-gamer-worker-plane`** (open branch, not yet merged) — implements
  the full gamer-PC media/GPU worker plane (Docker, BullMQ `ollama` worker,
  `OPSLY_WORKER_ALLOWLIST`, Mauro's gaming-schedule gating). This MVP does
  **not** reimplement any of that. `buildEpisodeRenderPlan()` produces a
  dry-run plan only; real execution is deferred until that branch merges and
  exposes a `content-render` (or similar) worker type in the allowlist.
- `lib/content-studio/src/rendering/moneyprinterturbo.ts` and
  `src/presets/tenant-content-presets.ts` already implement a working
  AI-video-render adapter and per-platform presets — reused conceptually
  (matching `VideoRenderRequest`/`TenantContentPreset` shapes) rather than
  rebuilt.

## What this MVP adds

New, additive types in `lib/content-studio/src/types.ts`:
`CharacterProfile`, `Series`, `Episode`, `EpisodeScene`, `Campaign`.

New submodules in `lib/content-studio/src/`:

```
characters/   CharacterRegistry — load + Zod-validate data/content/characters/*.json
series/       SeriesRegistry    — load + Zod-validate data/content/series/*/series.json
episodes/     EpisodeManager    — load episodes, checkEpisodeCompliance()
campaigns/    CampaignManager   — load campaign, buildCalendarView(), computeProductionStatus()
rendering/    buildEpisodeRenderPlan() — dry-run only, no provider call, no publish
```

All exported from `@intcloudsysops/content-studio` (`lib/content-studio/src/index.ts`).

Content data lives in `data/content/` at the repo root (see
[`data/content/README.md`](../../data/content/README.md)) — three characters (Opsly
Founder, Luna, Wavo), three series (Opsly Origins, Peki Lab, Build With
Opsly), one fully-scripted pilot episode, 15 idea-stage episodes, and a
30-day launch campaign calendar.

CLI (`scripts/content/*.ts`, run via `tsx`):

```bash
npm run content:list                              # all episodes + status
npm run content:episode -- opsly-origins-001       # full episode detail + script
npm run content:validate                           # schema + compliance + referential integrity
npm run content:calendar                            # 30-day schedule joined with live status
npm run content:render-plan -- opsly-origins-001    # dry-run plan, no execution, no publish
```

## Phase 1 (this MVP) — manual, no paid calls

- No render provider is called by `content:render-plan` — informational only.
- No publishing automation — YouTube Studio upload stays manual.
- No worker/Docker orchestration — that's `feat/pc-gamer-worker-plane`'s job.
- 1 pilot episode (`opsly-origins-001`) is fully scripted; the other 15
  episodes in the 30-day campaign are at `idea` stage (title, hook,
  objective, calendar slot) — script + scenes pending, same as the original
  spec's "prepare 20 shorts + 4 long-form concepts, fully script only the
  first episode."

## Phase 2 (future) — not built here

- Wire `buildEpisodeRenderPlan()` output into `MoneyPrinterTurboRenderClient`
  (or a character-consistent alternative) once character asset generation
  exists.
- Offload composition/upscale to gamer-worker-01 via a new
  `OPSLY_WORKER_ALLOWLIST` entry, once `feat/pc-gamer-worker-plane` merges.
- API-based publishing (YouTube Data API) instead of manual Studio upload.

## Success criteria (met)

- [x] `npm run content:list` — 16 episodes across 3 series
- [x] `npm run content:episode -- opsly-origins-001` — full script + scenes
- [x] `npm run content:calendar` — 30-day schedule with live status
- [x] `npm run content:validate` — schema + compliance + referential checks, all green
- [x] `npm run content:render-plan -- <id>` — dry-run, correctly blocks idea-stage episodes
- [x] Character Bible finalized (3 characters, generation + negative prompts)
- [x] Pilot episode fully scripted and validated
- [x] `lib/content-studio` type-check + full test suite (156 tests) green

## Enlaces relacionados

- [`docs/00-architecture/CONTENT-STUDIO-ARCHITECTURE.md`](CONTENT-STUDIO-ARCHITECTURE.md) — event-driven tenant content system
- [`data/content/README.md`](../../data/content/README.md) — data directory layout
- [[00-architecture/README|00-architecture]]
- [[brain/README|Brain Central]]
