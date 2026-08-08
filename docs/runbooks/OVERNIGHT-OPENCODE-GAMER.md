---
status: active
owner: operations
last_review: 2026-08-08
type: runbook
tags:
  - opsly/worker
  - opsly/opencode
  - opsly/overnight
---

# Overnight growth — PC-gamer + OpenCode

Objetivo: mientras duermes o buscas clientes, el **PC-gamer** ejecuta tareas de construcción (OpenCode) en paralelo al money path Ollama ($0), sin tocar el VPS de día ni Peskids.

## Capacidad VPS

Alerta memoria VPS **activa** (~4 GiB). No builds pesados en el VPS de día. Detalle: [`VPS-MEMORY-CAPS.md`](./VPS-MEMORY-CAPS.md).

## Flujo

```text
Mac (Doppler + encolar)
   │  PLATFORM_ADMIN_TOKEN → POST VPS :3011 /api/local/prompt-submit
   ▼
VPS Redis BullMQ (cola local-agents)     ← control plane siempre ON
   │
   ▼
PC-gamer worker (allowlist ollama,local-agents)
   │  HTTP + Bearer OPSLY_CLI_AGENT_TOKEN
   ▼
Bridge OpenCode :5004 (WSL host) → worktree ~/opsly-overnight
```

| Pieza | Dónde | Secretos |
|-------|--------|----------|
| Encolar | Mac / opsly-admin | `PLATFORM_ADMIN_TOKEN` (Doppler) |
| Worker | Gamer Docker | `REDIS_URL` + `OPSLY_CLI_AGENT_TOKEN` (local) |
| OpenCode CLI | Gamer WSL host | Sin Doppler master / Stripe / Supabase service role |

`enqueue-overnight-opencode.sh` respeta el **calendario Mauro** (`config/pc-gamer-schedule.json`): en ventana `gaming`/`light` bloquea OpenCode salvo `--force`. Detalle: [`PC-GAMER-MAURO-SCHEDULE.md`](./PC-GAMER-MAURO-SCHEDULE.md).

## Una vez en el gamer (WSL)

```bash
cd ~/opsly
git pull --ff-only origin feat/pc-gamer-worker-plane
# .env.worker ya con REDIS_URL
./scripts/ops/pc-gamer-docker-plane.sh --up --pull-model
./scripts/ops/pc-gamer-opencode-plane.sh --up --install-autostart
# opcional overnight sin prompts interactivos (cwd allowlist obligatorio):
# ./scripts/ops/pc-gamer-opencode-plane.sh --up --skip-permissions --install-autostart
```

Requisitos: `opencode` en PATH de WSL, Docker, Tailscale, Node.

## Desde Mac (cada noche / al despertar el PC)

```bash
./scripts/ops/check-pc-gamer-online.sh --json
# si offline → enciende PC; luego:
./scripts/ops/pc-gamer-reconnect.sh --wait 600 --pull-model --with-opencode

doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/enqueue-overnight-opencode.sh \
  --prompt "Escribe tests Vitest para lib/X; no tocar apps/peskids ni infra de deploy"

# o carpeta de prompts:
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/enqueue-overnight-opencode.sh --queue-dir .cursor/prompts/queue
```

## Qué sí / no

**Sí:** tests, refactors acotados, docs, skills, PRs en rama `overnight/pc-gamer` o feat hijas.  
**No:** merge a `main` de día con impacto prod, deploy Peskids, secretos maestros en el gamer, `PLATFORM_ADMIN_TOKEN` en `.env.worker`.

## Verificar

```bash
# Gamer
curl -sf http://127.0.0.1:5004/health
curl -sf http://127.0.0.1:3011/health
./scripts/ops/pc-gamer-opencode-plane.sh --status

# Mac
./scripts/ops/check-pc-gamer-online.sh --json
```

## Archivos

| Path | Rol |
|------|-----|
| `scripts/ops/pc-gamer-opencode-plane.sh` | Bridge + allowlist + worktree |
| `scripts/ops/enqueue-overnight-opencode.sh` | Encola desde Mac |
| `scripts/ops/pc-gamer-reconnect.sh --with-opencode` | Levanta Docker + OpenCode al volver |
| `infra/pc-gamer.env.example` | Plantilla allowlist overnight |
| `docs/04-infrastructure/PC-GAMER-WORKER.md` | Worker efímero general |

## Relacionado

- [`LOCAL-AGENT-EXECUTION.md`](../03-agents/LOCAL-AGENT-EXECUTION.md)
- [`GAMER-REVENUE-PATH.md`](./GAMER-REVENUE-PATH.md)
- [`PRODUCTION-CHANGE-WINDOW.md`](./PRODUCTION-CHANGE-WINDOW.md)
