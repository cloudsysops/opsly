---
status: active
owner: operations
last_review: 2026-10-06
type: runbook
tags:
  - opsly/media
  - opsly/pc-gamer
  - opsly/agents
---

# Opsly shared media — Mac hub ↔ PC gamer edit

Almacenamiento compartido para raw de cámaras (action cam 4K) y edición en el PC gamer.
**Editar siempre en el PC** (copia local en HDD `D:`). El Mac es hub de ingesta + backup opcional.

> **Agentes en PC gamer (`smdqcia-pc` / `home-gpu-01`):** leer la sección
> [PC gamer agents — playbook](#pc-gamer-agents--playbook) antes de tocar video.

## Layout canónico (recomendado)

**Una sola raíz de trabajo en el PC:** `D:\Content` (ya preparada en el HDD).

`D:\opsly-media` es solo **capa de compatibilidad** (symlinks) para scripts/agentes.

```
D:\Content\                          ← CANON (Explorer / Resolve / Premiere)
  Media\
    Camara\inbox\<ingest_id>\        ← action cam raw (VIDEO + PHOTO)
    Camara\processed\                ← proxies / selects
    OBS\{horizontal,vertical}\       ← grabs OBS
    OpsAfterDark\                    ← assets del show
    Audio\  Graficos\
  Projects\                          ← proyectos NLE (Premiere, etc.)
  Resolve\                           ← DaVinci (Backups, Gallery)
  Renders\                           ← exports finales
  Archive\                           ← frío / scratch agentes

D:\opsly-media\                      ← ALIAS (mismos archivos)
  camera   → Content\Media\Camara\inbox
  inbox    → Content\Media\Camara\inbox
  projects → Content\Projects
  exports  → Content\Renders
  from-mac\  to-mac\  to-pc-gamer\   ← helpers de sync

WSL: ~/opsly-media → /mnt/d/opsly-media
```

Idempotente en el PC:

```bash
# Desde Mac:
ssh smdqcia-pc 'bash -s' < scripts/ops/ensure-pc-gamer-media-layout.sh
# O en WSL del PC:
./scripts/ops/ensure-pc-gamer-media-layout.sh
```

## PC gamer agents — playbook

Cuando el humano conecta la memoria de la action cam **en el Mac** y pide compartir / editar:

1. **No** editar sobre la tarjeta SD ni sobre rutas de red.
2. Confirmar layout + material:
   ```bash
   test -L ~/opsly-media/camera && echo ALIAS_OK
   ls -la /mnt/d/Content/Media/Camara/inbox/ | tail -5
   ls -la ~/opsly-media/to-pc-gamer/latest-camera 2>/dev/null || true
   du -sh /mnt/d/Content/Media/Camara/inbox/* 2>/dev/null | tail -5
   ```
3. Si falta el último ingest: pedir al Mac (o ejecutar desde Mac):
   ```bash
   ./scripts/ops/sync-media-to-pc-gamer.sh --dry-run
   ./scripts/ops/sync-media-to-pc-gamer.sh
   ```
4. Abrir / editar desde:
   - Explorer: `D:\Content\Media\Camara\inbox\<ingest_id>\`
   - WSL: `~/opsly-media/camera/<ingest_id>/` (mismo contenido)
5. Proyectos NLE → `D:\Content\Projects\<nombre>\` (no dentro de `Camara\`).
6. Resolve → `D:\Content\Resolve\`. Exports → `D:\Content\Renders\`.
7. **Nunca** `git add` media al monorepo `~/opsly`.
8. Si hay stream / OBS LIVE: no reiniciar WSL, Docker ni Discord; solo leer/copiar archivos.

### Checklist rápido (agente PC)

| Check | Comando / acción |
|-------|------------------|
| SSH/WSL OK | `uname -s` → Linux; `whoami` → `opsly` |
| Canon | `test -d /mnt/d/Content/Media/Camara/inbox && echo OK` |
| Alias | `test -L ~/opsly-media/camera && echo OK` |
| Último ingest | `ls /mnt/d/Content/Media/Camara/inbox \| tail -3` |
| Espacio | `df -h /mnt/d \| tail -1` |
| Editar | Resolve/Premiere sobre `D:\Content\…` |

## Layout (Mac hub — opcional)

| Path | Rol |
|------|-----|
| `/Volumes/DragonB/DragonB/opsly-media` | Backup / hub si hace falta copia local |
| `~/opsly-media` | Symlink al hub Mac |
| `camera/<ingest_id>/` | Raw por sesión |
| `to-pc-gamer/latest-camera` | Symlink al último ingest |

Tarjeta action cam montada típica: `/Volumes/Untitled` (`VIDEO/`, `PHOTO/`).

**Preferido:** no llenar el Mac — empujar **directo SD → `D:\Content`** por Tailscale.

## Ingesta recomendada: SD (Mac) → HDD PC

```bash
ID="action-cam-4k_$(date +%Y-%m-%d)"
# Destino vía alias (= Content\Media\Camara\inbox\$ID)
ssh smdqcia-pc "mkdir -p /mnt/d/opsly-media/camera/$ID/{VIDEO,PHOTO} && \
  ln -sfn /mnt/d/opsly-media/camera/$ID /mnt/d/opsly-media/to-pc-gamer/latest-camera"

caffeinate -i rsync -a --progress --partial -e ssh \
  /Volumes/Untitled/PHOTO/ smdqcia-pc:/mnt/d/opsly-media/camera/$ID/PHOTO/
caffeinate -i rsync -a --progress --partial -e ssh \
  /Volumes/Untitled/VIDEO/ smdqcia-pc:/mnt/d/opsly-media/camera/$ID/VIDEO/
```

Verificar en PC:

```bash
du -sh /mnt/d/Content/Media/Camara/inbox/$ID/*
ls /mnt/d/Content/Media/Camara/inbox/$ID/VIDEO | wc -l
```

No desconectar la SD hasta `VIDEO` completo (conteo de archivos + `du` estable).

## Sync desde hub Mac (si ya hay copia local)

```bash
./scripts/ops/sync-media-to-pc-gamer.sh --dry-run
./scripts/ops/sync-media-to-pc-gamer.sh          # último ingest
./scripts/ops/sync-media-to-pc-gamer.sh --all
```

| Env | Default |
|-----|---------|
| `OPSLY_MEDIA_ROOT` | `~/opsly-media` (Mac) |
| `OPSLY_MEDIA_SSH_HOST` | `smdqcia-pc` |
| `OPSLY_MEDIA_REMOTE_ROOT` | `/mnt/d/opsly-media` (alias → Content) |

## Reglas

1. Canon de edición = **`D:\Content`**. Alias `opsly-media` no es una segunda copia.
2. No editar Premiere/DaVinci sobre la SD ni por SMB/red.
3. Exports finales → `Renders\` (= `~/opsly-media/exports`).
4. No commitear media al monorepo Opsly.
5. Desmontar la SD del Mac **solo** cuando PHOTO+VIDEO terminaron en el PC.

## Enlaces

- Agentes PC: [`docs/03-agents/PC-GAMER-MEDIA-EDIT.md`](../03-agents/PC-GAMER-MEDIA-EDIT.md)
- PC worker: [`docs/04-infrastructure/PC-GAMER-WORKER.md`](../04-infrastructure/PC-GAMER-WORKER.md)
- SSH agents: [`docs/03-agents/SSH-USERS-FOR-AGENTS.md`](../03-agents/SSH-USERS-FOR-AGENTS.md)
- Ensure layout: [`scripts/ops/ensure-pc-gamer-media-layout.sh`](../../scripts/ops/ensure-pc-gamer-media-layout.sh)
- Sync script: [`scripts/ops/sync-media-to-pc-gamer.sh`](../../scripts/ops/sync-media-to-pc-gamer.sh)
