---
status: active
owner: operations
last_review: 2026-08-07
type: infrastructure
tags:
  - opsly/infrastructure
  - opsly/worker
  - opsly/gpu
  - opsly/security
---

# PC-gamer — worker efímero (best-effort)

Máquina **prestada / reemplazable** de cómputo GPU para Opsly.  
**No es control plane. No es necesaria para que producción funcione.**

## Topología

```text
Mac (opsly-admin / Cursor)
        │  Tailscale SSH only
        ▼
PC-gamer (Windows + WSL Ubuntu) ── worker BullMQ + Ollama GPU
        │  REDIS_URL / LLM_GATEWAY_URL por Tailscale
        ▼
VPS vps-dragon (100.120.151.91) ── control plane siempre ON
        Traefik · API · Redis BullMQ · Peskids · queue-only orchestrator
```

| Host | Rol | Si se apaga |
|------|-----|-------------|
| VPS | Control plane | Outage (único SPOF aceptado) |
| PC-gamer | Worker efímero | Jobs GPU esperan o caen a cloud; **Peskids sigue** |
| Mac | IDE / Doppler | Sin impacto runtime |

Conector: **Tailscale + Redis VPS + LLM Gateway**. Sin Swarm. Sin segundo orchestrator.

## Reglas no negociables

1. **No** SSH a Internet; **no** abrir puerto 22 en el router.
2. Preferir **Tailscale** (`Host pc-gamer` → user `devops` → `wsl -d Ubuntu`).
3. **No** almacenar en el PC: Doppler master/service tokens, AWS/GCP admin, `SUPABASE_SERVICE_ROLE_KEY` de prod, secretos de clientes, claves SSH productivas, GitHub PAT amplios, `PLATFORM_ADMIN_TOKEN`, Stripe live.
4. Credenciales de **mínimo privilegio**: solo `REDIS_URL` (password de cola) + URLs Tailscale del gateway.
5. El nodo **puede desaparecer** sin romper Opsly (fail-open prod).
6. **No** desplegar producción desde este PC.
7. **No** acceso directo a bases productivas (ni service role).
8. **No** PII de clientes persistente en disco del gamer.
9. Jobs LLM de plataforma pasan por Gateway; **excepción documentada:** worker efímero con `OPSLY_OLLAMA_DIRECT` / `OLLAMA_URL` local ($0). OpenCode overnight usa CLI local, no el Gateway.
10. **No** crear otro control plane / orchestrator / Redis de prod en el gamer.
11. **No** encolar trabajo delicado si el nodo está offline (`check-pc-gamer-online.sh`).

Validación local de `.env.worker`:

```bash
./scripts/ops/assert-ephemeral-worker-env.sh
```

## Qué sí corre aquí (valor)

| Carga | Notas |
|-------|--------|
| Inferencia GPU (Ollama) | Best-effort; heartbeat + allowlist `ollama` |
| Entrenador / eval de agentes | Lotes offline: traces → critique → sandbox; no decide tráfico cliente |
| Builds / tests pesados | Opcional; no CI de merge a `main` de prod |
| Shadow A/B local vs cloud | Métricas; sin cutover automático |
| **Overnight OpenCode** | Bridge `:5004` + cola `local-agents`; worktree `~/opsly-overnight` — [`OVERNIGHT-OPENCODE-GAMER.md`](../runbooks/OVERNIGHT-OPENCODE-GAMER.md) |

## Qué no corre aquí

- Peskids leads / WhatsApp / edge Traefik
- Deploy GHCR / `peskids-deploy-vps`
- Self-heal / auto-deploy / cost-gate mutando prod
- Notify Discord operativo crítico como único canal
- `PLATFORM_ADMIN_TOKEN` / Doppler master (encolar solo desde Mac)

## Bootstrap canónico — Docker plane (recomendado)

Cuando el PC está **encendido + Tailscale**, el plano durable es Docker (Ollama + worker). Si está apagado, Peskids sigue; solo se difiere trabajo GPU.

**Desde el gamer (WSL):**

```bash
cd ~/opsly
git pull --ff-only origin feat/pc-gamer-worker-plane
# .env.worker ya con REDIS_URL (Doppler)
./scripts/ops/pc-gamer-docker-plane.sh --up --pull-model --install-autostart
# Overnight OpenCode (opcional):
./scripts/ops/pc-gamer-opencode-plane.sh --up --install-autostart
sudo loginctl enable-linger devops   # una vez
```

**Desde Mac cuando vuelve online:**

```bash
./scripts/ops/check-pc-gamer-online.sh --json
# si ssh=true pero online=false, o tras boot:
./scripts/ops/pc-gamer-reconnect.sh --wait 600 --pull-model
# + agentes overnight:
./scripts/ops/pc-gamer-reconnect.sh --wait 600 --pull-model --with-opencode
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/enqueue-overnight-opencode.sh --prompt "…"
```

Autostart: user systemd `opsly-pc-gamer-docker.service` + timer heartbeat (+ `opsly-opencode-bridge` si overnight).  
Fallback nativo (sin Docker): `systemctl --user enable --now opsly-worker-openclaw` + Ollama apt — ver histórico; **preferir Docker**.

```bash
# Legacy one-liner (sigue válido)
./scripts/setup-pc-gamer-worker.sh --stop-legacy --ensure-ollama --ensure-worker --pull-model
```

Variables clave en `.env.worker`:

- `OPSLY_EPHEMERAL_WORKER=true` — rechaza rol control/full; **también activa Ollama directo** (`OLLAMA_URL`) sin pasar por el Gateway del VPS
- `OPSLY_WORKER_ALLOWLIST=ollama` — GPU only; overnight: `ollama,local-agents` (vía `pc-gamer-opencode-plane.sh`)
- `OPSLY_OPENCODE_AGENT_URL=http://127.0.0.1:5004` + `OPSLY_CLI_AGENT_TOKEN` — bridge OpenCode (no admin token)
- `OLLAMA_URL=http://127.0.0.1:11434` — inferencia local (margen $0)
- `LLM_GATEWAY_URL=http://100.120.151.91:3010` — opcional / metering; no requerido para jobs `ollama` en modo efímero
- `OPSLY_OLLAMA_DIRECT=true` — fuerza ruta directa aunque no sea efímero

## Enviar trabajo solo si está disponible

Desde Mac / VPS (antes de encolar GPU o trainer):

```bash
./scripts/ops/check-pc-gamer-online.sh && echo "encolar ollama" || echo "diferir / cloud"
./scripts/ops/check-pc-gamer-online.sh --json
```

Criterio: `/health` del worker **o** heartbeat Redis fresco. Si ambos fallan → **no** mandar trabajo delicado.

VPS orchestrator debe permanecer en **`queue-only` / `control`** (ADR-020) para no robar la cola.

## Verificar

```bash
curl -sf http://127.0.0.1:3011/health   # role=worker mode=worker-enabled
curl -sf http://127.0.0.1:11434/api/tags
# Mac:
curl -sf --max-time 5 "http://100.74.88.103:3011/health"
./scripts/ops/check-pc-gamer-online.sh
```

Doppler `prd` (humano, opcional): `OLLAMA_URL` en el **Gateway VPS** solo si Ollama del gamer es alcanzable por Tailscale. Por defecto el money path **no** depende de eso: el worker efímero llama `OLLAMA_URL` local directo.

## Ollama en WSL (NAT, no mirrored)

**Crítico:** `networkingMode=mirrored` en `.wslconfig` rompe el loopback TCP dentro de WSL. Ollama arranca el runner en `127.0.0.1:<port>` y el padre **no puede hablarle** → load cuelga hasta timeout.

Usar NAT (default):

```ini
[wsl2]
memory=16GB
processors=8
swap=4GB
```

Luego `wsl --shutdown` desde Windows y reiniciar Ubuntu. Verificar:

```bash
# debe imprimir OK en <1s
python3 -c "import socket; s=socket.socket(); s.bind(('127.0.0.1',19999)); s.listen(1)" &
sleep 0.2; python3 -c "import socket; print(socket.create_connection(('127.0.0.1',19999),3))"
curl -sf http://127.0.0.1:11434/api/tags
```

Bind local (worker en la misma WSL):

```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
printf '%s\n' '[Service]' 'Environment=OLLAMA_HOST=127.0.0.1:11434' 'Environment=OLLAMA_ORIGINS=*' \
  | sudo tee /etc/systemd/system/ollama.service.d/override.conf
sudo systemctl daemon-reload && sudo systemctl restart ollama
```

Exponer Ollama al Gateway VPS por Tailscale es **opcional** (portproxy Windows↔WSL frágil bajo NAT). Preferir jobs BullMQ + worker local.

## .wslconfig (Windows) — canónico

```ini
[wsl2]
memory=16GB
processors=8
swap=4GB
```

**No** usar `networkingMode=mirrored` mientras Ollama corra en WSL.

## Archivos

| Path | Uso |
|------|-----|
| `infra/pc-gamer.env.example` | Plantilla mínima privilegio |
| `infra/docker-compose.pc-gamer-workers.yml` | Worker BullMQ (host network) |
| `scripts/ops/pc-gamer-docker-plane.sh` | Up/down + autostart Docker |
| `scripts/ops/pc-gamer-opencode-plane.sh` | Bridge OpenCode + allowlist overnight |
| `scripts/ops/enqueue-overnight-opencode.sh` | Mac → encolar `local_opencode` |
| `scripts/ops/pc-gamer-reconnect.sh` | Mac → SSH → levantar plano (+ `--with-opencode`) |
| `scripts/setup-pc-gamer-worker.sh` | Bootstrap (delega a docker plane) |
| `scripts/ops/pc-gamer-heartbeat.sh` | TTL heartbeat Redis |
| `scripts/ops/check-pc-gamer-online.sh` | Gate antes de encolar |
| `scripts/ops/assert-ephemeral-worker-env.sh` | Anti secretos maestros |
| `OPSLY_WORKER_ALLOWLIST` | Filtra workers en `apps/orchestrator` |
| `scripts/ops/pc-gamer-schedule.sh` | Modo gaming/light/heavy según Mauro |
| `config/pc-gamer-schedule.json` | Calendario semanal (DRAFT) |
| `docs/runbooks/PC-GAMER-MAURO-SCHEDULE.md` | Cómo ajustar horas con el dueño |
| `docs/runbooks/OVERNIGHT-OPENCODE-GAMER.md` | Runbook crecimiento overnight |

## Relacionado

- ADR-020 control ↔ worker plane
- ADR-024 Ollama worker
- `docs/03-agents/LOCAL-AGENT-EXECUTION.md`
- `docs/04-infrastructure/WORKER-SETUP-MAC2011.md`
- `docs/04-infrastructure/TAILSCALE-NOMENCLATURA.md`
- `docs/runbooks/VPS-MEMORY-CAPS.md`
- `docs/runbooks/PRODUCTION-CHANGE-WINDOW.md`
- `docs/runbooks/OVERNIGHT-OPENCODE-GAMER.md`
- `docs/runbooks/PC-GAMER-MAURO-SCHEDULE.md`
