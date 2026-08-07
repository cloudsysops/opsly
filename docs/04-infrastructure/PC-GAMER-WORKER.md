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

## Stack Docker en WSL2

```text
opslyquantum-ollama     ← GPU (RTX) via compose GPU override
opsly-pc-gamer-worker-openclaw  ← orchestrator worker-enabled → REDIS_URL VPS
(+ profile split)       ← segunda réplica opcional
```

Archivos:

- `infra/docker-compose.opslyquantum.yml` — Ollama base
- `infra/docker-compose.opslyquantum.gpu.yml` — `gpus: all`
- `infra/docker-compose.pc-gamer-workers.yml` — workers
- `infra/pc-gamer.env.example` → `.env.worker` (gitignored)
- `scripts/setup-pc-gamer-worker.sh`

## Bootstrap (en WSL Ubuntu del gamer)

```bash
# 1) Repo
git clone git@github.com:cloudsysops/opsly.git ~/opsly
cd ~/opsly && git checkout feat/pc-gamer-worker-plane   # o main tras merge

# 2) NVIDIA Container Toolkit (una vez, requiere sudo)
#    https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html
#    Luego: sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker

# 3) Secrets (desde Mac con Doppler; no pegar en chat)
cp infra/pc-gamer.env.example .env.worker
# REDIS_URL=… desde: doppler secrets get REDIS_URL --project ops-intcloudsysops --config prd --plain

# 4) Limpiar demos viejos (nginx:80/443, portainer) y levantar músculo
./scripts/setup-pc-gamer-worker.sh --stop-legacy --ensure-ollama --pull-model
./scripts/setup-pc-gamer-worker.sh --ensure-worker
```

Desde la Mac:

```bash
ssh pc-gamer "wsl -d Ubuntu -- bash -lc 'cd ~/opsly && ./scripts/setup-pc-gamer-worker.sh --ensure-ollama'"
```

## Verificar

```bash
# GPU en contenedor
docker exec opslyquantum-ollama nvidia-smi

# API Ollama
curl -sf http://127.0.0.1:11434/api/tags

# Desde VPS / Mac por Tailscale
curl -sf --max-time 5 "http://100.74.88.103:11434/api/tags"

# Worker consume cola (logs)
docker logs -f opsly-pc-gamer-worker-openclaw
```

Doppler `prd` (humano): `OLLAMA_URL=http://100.74.88.103:11434` cuando el gamer esté online (mismo patrón ADR-024). Si el gamer se apaga, el health daemon del gateway hace fallback cloud — VPS sigue vivo.

## .wslconfig (Windows)

```ini
[wsl2]
memory=16GB
processors=8
swap=4GB
localhostForwarding=true
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
