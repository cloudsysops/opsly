# Auto-push watcher (docs + `AGENTS.md`)

Servicio opcional que vigila **`docs/`** y **`AGENTS.md`** en el clon de Opsly y, tras un periodo de estabilidad, ejecuta **`git add`**, **`commit`** y **`push`** a **`origin main`**.

**No confundir:** esto **no** es el deploy ni el `git pull` desde GitHub. Para flujo CI → VPS, índice de conocimiento y hooks, ver **`docs/DEPLOY-VPS-AND-INDEX.md`**.

## Cuándo usarlo

- Máquina dedicada (p. ej. VPS) donde solo se editan documentos de contexto para agentes.
- Equipo que quiere que la URL raw de `AGENTS.md` se actualice sin paso manual.

## Cuándo no usarlo

- Repos con **secretos** en `AGENTS.md` o en `docs/` (nunca deben versionarse; el watcher no los filtra).
- Ramas distintas de `main` (el script sale si la rama actual no coincide con `WATCH_BRANCH`).
- Si los **hooks de pre-commit** deben ejecutarse siempre: el commit automático los dispara; si fallan, el push no ocurre salvo que uses `--no-verify` (no recomendado en producción).

## Instalación (VPS Ubuntu, `/opt/opsly`)

1. Asegúrate de que el usuario del servicio puede hacer `git push` (SSH key o credential helper hacia GitHub).
2. Copia la unidad (ajusta `User`/`Group` si no es `vps-dragon`):

   ```bash
   sudo cp /opt/opsly/infra/systemd/opsly-watcher.service /etc/systemd/system/opsly-watcher.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now opsly-watcher.service
   ```

3. Estado y logs:

   ```bash
   systemctl status opsly-watcher.service
   journalctl -u opsly-watcher.service -f
   ```

## Script manual

Desde la raíz del repo:

```bash
chmod +x scripts/auto-push-watcher.sh
./scripts/auto-push-watcher.sh --dry-run
REPO_ROOT="$(pwd)" POLL_SEC=15 DEBOUNCE=5 ./scripts/auto-push-watcher.sh
```

Opciones: `--dry-run`, `--poll N`, `--debounce N`, `--branch main`, `--no-verify`.

## Comportamiento

- Cada **`POLL_SEC`** segundos comprueba si hay cambios en `docs/` o `AGENTS.md`.
- Si hay cambios, espera **`DEBOUNCE`** segundos y vuelve a comprobar; si siguen existiendo, hace commit con mensaje fijo `chore(watch): auto-sync docs and AGENTS.md` y `git push origin main`.

## Solución de problemas

| Síntoma                       | Causa probable                              | Acción                                                       |
| ----------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| `Exiting (no watch)`          | Rama distinta de `main`                     | `git checkout main` o `WATCH_BRANCH` en la unidad            |
| `commit/push failed`          | Hook falla (type-check), auth SSH, o remoto | `journalctl -u opsly-watcher`; probar `git push` manual      |
| Commits vacíos / no hace nada | Sin cambios en rutas vigiladas              | Normal si solo tocas otros paths                             |
| Bucles de commit              | Editor que reescribe archivos al foco       | Aumentar `DEBOUNCE` o excluir herramientas que tocan `docs/` |

## Referencias

- `scripts/auto-push-watcher.sh`
- `infra/systemd/opsly-watcher.service`
- `docs/CLAUDE-WORKFLOW-OPTIMIZATION.md`
