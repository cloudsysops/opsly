---
title: "lib/content-engine Governance"
description: "Module governance for the local-first video content pipeline"
---
# lib/content-engine Governance

## Ownership

- **Owner:** Claude (AI agent)
- **Maintainers:** Content/Growth team
- **Escalation:** Product Engineering Lead

## Scope

Structured video production: `ContentProject` -> `Scene` -> `Asset` -> FFmpeg
composition -> `final.mp4`. Local-first (filesystem storage under
`data/content/` and `runtime/content-artifacts/`), no external rendering
API required for V1.

Distinct from `lib/content-studio`, which generates AI marketing copy/captions
from dev-ops events and submits rendering to an external MoneyPrinterTurbo
API — a different domain (event-driven social captions vs. structured
narrative video production). Both can coexist; this module does not replace
or wrap that one.

## Multi-Tenant Safety Rules

- All projects and assets are scoped under `data/content/tenants/<tenant_slug>/`.
- Asset references are validated at read time — a project must never resolve
  an asset path outside its own tenant directory (see
  `src/storage/asset-store.ts`'s cross-tenant checks and
  `src/validation/validate-project.ts`).
- Never assume `tenantId`/`tenantSlug` from context without validation.

## FFmpeg Safety Rules

- `src/render/ffmpeg-adapter.ts` exposes an **allowlisted** set of methods
  (`probe`, `scale`, `trim`, `concat`, `overlayText`, `burnSubtitles`,
  `mixAudio`, `generateThumbnail`, ...) that build argv arrays and invoke
  `child_process.spawn('ffmpeg', args)` directly.
- **Never** pass a shell string through `exec`/`shell: true`. All user/project
  data (titles, captions, paths) must be passed as discrete argv elements or
  escaped into an ffmpeg filter-safe form — never concatenated into a shell
  command string.
- If ffmpeg/ffprobe are not on `PATH`, fail closed with a clear
  `BLOCKED_RENDER`-style error — never report a fake success.
