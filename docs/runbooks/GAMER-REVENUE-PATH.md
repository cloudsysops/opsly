---
status: active
owner: operations
last_review: 2026-08-08
type: runbook
tags:
  - opsly/worker
  - opsly/revenue
  - opsly/pc-gamer
---

# PC-gamer — revenue path (margen LLM local)

Objetivo: bajar costo de tokens en tareas agency/internal **sin** minar crypto y **sin** romper Peskids.

## Flujo de dinero (margen)

```text
Cliente / agency task / smoke
        │
        ▼
VPS orchestrator (queue-only) ── enqueue job name=ollama
        │  Redis Tailscale
        ▼
PC-gamer worker (allowlist=ollama)
        │  OPSLY_EPHEMERAL_WORKER + OLLAMA_URL
        ▼
Ollama local (CPU hoy / GPU cuando CUDA WSL OK)  → cost_usd ≈ 0
```

No usar el Gateway VPS como path crítico para estos jobs: el perfil `free-always` exige `llama_local` sano en el VPS, y el Ollama del gamer **no** es visible allí por defecto.

## Preflight (1 min)

```bash
# Mac
./scripts/ops/check-pc-gamer-online.sh

# En gamer WSL
curl -sf http://127.0.0.1:11434/api/tags
curl -sf http://127.0.0.1:3011/health   # role=worker
./scripts/ops/assert-ephemeral-worker-env.sh
./scripts/ops/pc-gamer-heartbeat.sh
```

VPS debe seguir `OPSLY_ORCHESTRATOR_MODE=queue-only`.

## Encolar trabajo barato

Desde VPS (token admin en contenedor, no pegar en chat):

```bash
docker exec -e BODY='{"tenant_slug":"peskids","prompt":"…","plan":"startup","request_id":"rev-…","model":"llama3.2"}' \
  opsly_orchestrator node -e '/* POST /internal/enqueue-ollama with PLATFORM_ADMIN_TOKEN */'
```

O scripts repo: `scripts/enqueue-ollama-squad.ts` / `create-ollama-local-agents.sh` apuntando al orchestrator interno.

Éxito: `returnvalue` con `content_preview` no vacío y `direct_ollama: true` / `cost_usd: 0`.

## Qué monetiza aquí

| Sí | No |
|----|----|
| Resúmenes / drafts agency | Leads WhatsApp Peskids |
| Clasificación / critique offline | Deploy prod / GHCR |
| Eval de agentes / shadow A/B | Secretos master en el PC |
| Builds pesados opcionales (noche) | Exponer Ollama a Internet |

## Si el gamer se apaga

Heartbeat TTL expira → `check-pc-gamer-online.sh` falla → **no** encolar GPU; cloud/Gateway según política tenant. Prod Peskids sigue en VPS.

## Capacidad VPS

Alerta memoria VPS activa (~4 GiB): no mover builds Docker del gamer al VPS de día. Ver `docs/runbooks/VPS-MEMORY-CAPS.md`.
