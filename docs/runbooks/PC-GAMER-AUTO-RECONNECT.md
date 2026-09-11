---
status: active
owner: operations
last_review: 2026-09-11
type: runbook
tags:
  - opsly/runbook
  - opsly/pc-gamer
  - opsly/autonomy
---

# PC-gamer — auto-reconnect (Mac LaunchAgent)

Cuando el PC-gamer se enciende y Tailscale vuelve, **no hace falta** que un humano o Cursor esté despierto.

## Qué hace

`com.opsly.pcgamerwatch` (cada **120s**):

1. Si `pc-gamer` está **offline** → sale en silencio.
2. Si Tailscale OK pero `check-pc-gamer-online.sh` no reporta `online:true` → corre:
   ```bash
   PC_GAMER_BRANCH=main ./scripts/ops/pc-gamer-reconnect.sh \
     --wait 120 --use-host-ollama --with-opencode --pull-model
   ```
3. Notifica macOS + Discord (si Doppler/`notify-discord.sh` disponibles).
4. Tras **5 fallos** seguidos → deja de reintentar hasta reset de estado.

## Instalar / reparar (Mac opsly-admin)

```bash
REPO="${OPSLY_ROOT:-$HOME/cboteros/proyectos/intcloudsysops}"
cd "$REPO"
test -x scripts/ops/pc-gamer-watch.sh || { echo "missing watch.sh — pull main"; exit 1; }

sed "s|__OPSLY_ROOT__|$REPO|g" infra/launchd/com.opsly.pcgamerwatch.plist \
  > ~/Library/LaunchAgents/com.opsly.pcgamerwatch.plist

# Reset fail counter
mkdir -p ~/Library/Logs/opsly
echo 0 > ~/Library/Logs/opsly/pc-gamer-watch.state

launchctl bootout "gui/$(id -u)/com.opsly.pcgamerwatch" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/com.opsly.pcgamerwatch.plist
launchctl kickstart -k "gui/$(id -u)/com.opsly.pcgamerwatch"
```

## Logs

| Path | Contenido |
|------|-----------|
| `~/Library/Logs/opsly/pc-gamer-watch.log` | Decisiones + reconnect |
| `~/Library/Logs/opsly/pc-gamer-watch.launchd.log` | stdout/stderr LaunchAgent |
| `~/Library/Logs/opsly/pc-gamer-watch.state` | Contador de fallos |

## Forzar una pasada

```bash
./scripts/ops/pc-gamer-watch.sh --force
```

## Relacionado

- `scripts/ops/pc-gamer-reconnect.sh` (default branch **main**)
- `docs/04-infrastructure/PC-GAMER-WORKER.md`
- `docs/design/AUTONOMOUS-INCOME-SERVICES.md`
- Autodispatch overnight: `docs/runbooks/PC-GAMER-OVERNIGHT-AUTODISPATCH.md` (capa distinta: encola trabajo cuando ya está sano)

## Docker name Conflict (stale container)

If reconnect logs `Conflict. The container name "/opsly-pc-gamer-worker-openclaw" is already in use`, tip `main` `pc-gamer-docker-plane.sh` removes non-running name collisions before `compose up` and retries once with `--force-recreate`.
