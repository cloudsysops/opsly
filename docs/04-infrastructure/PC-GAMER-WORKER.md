---
status: active
owner: operations
last_review: 2026-08-07
type: infrastructure
tags:
  - opsly/infrastructure
  - opsly/worker
  - opsly/gpu
---

# PC-gamer — worker plane (Docker + Tailscale)

Máquina de **trabajo / GPU** para ampliar capacidad sin tocar el control plane del VPS.

## Roles (no mezclar)

| Host | Tailscale | Rol |
|------|-----------|-----|
| VPS | `vps-dragon` `100.120.151.91` | **Siempre ON** — Traefik, API, admin/Moon, portal, Redis BullMQ, Peskids |
| PC-gamer | `pc-gamer` `100.74.88.103` | **Best-effort** — Ollama GPU + workers BullMQ |
| Mac | `opsly-quantum` / opsly-admin | IDE Cursor, Doppler, git |

Conector entre hosts: **Tailscale + Redis/BullMQ del VPS + LLM Gateway**. No Docker Swarm entre máquinas (prohibido sin ADR).

Nombre Tailscale: mantener **`pc-gamer`** (no renombrar a `opsly-worker` sin OK humano — ese nombre aún apunta al Mac 2011 offline). SSH: `Host pc-gamer` → user `devops` → luego `wsl -d Ubuntu`.

## Stack en WSL2 (estado 2026-08-07)

```text
ollama.service (systemd)     ← nativo; CUDA RTX 5070 Ti; modelo llama3.2
opsly-worker-openclaw        ← BullMQ worker-enabled → REDIS_URL VPS (:3011 /health)
Docker                       ← listo; demos nginx/portainer/redis legacy eliminados
```

Ollama nativo ya detecta la GPU (no hace falta contenedor para inferencia). Compose GPU queda para quien prefiera Ollama en Docker tras `scripts/install-nvidia-ctk-wsl.sh`.

Archivos:

- `infra/docker-compose.opslyquantum.yml` — Ollama base (Docker opcional)
- `infra/docker-compose.opslyquantum.gpu.yml` — `gpus: all`
- `infra/docker-compose.pc-gamer-workers.yml` — workers en Docker (alt. a nativo)
- `infra/pc-gamer.env.example` → `.env.worker` (gitignored)
- `scripts/setup-pc-gamer-worker.sh`
- `scripts/install-nvidia-ctk-wsl.sh`

## Bootstrap (en WSL Ubuntu del gamer)

```bash
# 1) Repo (público)
git clone --branch feat/pc-gamer-worker-plane --single-branch \
  https://github.com/cloudsysops/opsly.git ~/opsly
cd ~/opsly

# 2) Secrets (desde Mac con Doppler; no pegar en chat)
cp infra/pc-gamer.env.example .env.worker
# REDIS_URL desde: doppler secrets get REDIS_URL --project ops-intcloudsysops --config prd --plain

# 3) Limpiar demos + deps + worker nativo
./scripts/setup-pc-gamer-worker.sh --stop-legacy
npx turbo run build --filter=@intcloudsysops/orchestrator...
./scripts/start-worker.sh   # o systemctl --user enable --now opsly-worker-openclaw

# 4) Ollama: ya instalado como systemd; pull modelo si falta
ollama pull llama3.2

# 5) Exponer Ollama a Tailscale (sudo una vez)
sudo mkdir -p /etc/systemd/system/ollama.service.d
printf '%s\n' '[Service]' 'Environment=OLLAMA_HOST=0.0.0.0:11434' 'Environment=OLLAMA_ORIGINS=*' \
  | sudo tee /etc/systemd/system/ollama.service.d/override.conf
sudo systemctl daemon-reload && sudo systemctl restart ollama
```

## Verificar

```bash
# GPU (nativo)
journalctl -u ollama -n 20 --no-pager   # debe mencionar RTX / CUDA

# APIs locales
curl -sf http://127.0.0.1:11434/api/tags
curl -sf http://127.0.0.1:3011/health

# Desde Mac por Tailscale
curl -sf --max-time 5 "http://100.74.88.103:3011/health"
curl -sf --max-time 5 "http://100.74.88.103:11434/api/tags"   # tras paso 5

# Worker logs
tail -f ~/opsly/runtime/logs/worker-openclaw.log
```

Doppler `prd` (humano): `OLLAMA_URL=http://100.74.88.103:11434` cuando el gamer esté online (ADR-024). Si el gamer se apaga, el gateway hace fallback cloud — VPS sigue vivo.

## .wslconfig (Windows)

```ini
[wsl2]
memory=16GB
processors=8
swap=4GB
localhostForwarding=true
# Expone puertos WSL en la IP Tailscale de Windows (recomendado PC-gamer)
networkingMode=mirrored
```

(Ajustar a 12GB si juegas a la vez.)

## Multi-trabajador

| Servicio | Qué hace |
|----------|----------|
| `worker-openclaw` | Jobs BullMQ (ollama, n8n, notify, …) contra Redis VPS |
| `worker-openclaw-replica` (`--profile split`) | Segunda réplica; bajar concurrencia antes de activar |
| Ollama | Inferencia local GPU; jobs `ollama` / routing `cheap` |

Cursor IDE: Remote-SSH → `pc-gamer` → WSL Ubuntu (`~/opsly`). Ya existe `.cursor-server` en el home WSL.

## Seguridad

- No exponer 11434 / workers a Internet; solo Tailscale.
- No Redis BullMQ local “de prod”.
- Secrets solo Doppler → `.env.worker`.
- Parar nginx/portainer legacy que publican 80/443 en WSL.

## Relacionado

- ADR-024 Ollama worker
- `docs/04-infrastructure/WORKER-SETUP-MAC2011.md` (mismo patrón, otro hardware)
- `docs/04-infrastructure/TAILSCALE-NOMENCLATURA.md`
- `docs/runbooks/VPS-MEMORY-CAPS.md` — VPS saturado → offload aquí
