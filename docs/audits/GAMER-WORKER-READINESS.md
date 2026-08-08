---
status: active
owner: operations
last_review: 2026-08-08
type: audit
tags:
  - opsly/worker
  - opsly/gpu
  - opsly/pc-gamer
---

# PC-gamer worker — readiness (2026-08-08)

## Verdict

**READY_FOR_OLLAMA_JOBS** (CPU local; GPU discovery pending)

Money path operativo: BullMQ `ollama` → worker efímero en WSL → `OLLAMA_URL` local (directo) → `llama3.2`.  
Control plane VPS permanece `queue-only`. Peskids no depende de este nodo.

## Evidence

| Check | Result |
|-------|--------|
| Tailscale SSH `pc-gamer` → WSL | OK |
| WSL networking | **NAT** (mirrored rompe loopback Ollama runner) |
| Ollama `/api/tags` | OK (`llama3.2:latest` Q4) |
| Ollama `/api/generate` | OK (`GAMER_OK` / `WORKER_OK` ~3.5s cold-ish) |
| `.env.worker` assert ephemeral | OK |
| `OPSLY_WORKER_ALLOWLIST=ollama` | OK (1 worker) |
| Heartbeat cron + Redis | OK (ioredis) |
| VPS orchestrator | `role=control` `mode=queue-only` |
| Job smoke vía Gateway VPS | **FAIL 503** `free-always` / local provider (esperado: VPS no ve Ollama gamer) |
| Job smoke vía **direct OLLAMA** | **PASS** job `1771` → `content_preview=SMOKE_GAMER_OK`, `direct_ollama=true`, `cost_usd=0` (~4s) |

## Gaps (no bloquean margen local)

1. **GPU:** `nvidia-smi` OK (RTX 5070 Ti); Ollama cae a CPU (CUDA discover timeout en WSL). Throughput menor; costo sigue $0.
2. **Tailscale expose Ollama:** frágil bajo NAT (portproxy). No requerido si jobs van al worker.
3. **Windows native Ollama:** winget source roto en el host; opcional más adelante para GPU nativa.

## Classification

| Antes | Ahora |
|-------|--------|
| READY_TO_CONFIGURE | READY_FOR_OLLAMA_JOBS |

## Relacionado

- `docs/04-infrastructure/PC-GAMER-WORKER.md`
- `docs/runbooks/GAMER-REVENUE-PATH.md`
- `docs/runbooks/VPS-MEMORY-CAPS.md` (VPS ~4 GiB — no builds pesados de día en VPS)
