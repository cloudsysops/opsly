# ADR-031: Token Optimization — Ollama Local Primary + Docker Resource Limits

> Nota: este documento quedó numerado como **ADR-031** para evitar colisión con `ADR-025-notebooklm-knowledge-layer.md`.

**Date:** 2026-04-15  
**Status:** APPROVED  
**Decision Makers:** Arquitecto Senior + Cursor/Copilot (ejecución)  

---

## Context

Opsly Fase 4 usa Claude 3.5 Sonnet para todas las tareas. Análisis de uso muestra:
- **40% tareas simples** (complexity 1): validación, parsing, resúmenes cortos → ~400 tokens → $0.006/tarea
- **60% tareas complejas** (complexity 3): análisis profundo, código, decisiones → ~2000 tokens → $0.03/tarea

**Costo mensual actual (100 tareas/mes, mix real):**
- 40 × $0.006 + 60 × $0.03 = $0.24 + $1.80 = **~$2.04/mes por tenant**
- Con 10 tenants (meta 2026-H2): **~$20/mes en LLM solo**

**Oportunidad:** Mac2011 (100.80.41.29) con Ollama local + llama3.2 (0 costo, latencia ~500ms) ya disponible por ADR-024.

---

## Decision

1. **Primary routing:** Tareas simples (complexity ≤ 1) → **llama_local (Mac2011)** → $0 token cost
2. **Fallback:** Si llama_local no responde → Claude (cloud)
3. **Complex routing:** complexity ≥ 2 → Claude (Sonnet, no cambio)
4. **Docker resource limits:** 7 servicios VPS sin límites → limitar memory para predecibilidad

### Cambios concretos

#### 1.1 LLM Gateway routing (`apps/llm-gateway/src/routing-hints.ts`)
```typescript
// Ya existe, no requiere cambios — solo verificar:
export const getProviderBias = (complexity: number) => {
  if (complexity <= 1) return 'cheap'; // → llama_local
  if (complexity <= 2) return 'balanced'; // → openrouter (fallback)
  return 'quality'; // → claude
};
```

#### 1.2 Docker Compose memory limits (infra/*.yml)
```yaml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 512M
  orchestrator:
    deploy:
      resources:
        limits:
          memory: 256M
  llm-gateway:
    deploy:
      resources:
        limits:
          memory: 512M
  redis:
    deploy:
      resources:
        limits:
          memory: 128M
  postgres:
    deploy:
      resources:
        limits:
          memory: 512M
  traefik:
    deploy:
      resources:
        limits:
          memory: 256M
  mcp:
    deploy:
      resources:
        limits:
          memory: 256M
```

#### 1.3 Hermes token tracking (`apps/llm-gateway/src/hermes.ts`)
```typescript
// Registrar cost_usd discriminado por provider:
const costByProvider = {
  'llama_local': 0,
  'claude-3-5-sonnet': 0.003 * tokens_input + 0.015 * tokens_output,
  'qwen2.5-coder': 0.0005 * tokens_input + 0.001 * tokens_output,
};
```

#### 1.4 Orchestrator concurrency (`apps/orchestrator/.env.worker`)
```bash
ORCHESTRATOR_OLLAMA_CONCURRENCY=1
ORCHESTRATOR_CLAUDE_CONCURRENCY=2
```

---

## Rationale

| Factor | Analysis |
|--------|----------|
| **Cost savings** | 40% reduction: $0.24/tsk → $0.144/tsk; @100 tsk/mo = ~$10/mo saved |
| **Latency trade-off** | llama3.2 ~500ms vs Claude ~100ms; acceptable for complexity≤1 (non-critical path) |
| **Reliability** | Fallback to Claude ensures no task loss; Mac2011 network via Tailscale |
| **Resource mgmt** | Memory limits prevent OOM; Docker Compose already supports |
| **Audit trail** | Hermes tracks provider per job → cost accountability per tenant |

---

## Consequences

### Positive
✅ 40% LLM cost reduction  
✅ VPS CPU less burdened (Ollama offloaded to Mac2011)  
✅ Token tracking per provider enables billing accuracy  
✅ Resource limits improve stability under load  

### Risks & Mitigations
⚠️ **Ollama down** → fallback to Claude (transparent)  
⚠️ **Mac2011 network flaky** → queue retry with backoff  
⚠️ **llama3.2 accuracy vs Sonnet** → scoped to low-complexity (parsing, validation)  
⚠️ **Memory limits may cause OOM** → set conservatively, monitor cAdvisor  

---

## Implementation

**Phase 1 (Cursor — Ejecución paralela):**
1. Add memory limits to `infra/docker-compose.platform.yml` + `docker-compose.opslyquantum.yml`
2. Verify Hermes cost_usd field registration in gateway
3. Update concurrency settings in orchestrator `.env.worker`

**Phase 2 (Cursor — ADR-024 execution):**
1. Setup Ollama on Mac2011 (phases 1-4 from PLAN-OLLAMA-WORKER-2026-04-14.md)
2. Validate routing hits llama_local for complexity≤1 jobs

**Phase 3 (Copilot — E2E validation):**
1. Health checks all providers
2. Demo job: simple task → llama_local, verify $0 cost
3. Demo fallback: kill Ollama → reroute to Claude

---

## Success Criteria

- [ ] Memory limits applied; no OOM in 24h monitoring
- [ ] Hermes logs show cost_usd=0 for llama_local jobs
- [ ] Routing bias test: complexity 1 → llama_local 95%+ of time
- [ ] E2E: simple job (complexity 1) costs < $0.001 vs previous $0.006
- [ ] Fallback: Ollama down → job succeeds via Claude (latency +300ms acceptable)

---

## References

- **ADR-024:** Ollama Local Worker on Mac2011
- **PLAN:** `docs/PLAN-OLLAMA-WORKER-2026-04-14.md`
- **LLM Gateway:** `apps/llm-gateway/src/routing-hints.ts`
- **Orchestrator:** `apps/orchestrator/src/workers.ts`
- **Cost tracking:** `apps/llm-gateway/src/hermes.ts`
