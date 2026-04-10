# Deploy en VPS, CI y índice de conocimiento

Evita confundir **tres mecanismos distintos** en `dragon-1` (`/opt/opsly`).

## 1. `opsly-watcher` — auto-**push** (no es auto-pull)

- **Unidad:** `infra/systemd/opsly-watcher.service` → `scripts/auto-push-watcher.sh`.
- **Qué hace:** en el VPS, vigila cambios **locales** en `docs/` y `AGENTS.md` y hace **commit + push** a `origin/main`.
- **Qué no hace:** no hace `git pull`, no despliega Docker, no trae código nuevo desde GitHub.
- **Doc:** `docs/AUTO-PUSH-WATCHER.md`.

Si buscas “watcher de deploy”, **no es este servicio**.

## 2. Deploy real — GitHub Actions (confianza en CI)

- **Workflow:** `.github/workflows/deploy.yml` (tras push a `main` y job `build-and-push` OK).
- **En el VPS:** `git fetch` + `git reset --hard origin/main` (no es `git merge`; ver más abajo).
- **Tests:** la suite pesada corre en **GitHub Actions**, no en el VPS antes del reset. El VPS solo actualiza el árbol y las imágenes Docker.

Escenario **A (recomendado)** ya es el del repo: el VPS **confía en que `main` pasó CI** antes de desplegar.

## 3. Hook `post-merge` e índice de conocimiento

- **`./scripts/index-knowledge.sh`** regenera `config/knowledge-index.json` (cerebro Repo-First para Context Builder / planner).
- Un hook **`.git/hooks/post-merge`** solo se ejecuta tras un **`git merge` / `git pull` que mergee**. El deploy actual usa **`git reset --hard origin/main`**, así que **ese hook no se dispara** en el flujo de Actions.
- **Opciones coherentes:**
  1. Añadir explícitamente `./scripts/index-knowledge.sh` en el **script SSH del workflow** (`deploy.yml`), justo después del `git reset`, y antes o después de `docker compose` (requiere `node` en el PATH del VPS para `generate-knowledge-index.mjs`).
  2. O ejecutar el índice **dentro de un contenedor** que tenga Node, si el host no tiene Node.
  3. Mantener `post-merge` solo para **pulls manuales** con merge en el servidor.

## 4. Comandos útiles en el VPS (cuando SSH responda)

```bash
systemctl list-units --type=service --all | grep -E 'opsly|cursor'
systemctl status opsly-watcher.service
systemctl status cursor-prompt-monitor.service
journalctl -u opsly-watcher.service -n 50 --no-pager
```

Acceso recomendado por **Tailscale** (p. ej. `100.120.151.91`), no solo IP pública.

## Referencias

- `docs/AUTO-PUSH-WATCHER.md` — watcher de docs → GitHub.
- `docs/CONTEXT-BUILDER.md` — índice y variables `KNOWLEDGE_INDEX_PATH`.
- `.github/workflows/deploy.yml` — fetch/reset/compose en el VPS.
