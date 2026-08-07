---
status: draft
owner: operations
last_review: 2026-08-07
type: guide
tags:
  - opsly/development
---

# Git-pull watcher (despertar agentes locales)

Servicio opcional que vigila `origin/<branch>` y, cuando hay commits nuevos,
hace `git pull --ff-only` (vía `scripts/git-sync-repo.sh`) en la máquina
local — para que Cursor u otro agente "despierte" sin que el humano tenga
que ejecutar `git pull` a mano.

**Inverso de [`AUTO-PUSH-WATCHER.md`](AUTO-PUSH-WATCHER.md):** ese vigila
cambios locales y hace push; este vigila el remoto y hace pull.

**No confundir con `cursor-prompt-monitor.sh`:** ese ejecuta contenido de
`docs/ACTIVE-PROMPT.md` como shell (riesgo RCE documentado en `AGENTS.md`).
El git-pull-watcher **no ejecuta nada del remoto** — solo hace `git pull` y
notifica; la tarea se revisa manualmente en `AGENTS.md` (mismo flujo ya
establecido en "Flujo de sesión (humano + Cursor)").

## Cuándo usarlo

- Tu máquina local (`opsly-admin`), el VPS (`vps-dragon`), un worker
  (`opsly-worker` / PC-gamer), o **cualquier máquina nueva que se sume al
  sistema** — el instalador es el mismo en las tres plataformas, solo
  cambia la bandera (ver "Instalación" abajo). No hace falta escribir una
  unidad nueva por host: la unidad `user` es genérica (`%h`).

## Cuándo no usarlo

- Si sueles tener cambios locales sin commitear por periodos largos: el
  watcher no fuerza nada (requiere working tree limpio, igual que
  `git-sync-repo.sh`), pero tampoco podrá traer lo nuevo hasta que
  commitees/stashees.
- Ramas que no sean la que tienes activa en cada máquina — el watcher
  vigila la rama actual del checkout, no una fija salvo que la fuerces con
  `--branch`.

## Instalación

### macOS (`opsly-admin`, tu Mac principal)

```bash
chmod +x scripts/install-git-pull-watcher.sh
./scripts/install-git-pull-watcher.sh --dry-run
./scripts/install-git-pull-watcher.sh
```

Instala un `LaunchAgent` (`~/Library/LaunchAgents/com.opsly.git-pull-watcher.plist`)
que ejecuta `git-pull-watcher.sh --once` cada 60s (`StartInterval`).

Desinstalar:

```bash
launchctl unload ~/Library/LaunchAgents/com.opsly.git-pull-watcher.plist
rm ~/Library/LaunchAgents/com.opsly.git-pull-watcher.plist
```

### Linux — VPS (`vps-dragon`, system, requiere sudo)

```bash
cd /opt/opsly
sudo ./scripts/install-git-pull-watcher.sh
```

Instala `infra/systemd/opsly-git-pull-watcher.service` (fijo a
`vps-dragon:/opt/opsly`) como unidad **system**.

Logs: `journalctl -u opsly-git-pull-watcher.service -f`

### Linux — `opsly-worker` / PC-gamer / **cualquier máquina futura** (user, sin sudo)

Un solo comando sirve para el worker actual y para cualquier máquina que se
sume después al sistema — no hay que tocar código ni crear una unidad nueva
por host:

```bash
# En la máquina nueva, con el repo ya clonado en ~/opsly:
cd ~/opsly
./scripts/install-git-pull-watcher.sh --user
```

Instala `infra/systemd/opsly-git-pull-watcher.user.service` como unidad
**user** de systemd. Esa unidad usa el especificador `%h` (home del usuario
que la corre) en vez de una ruta fija, así que **no necesita editarse por
máquina**: funciona igual en `opsly-worker`, en PC-gamer, o en la próxima
máquina que se agregue, siempre que el repo esté en `~/opsly` (mismo
supuesto que ya usa `docs/04-infrastructure/WORKER-SETUP-MAC2011.md`). Si el
clon está en otra ruta, edita `WorkingDirectory`/`ExecStart` en
`~/.config/systemd/user/opsly-git-pull-watcher.service` tras instalar.

Para que arranque tras reboot sin sesión interactiva (una vez):

```bash
sudo loginctl enable-linger "$(whoami)"
```

Logs: `journalctl --user -u opsly-git-pull-watcher.service -f`

### Manual (cualquier SO, foreground)

```bash
chmod +x scripts/git-pull-watcher.sh
./scripts/git-pull-watcher.sh --dry-run --once
./scripts/git-pull-watcher.sh --poll 60
```

## Comportamiento

- Cada `POLL_SEC` segundos (o una vez, con `--once`) hace `git fetch origin
  <branch>` y compara el SHA local con `origin/<branch>`.
- Si hay commits nuevos y el working tree está limpio, delega en
  `scripts/git-sync-repo.sh` para el pull (mismo script que se usa en
  `opsly-admin`, `opsly-worker` y el VPS — no se reimplementa la lógica de
  sync).
- Tras un pull exitoso, dispara `.githooks/post-merge` (vía hook nativo de
  git) que corre `scripts/git-session-brief.sh` y recuerda revisar
  `AGENTS.md`.
- Con `--notify`, además envía un resumen por Discord vía
  `scripts/notify-discord.sh` (reutiliza la integración existente).

## Opciones

| Flag / env         | Descripción                                              |
| ------------------- | --------------------------------------------------------- |
| `--dry-run`         | Solo loguea; no hace pull                                  |
| `--poll N` / `POLL_SEC` | Segundos entre chequeos (default 60)                   |
| `--branch NAME` / `WATCH_BRANCH` | Rama a vigilar (default: rama actual)         |
| `--once` / `ONCE=true`  | Un solo ciclo y sale (para timers tipo launchd)        |
| `--notify` / `NOTIFY_DISCORD=true` | Notifica por Discord al hacer pull        |

## Solución de problemas

| Síntoma                        | Causa probable                          | Acción                                                    |
| ------------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `Working tree sucio; no se hace pull` | Cambios locales sin commitear      | `git status`, commit/stash, el watcher reintenta solo       |
| No detecta commits nuevos       | Rama vigilada distinta a donde se pushea | Revisa `--branch` / rama activa en esa máquina              |
| `git-sync-repo.sh falló`        | Conflicto, remoto no fast-forward        | Revisa `git status` y `git log` a mano, resuelve y reintenta |
| launchd no corre                | Plist no cargado o ruta `__OPSLY_ROOT__` sin sustituir | Reinstalar con `install-git-pull-watcher.sh`  |

## Referencias

- `scripts/git-pull-watcher.sh`
- `scripts/git-sync-repo.sh` (primitiva de pull reutilizada)
- `.githooks/post-merge` (hook de "despertar", delega en `git-session-brief.sh`)
- `infra/launchd/com.opsly.git-pull-watcher.plist` (macOS, cualquier Mac)
- `infra/systemd/opsly-git-pull-watcher.service` (Linux system — VPS)
- `infra/systemd/opsly-git-pull-watcher.user.service` (Linux user, portable vía `%h` — worker/PC-gamer/futuras máquinas)
- [`AUTO-PUSH-WATCHER.md`](AUTO-PUSH-WATCHER.md) (mecanismo inverso)

---

## Enlaces relacionados

- [[01-development/README|01-development]]
- [[brain/README|Brain Central]]
