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
9. **No** bypass del LLM Gateway (jobs `ollama` → `LLM_GATEWAY_URL` → providers).
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

## Qué no corre aquí

- Peskids leads / WhatsApp / edge Traefik
- Deploy GHCR / `peskids-deploy-vps`
- Self-heal / auto-deploy / cost-gate mutando prod
- Notify Discord operativo crítico como único canal

## Bootstrap (WSL Ubuntu)

```bash
git clone --branch feat/pc-gamer-worker-plane --single-branch \
  https://github.com/cloudsysops/opsly.git ~/opsly
cd ~/opsly

cp infra/pc-gamer.env.example .env.worker
# Rellenar REDIS_URL=redis://default:<pass>@100.120.151.91:6379/0 desde Doppler (Mac)
./scripts/ops/assert-ephemeral-worker-env.sh

./scripts/setup-pc-gamer-worker.sh --stop-legacy
npx turbo run build --filter=@intcloudsysops/orchestrator...
./scripts/start-worker.sh
# o: systemctl --user enable --now opsly-worker-openclaw

ollama pull llama3.2
# Opcional Tailscale bind (sudo):
# OLLAMA_HOST=0.0.0.0:11434 override systemd — ver sección Ollama abajo

# Heartbeat cada minuto (user cron)
crontab -l 2>/dev/null | grep -q pc-gamer-heartbeat || \
  (crontab -l 2>/dev/null; echo '* * * * * cd ~/opsly && ./scripts/ops/pc-gamer-heartbeat.sh >/dev/null 2>&1') | crontab -
```

Variables clave en `.env.worker`:

- `OPSLY_EPHEMERAL_WORKER=true` — rechaza rol control/full
- `OPSLY_WORKER_ALLOWLIST=ollama` — no compite por jobs ajenos
- `LLM_GATEWAY_URL=http://100.120.151.91:3010`

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

Doppler `prd` (humano, opcional): `OLLAMA_URL=http://100.74.88.103:11434` solo con Ollama en `0.0.0.0`. Si gamer off → gateway fallback cloud.

## Ollama en Tailscale (sudo una vez)

```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
printf '%s\n' '[Service]' 'Environment=OLLAMA_HOST=0.0.0.0:11434' 'Environment=OLLAMA_ORIGINS=*' \
  | sudo tee /etc/systemd/system/ollama.service.d/override.conf
sudo systemctl daemon-reload && sudo systemctl restart ollama
```

## .wslconfig (Windows)

```ini
[wsl2]
memory=16GB
processors=8
swap=4GB
localhostForwarding=true
networkingMode=mirrored
```

## Archivos

| Path | Uso |
|------|-----|
| `infra/pc-gamer.env.example` | Plantilla mínima privilegio |
| `scripts/setup-pc-gamer-worker.sh` | Bootstrap Docker/legacy |
| `scripts/ops/pc-gamer-heartbeat.sh` | TTL heartbeat Redis |
| `scripts/ops/check-pc-gamer-online.sh` | Gate antes de encolar |
| `scripts/ops/assert-ephemeral-worker-env.sh` | Anti secretos maestros |
| `OPSLY_WORKER_ALLOWLIST` | Filtra workers en `apps/orchestrator` |

## Relacionado

- ADR-020 control ↔ worker plane
- ADR-024 Ollama worker
- `docs/04-infrastructure/WORKER-SETUP-MAC2011.md`
- `docs/04-infrastructure/TAILSCALE-NOMENCLATURA.md`
- `docs/runbooks/VPS-MEMORY-CAPS.md`
- `docs/runbooks/PRODUCTION-CHANGE-WINDOW.md`
