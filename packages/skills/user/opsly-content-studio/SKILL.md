---
name: opsly-content-studio
description: >
  Content OS v2 — unique production pipeline for Opsly video
  (ingest → highlights → render → rights → human approval).
  Also the anti-duplication gate for Mauro gameplay.
status: active
owner: operations
last_review: 2026-09-09
type: package-doc
tags:
  - opsly/package
  - opsly/content
---

# Opsly Content Studio Skill

> **Triggers:** `content-os`, `content-engine`, `ingest video`, `clip`,
> `highlight`, `gameplay`, `mauro`, `rights gate`, `publish short`
> **Priority:** HIGH
> **Leer primero:** `config/content-capabilities.json`

## Duplication guard (obligatorio)

Antes de escribir código:

1. Abrir `config/content-capabilities.json`.
2. ¿La capability ya tiene `canonical_owner`? → extender ese path.
3. ¿Otro worktree/PR la implementa (#1155, #1158, #1131)? → reutilizar o BLOCK.
4. ¿Dueño `missing` o `unclear`? → BLOCK y reportar. No improvisar.

**NO NEW CONTENT PIPELINE**  
**NO NEW RENDER ENGINE**  
**NO NEW PUBLISHER**  
**NO NEW HIGHLIGHT ENGINE**

Canon: [`docs/00-architecture/CONTENT-PIPELINE-CANONICAL.md`](../../../docs/00-architecture/CONTENT-PIPELINE-CANONICAL.md)

## Production path (Mauro / gameplay)

```
ingest → session → (transcript optional) → audio-peak highlights
  → score → extractClip → verticalReframe → rights → QA advisory
  → human approve/reject (Moon) → publish gate
```

- Motor: `lib/content-studio/src/content-engine/`
- Estado: `runtime/content-os/tenants/<tenant>/projects/<id>/project.json`
- Canal gaming: `icso-gaming-tbd` — nunca Bitsitos
- UI: `apps/admin/app/moon/creator/`
- Gamer = execution (ffmpeg, watcher, clip-agent). VPS = state, approval, secrets.

## Other stacks (do not replace)

| Stack | Path | Role |
| --- | --- | --- |
| Scene compose | `lib/content-engine/` + `npm run content-engine:*` | ADAPTER scripted stills |
| Event drafts + MPT | `ContentVideoWorker` / MoneyPrinterTurbo | ADAPTER kids/ops stories |
| Hermes MCP render | `apps/rendering-engine` | SUPERSEDED for this pipeline |

## Fail-closed

- No fake MP4s. No Whisper adapter until wired in `transcribe.ts`.
- `mode: commentary` always human review.
- No publish without `approve`. `AUTO_PUBLISH` stays off.

## Tests

`lib/content-studio/src/content-engine/__tests__/` —
`describe.skipIf(!ffmpegAvailable())` for real ffmpeg; `mkdtempSync` + `baseDir`.
