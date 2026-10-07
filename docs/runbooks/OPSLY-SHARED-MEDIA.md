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
**Editar siempre en el PC** (copia local). El Mac es hub de ingesta + backup.

> **Agentes en PC gamer (`smdqcia-pc` / `home-gpu-01`):** leer la sección
> [PC gamer agents — playbook](#pc-gamer-agents--playbook) antes de tocar video.

## PC gamer agents — playbook

Cuando el humano conecta la memoria de la action cam **en el Mac** y pide compartir / editar:

1. **No** editar sobre la tarjeta SD ni sobre rutas de red.
2. Confirmar que existe material en WSL:
   ```bash
   ls -la ~/opsly-media/camera/
   ls -la ~/opsly-media/to-pc-gamer/latest-camera 2>/dev/null || true
   du -sh ~/opsly-media/camera/* 2>/dev/null | tail -5
   ```
3. Si la carpeta está vacía o falta el último ingest: pedir al Mac (o ejecutar desde Mac):
   ```bash
   # En el Mac (opsly-quantum), repo opsly:
   ./scripts/ops/sync-media-to-pc-gamer.sh --dry-run
   ./scripts/ops/sync-media-to-pc-gamer.sh
   # o --all para camera/ + exports/
   ```
4. Abrir / editar desde:
   - WSL: `~/opsly-media/camera/<ingest_id>/VIDEO` y `PHOTO`
   - Windows Explorer: `\\wsl$\Ubuntu\home\opsly\opsly-media`
5. Guardar proyectos de edición bajo `~/opsly-media/projects/<nombre>/` (no dentro de `camera/`).
6. Exports finales → `~/opsly-media/exports/` (el Mac puede pullar después).
7. **Nunca** `git add` media al monorepo `~/opsly`.
8. Si hay stream / OBS LIVE: no reiniciar WSL, Docker ni Discord; solo leer/copiar archivos.

### Checklist rápido (agente PC)

| Check | Comando / acción |
|-------|------------------|
| SSH/WSL OK | `uname -s` → Linux; `whoami` → `opsly` |
| Media root | `test -d ~/opsly-media && echo OK` |
| Último ingest | `ls ~/opsly-media/camera \| tail -3` |
| Espacio | `df -h ~ \| tail -1` |
| Editar | Premiere/DaVinci/Resolve sobre copia en `~/opsly-media` |

## Layout (Mac)

| Path | Rol |
|------|-----|
| `/Volumes/DragonB/DragonB/opsly-media` | Root canónico (disco externo DragonB) |
| `~/opsly-media` | Symlink al root |
| `camera/<ingest_id>/` | Raw por sesión (ej. `action-cam-4k_2026-10-06`) |
| `to-pc-gamer/latest-camera` | Symlink al último ingest |
| `exports/` | Finales listos |
| `from-pc-gamer/` | Retornos opcionales del PC |

Tarjeta action cam montada típica: `/Volumes/Untitled` (`VIDEO/`, `PHOTO/`).

## Layout (PC gamer)

| Path | Rol |
|------|-----|
| WSL `~/opsly-media` (`/home/opsly/opsly-media`) | Copia de trabajo |
| Explorer | `\\wsl$\Ubuntu\home\opsly\opsly-media` |

Opcional (Windows): junction `D:\opsly-media` → carpeta WSL o disco de edición dedicado (4 TB).

## Ingesta desde la cámara (Mac)

```bash
MEDIA=~/opsly-media
CARD=/Volumes/Untitled   # o el nombre del volumen de la action cam
ID="action-cam-4k_$(date +%Y-%m-%d)"
mkdir -p "$MEDIA/camera/$ID"/{VIDEO,PHOTO} \
  "$MEDIA"/{inbox,projects,exports,to-pc-gamer,from-pc-gamer}
# macOS openrsync: use --progress (not GNU --info=)
rsync -a --progress "$CARD/VIDEO/" "$MEDIA/camera/$ID/VIDEO/"
rsync -a --progress "$CARD/PHOTO/" "$MEDIA/camera/$ID/PHOTO/"
ln -sfn "$MEDIA/camera/$ID" "$MEDIA/to-pc-gamer/latest-camera"
ln -sfn "$MEDIA" "$HOME/opsly-media"
```

Luego sync al PC (abajo).

## Sync Mac → PC (Tailscale SSH)

```bash
# En el Mac, desde la raíz del repo opsly:
./scripts/ops/sync-media-to-pc-gamer.sh --dry-run
./scripts/ops/sync-media-to-pc-gamer.sh          # último ingest (latest-camera)
./scripts/ops/sync-media-to-pc-gamer.sh --all    # camera/ + exports/ + to-pc-gamer/
```

| Env | Default |
|-----|---------|
| `OPSLY_MEDIA_ROOT` | `~/opsly-media` |
| `OPSLY_MEDIA_SSH_HOST` | `smdqcia-pc` |
| `OPSLY_MEDIA_REMOTE_ROOT` | `/home/opsly/opsly-media` |

Requisitos: `ssh smdqcia-pc` OK (DefaultShell WSL + `opsly-agent-shell.exe`), Tailscale online en ambos lados.

## Reglas

1. No editar proyectos Premiere/DaVinci sobre la tarjeta SD ni por SMB/red.
2. Tras sync, editores/agentes trabajan en `~/opsly-media` del PC.
3. Exports finales → `exports/` (pueden volver al Mac con rsync inverso si hace falta).
4. No commitear media al monorepo Opsly.
5. La tarjeta se puede desmontar del Mac **solo** cuando la ingesta local terminó (`MANIFEST.txt` con `finished_at` o `du` estable).

## Enlaces

- PC worker: [`docs/04-infrastructure/PC-GAMER-WORKER.md`](../04-infrastructure/PC-GAMER-WORKER.md)
- SSH agents: [`docs/03-agents/SSH-USERS-FOR-AGENTS.md`](../03-agents/SSH-USERS-FOR-AGENTS.md)
- Script: [`scripts/ops/sync-media-to-pc-gamer.sh`](../../scripts/ops/sync-media-to-pc-gamer.sh)
