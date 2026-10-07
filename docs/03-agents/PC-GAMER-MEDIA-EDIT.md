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

1. Media de trabajo en el **HDD D:** → `D:\opsly-media` (= WSL `/mnt/d/opsly-media`; `~/opsly-media` es symlink)
2. Raw de action cam: `~/opsly-media/camera/<ingest_id>/{VIDEO,PHOTO}`
3. Proyectos de edición: `~/opsly-media/projects/<nombre>/` (también en D:)
4. Exports: `~/opsly-media/exports/`
5. Si falta material: el **Mac** empuja por Tailscale (`./scripts/ops/sync-media-to-pc-gamer.sh` o rsync directo SD→`/mnt/d/opsly-media`)
6. Nunca editar la SD del Mac; nunca guardar raw en el VHD de WSL; nunca `git add` videos al repo

SSH: `opsly@smdqcia-pc` — ver [`SSH-USERS-FOR-AGENTS.md`](SSH-USERS-FOR-AGENTS.md).
