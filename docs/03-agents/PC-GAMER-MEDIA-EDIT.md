---
status: active
owner: operations
last_review: 2026-10-06
type: agent-doc
tags:
  - opsly/agents
  - opsly/media
  - opsly/pc-gamer
---

# PC gamer — edición de video (agentes)

**Canon:** [`docs/runbooks/OPSLY-SHARED-MEDIA.md`](../runbooks/OPSLY-SHARED-MEDIA.md)

## Resumen para agentes en `smdqcia-pc`

1. Media de trabajo: `~/opsly-media` (WSL) / Explorer `\\wsl$\Ubuntu\home\opsly\opsly-media`
2. Raw de action cam: `~/opsly-media/camera/<ingest_id>/{VIDEO,PHOTO}`
3. Proyectos de edición: `~/opsly-media/projects/<nombre>/`
4. Exports: `~/opsly-media/exports/`
5. Si falta material: el **Mac** debe correr `./scripts/ops/sync-media-to-pc-gamer.sh`
6. Nunca editar la SD montada en el Mac; nunca `git add` videos al repo

SSH: `opsly@smdqcia-pc` — ver [`SSH-USERS-FOR-AGENTS.md`](SSH-USERS-FOR-AGENTS.md).
