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

1. **Raíz canónica:** `D:\Content` (= WSL `/mnt/d/Content`)
2. **Alias agentes/scripts:** `~/opsly-media` → `/mnt/d/opsly-media` → symlinks a Content
3. Action cam raw: `D:\Content\Media\Camara\inbox\<ingest_id>\{VIDEO,PHOTO}`  
   (= `~/opsly-media/camera/<ingest_id>/`)
4. Proyectos: `D:\Content\Projects\` · Resolve: `D:\Content\Resolve\` · Exports: `D:\Content\Renders\`
5. Si falta material: Mac empuja por Tailscale (`sync-media-to-pc-gamer.sh` o rsync SD→`/mnt/d/opsly-media/camera/…`)
6. Layout roto → `./scripts/ops/ensure-pc-gamer-media-layout.sh` (idempotente)
7. Nunca editar la SD; nunca guardar raw en el VHD de WSL; nunca `git add` videos al repo

SSH: `opsly@smdqcia-pc` — ver [`SSH-USERS-FOR-AGENTS.md`](SSH-USERS-FOR-AGENTS.md).
