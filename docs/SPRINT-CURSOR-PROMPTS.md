# Opsly — Cursor Prompts por Sprint

# ====================================

# Cada bloque es el prompt exacto para Cursor al inicio del sprint.

# Claude genera el prompt. Cursor ejecuta autónomamente.

# Cristian: pega el bloque completo en Cursor como contexto inicial.

---

## SPRINT 0 GATE — Lunes 14 abril 11 AM

**Cristian ejecuta (VPS):**

```bash
ssh vps-dragon@100.120.151.91 "echo 'SSH OK'"
doppler secrets get HERMES_ENABLED --project ops-intcloudsysops --config prd --plain
cd /opt/opsly && supabase db push
docker compose -f infra/docker-compose.platform.yml up -d --pull always
```

**Claude ejecuta (local):**

```bash
pnpm run type-check   # target: 13/13 ✅
bash scripts/hermes-smoke-test.sh  # target: health OK
bash scripts/test-hermes-integration.sh  # target: 14/14 ✅
```

**Resultado gate:**

- PASS → Sprint 1 kickoff martes 15 abril
- FAIL → identificar blocker, re-test martes/miércoles

---

## SPRINT 1 — Martes 15 abril → Viernes 18 abril

**Tema: Persistent Hermes State Cache**

```
CONTEXTO: Lee AGENTS.md + docs/HERMES-SPRINT-PLAN.md antes de empezar.

OBJETIVO: Implementar cache persistente de decisiones Hermes.
Sin cache, cada tick re-computa complejidad. Con cache: 80% speedup en tareas repetidas.

ARCHIVOS A CREAR/MODIFICAR:
1. supabase/migrations/0029_hermes_state_cache.sql
   - Tabla hermes_state_cache (id, tenant_id, task_hash, decision jsonb, ttl, created_at)
   - Índice en (tenant_id, task_hash) para lookup O(log n)
   - RLS: tenant solo lee sus propias filas

2. apps/orchestrator/src/core/hermes-state-repo.ts
   - Método getCached(tenantId: string, taskHash: string): Promise<CachedDecision | null>
   - Método setCached(tenantId, taskHash, decision, ttlSeconds): Promise<void>
   - Método invalidate(tenantId, taskHash): Promise<void>
   - Prioridad: Redis hit → Postgres fallback → null
   - Evitar any, usar tipos de @intcloudsysops/types

3. apps/orchestrator/src/workers/hermes-orchestration-worker.ts
   - Antes de computar complejidad: checkear cache
   - Si cache hit: usar decision directamente (log "cache_hit")
   - Si cache miss: computar + guardar en cache con TTL 1h
   - Meter evento: usageEventsMeter.record('cache_hit' | 'cache_miss')

4. apps/orchestrator/src/workers/hermes-orchestration-worker.test.ts
   - test: "cache hit returns cached decision without LLM call"
   - test: "cache miss computes and stores decision"
   - test: "Redis unavailable falls back to Postgres cache"
   - test: "cache invalidation removes entry"

PATRONES OBLIGATORIOS:
- Repository pattern para acceso a Supabase
- TenantContext.getOrThrow() para tenant isolation
- withCircuitBreaker() para llamadas externas
- No añadir dependencias nuevas (usar redis, @supabase/supabase-js existentes)

COMMIT TARGET:
"feat(hermes): persistent state cache Redis→Postgres (migration 0029)"

GATE: pnpm run type-check 13/13 ✅ + test suite 18/18 ✅
```

---

## SPRINT 2 — Lunes 21 abril → Viernes 25 abril

**Tema: Adaptive Multi-Worker Routing + Auto-Approval**

```
CONTEXTO: Lee AGENTS.md + ADR-021 (approval gate) antes de empezar.
Sprint 1 (cache) debe estar mergeado y en main.

OBJETIVO: Hermes decide autónomamente a qué worker enrutar y si auto-aprobar.
Core del "Opsly magic": sistema decide sin intervención humana cuando confianza > 95%.

ARCHIVOS A CREAR/MODIFICAR:
1. apps/orchestrator/src/core/hermes-routing-strategy.ts
   - Interface HermesRoutingStrategy { route(task, context): Promise<RoutingDecision> }
   - RoutingDecision enum: WORKER_N8N | WORKER_UPTIME | WORKER_STRIPE | APPROVAL_GATE | REJECT | SCHEDULE
   - DefaultRoutingStrategy: implementa reglas L1/L2/L3 + confianza
   - Reglas:
     * complexity L1 + confidence > 0.95 → auto-execute (WORKER_*)
     * complexity L2 + confidence 0.70-0.95 → APPROVAL_GATE
     * complexity L3 → APPROVAL_GATE siempre
     * confidence < 0.40 → REJECT con reason
     * scheduled task → SCHEDULE (defer a maintenance window)

2. apps/orchestrator/src/core/worker-selector.ts
   - Mapeo: keywords → worker target
   - n8n: "webhook", "automation", "workflow", "trigger"
   - uptime-kuma: "monitor", "health", "uptime", "alert"
   - stripe: "invoice", "payment", "subscription", "billing"
   - Fallback: APPROVAL_GATE si no hay match claro

3. apps/orchestrator/src/workers/approval-gate-worker.ts (extend)
   - Añadir: rejectWithReason(taskId, reason): Promise<void>
   - Añadir: scheduleForWindow(taskId, window): Promise<void>
   - Emit Discord notification en rejection

4. Tests (22/22):
   - test: "L1 high-confidence routes to correct worker"
   - test: "L2 medium-confidence goes to approval gate"
   - test: "L3 always requires approval"
   - test: "low confidence rejects with explanation"
   - test: "scheduled task defers to maintenance window"
   - test routing matrix: 4 workers × confidence levels

PATRONES OBLIGATORIOS:
- Strategy pattern para HermesRoutingStrategy (pluggable para Sprint 5)
- No hardcodear worker names, usar enum RoutingDecision
- TenantContext para isolation, withCircuitBreaker para worker calls

COMMIT TARGET:
"feat(hermes): adaptive routing + auto-approval/rejection (Sprint 2)"

GATE: pnpm run type-check 13/13 ✅ + test suite 22/22 ✅
```

---

## SPRINT 3 — Lunes 28 abril → Viernes 2 mayo

**Tema: RAG + pgvector Embeddings**

```
CONTEXTO: Lee AGENTS.md + ADR-018 (pgvector) antes de empezar.
Sprints 1+2 deben estar en main.

OBJETIVO: Hermes enriquece decisiones con contexto histórico vía RAG.
Accuracy de routing mejora ~40% vs cold-start.

ARCHIVOS A CREAR/MODIFICAR:
1. supabase/migrations/0030_pgvector_setup.sql
   - CREATE EXTENSION IF NOT EXISTS vector
   - Tabla hermes_embeddings (id, tenant_id, content_type, content_hash, embedding vector(1536), metadata jsonb)
   - Índice ivfflat para cosine similarity (lists=100)
   - RLS: tenant solo accede sus embeddings

2. apps/ml/src/embedding-generator.ts
   - generateEmbedding(text: string): Promise<EmbeddingResult>
   - Usa Claude Embeddings API (text-embedding-3-small, 1536 dims)
   - Cache embeddings por content_hash (Redis, TTL 24h)
   - Batch support: generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]>

3. apps/orchestrator/src/core/hermes-rag-retriever.ts
   - retrieve(tenantId, taskText): Promise<RAGContext>
   - RAGContext: { similarDecisions, successTemplates, tenantProfile }
   - Cosine similarity, top-5, threshold 0.82
   - Enriquecer contexto de decisión Hermes con resultados

4. apps/orchestrator/src/workers/hermes-orchestration-worker.ts (integrate)
   - Antes de routing decision: llamar RAG retriever
   - Pasar RAGContext al complexity scorer como contexto adicional
   - Log: "rag_enriched: true/false" en cada tick

5. Tests (26/26):
   - test embedding generation (mock API)
   - test RAG retrieval cosine similarity
   - test decision enrichment changes routing outcome
   - test cache hit avoids duplicate embedding API call
   - test tenant isolation (tenant A no ve embeddings de tenant B)

PATRONES OBLIGATORIOS:
- withCircuitBreaker() para llamadas a embedding API
- TenantContext para isolation estricta
- Repository pattern para hermes_embeddings

COMMIT TARGET:
"feat(ml): pgvector RAG + embedding-based Hermes context (Sprint 3)"

GATE: pnpm run type-check 13/13 ✅ + test suite 26/26 ✅
```

---

## SPRINT 4 — Lunes 5 mayo → Viernes 9 mayo

**Tema: Observabilidad + Prometheus Metrics**

```
CONTEXTO: Lee AGENTS.md + ADR-019 (Prometheus) antes de empezar.
Grafana + Prometheus ya están en docker-compose.platform.yml (desde 2026-04-12).
Solo falta instrumentar los servicios.

OBJETIVO: Dashboard live con métricas reales. SLA visible en tiempo real.

ARCHIVOS A CREAR/MODIFICAR:
1. apps/orchestrator/src/monitoring/prometheus-exporter.ts
   - Singleton PrometheusExporter
   - Métricas:
     * hermes_tick_duration_seconds (Histogram, labels: tenant)
     * hermes_tasks_total (Counter, labels: tenant, worker, status)
     * circuit_breaker_state (Gauge, labels: provider, tenant)
     * llm_request_duration_seconds (Histogram, labels: provider, model)
     * hermes_cache_hits_total (Counter, labels: tenant)
     * tenant_usage_units_total (Counter, labels: tenant, feature)
   - Exponer /metrics en ORCHESTRATOR_HEALTH_PORT (3011)

2. apps/llm-gateway/src/monitoring/prometheus-exporter.ts
   - llm_gateway_requests_total (Counter, labels: provider, model, status)
   - llm_gateway_tokens_total (Counter, labels: provider, model, type)
   - llm_gateway_cost_usd_total (Counter, labels: provider, model)
   - Exponer /metrics en LLM_GATEWAY_PORT (3010)

3. apps/orchestrator/src/workers/*.ts (wire metrics)
   - hermes-orchestration-worker: record tick duration + task outcome
   - approval-gate-worker: record approvals/rejections
   - CircuitBreaker: emit state changes to gauge

4. infra/monitoring/grafana/dashboards/opsly-workers.json
   - Queue depth (hermes, approval-gate)
   - Task throughput (tasks/min per worker)
   - Circuit breaker state timeline
   - LLM cost per hour (running total)

5. infra/monitoring/grafana/dashboards/opsly-tenants.json
   - Usage por tenant (tasks, tokens, cost)
   - Error rate por tenant
   - p50/p95/p99 latency

6. infra/monitoring/prometheus-alerts.yml
   - HighErrorRate: > 5% errors → Discord alert
   - CircuitBreakerOpen: any provider → Discord alert
   - HighQueueDepth: > 100 pending → Discord alert

7. Tests (28/28):
   - test metrics are emitted on tick execution
   - test circuit breaker state gauge reflects state
   - test /metrics endpoint is accessible

PATRONES OBLIGATORIOS:
- Singleton exporter (init once, use everywhere)
- Labels deben incluir tenant_id para multi-tenant filtering
- No block execution path on metrics failure (try/catch, log error)

COMMIT TARGET:
"feat(observability): prometheus metrics + grafana dashboards (Sprint 4)"

GATE: pnpm run type-check 13/13 ✅ + test suite 28/28 ✅ + grafana.domain live
```

---

## SPRINT 5 — Lunes 12 mayo → Viernes 16 mayo

**Tema: Multi-Provider LLM Routing**

```
CONTEXTO: Lee AGENTS.md antes de empezar. ADR-020 (orchestrator/worker separation) relevante.
Sprints 1-4 deben estar en main.

OBJETIVO: Routear tareas LLM al proveedor óptimo (costo + calidad).
L1→Llama (free), L2→Haiku ($cheap), L3→Sonnet/Mistral ($smart).
Cost reducción estimada: 70% sin sacrificar calidad.

ARCHIVOS A CREAR/MODIFICAR:
1. apps/llm-gateway/src/providers/llm-provider.interface.ts
   - Interface LLMProvider { name, complete(prompt, options): Promise<LLMResponse> }
   - LLMResponse: { text, tokens, cost, latency, provider }
   - ProviderHealth: { available, errorRate, avgLatency, lastCheck }

2. apps/llm-gateway/src/providers/claude-provider.ts (refactor existing)
   - Migrar llamadas actuales a Claude al nuevo interface
   - Implementar health tracking (rolling window 5min)

3. apps/llm-gateway/src/providers/haiku-provider.ts
   - claude-haiku-4-5 para tareas L2
   - 4× más rápido y 10× más barato que Sonnet

4. apps/llm-gateway/src/providers/openrouter-provider.ts
   - OpenRouter API (Mistral 7B, Llama 3.1 70B)
   - Fallback cuando Claude rate-limited
   - Track cost per token por modelo

5. apps/llm-gateway/src/llm-router.ts
   - LLMRouter.route(complexity: L1|L2|L3, context): Promise<LLMProvider>
   - Reglas:
     * L1 → openrouter (Llama, free tier)
     * L2 → haiku (cheap, fast)
     * L3 → sonnet (smart) o mistral (si sonnet down)
   - Health check antes de routear (failover si provider unhealthy)
   - Track cost running total (alerta si > $X/día)

6. Tests (32/32):
   - test L1 routes to cheapest provider
   - test L2 routes to haiku
   - test L3 routes to sonnet
   - test provider failover on health degradation
   - test cost tracking accumulation
   - test routing matrix: 3 complexity levels × provider availability

PATRONES OBLIGATORIOS:
- Strategy pattern (LLMProvider interface pluggable)
- withCircuitBreaker() en cada provider
- Health check cache (Redis, TTL 30s) para evitar re-check en cada request

COMMIT TARGET:
"feat(llm-gateway): multi-provider routing with cost tracking (Sprint 5)"

GATE: pnpm run type-check 13/13 ✅ + test suite 32/32 ✅ + cost dashboard live
```

---

## SPRINT 6 — Lunes 19 mayo → Lunes 26 mayo

**Tema: MVP Polish + First Paying Customer**

```
CONTEXTO: Lee AGENTS.md + VISION.md completos antes de empezar.
Todos los sprints 1-5 deben estar en main.

OBJETIVO: smiletripcare como primer cliente pagador en Stripe.
E2E: signup → primera automatización → factura generada.

DELIVERABLES (en orden):

1. E2E TEST SUITE (apps/api/tests/e2e/)
   - tenant-signup.e2e.ts: signup → primer workspace → primer agente
   - first-automation.e2e.ts: crear tarea → Hermes procesa → resultado OK
   - billing-cycle.e2e.ts: usage → metering → invoice Stripe generada
   - Playwright para flows de UI si aplica

2. BILLING PIPELINE (completar)
   - UsageEventsMeter.flush() → Stripe Usage Records
   - Webhook Stripe: invoice.created → notify Discord
   - Limite de uso por plan (free: 100 tasks/mes, pro: unlimited)
   - Rate limiting per-tenant (Redis token bucket)

3. ERROR HANDLING AUDIT
   - Revisar todos los try/catch en apps/orchestrator
   - Añadir error context (tenantId, taskId, worker) en cada catch
   - Structured error types (AppError, TenantError, ProviderError)
   - No exponer stack traces en responses de API

4. SECURITY AUDIT (OWASP Top 10)
   - A01: Broken Access Control → verificar RLS en todas las tablas
   - A02: Cryptographic Failures → verificar que secrets no aparecen en logs
   - A03: Injection → verificar que inputs se sanitizan antes de LLM
   - A05: Security Misconfiguration → verificar headers Traefik (CSP, HSTS)
   - A09: Security Logging → verificar que todos los 401/403 se loguean

5. PERFORMANCE TUNING
   - Load test: k6 con 100 usuarios concurrentes, 10min
   - Target: p99 < 500ms en /api/health y /api/tasks
   - Identificar y fix top-3 bottlenecks
   - Connection pooling Supabase (PgBouncer si necesario)

6. DOCUMENTACIÓN FINAL
   - docs/API.md: OpenAPI/Swagger auto-generado
   - docs/ADMIN-MANUAL.md: setup, monitoring, runbooks
   - docs/TENANT-GUIDE.md: onboarding, primeros pasos

COMMIT TARGET (serie):
"feat(billing): complete Stripe usage pipeline"
"test(e2e): full tenant workflow + billing cycle"
"security: OWASP audit + hardening"
"docs: API + admin manual + tenant guide"
"perf: p99 < 500ms load test passed"
"chore: Sprint 6 complete — MVP ready 🚀"

GATE FINAL (Lunes 26 mayo 5 PM):
✅ type-check 13/13
✅ test suite 40/40 + E2E suite passing
✅ smiletripcare activo en Stripe con primera factura
✅ Dashboard Grafana mostrando p99 < 500ms
✅ 0 secrets en logs (grep verificado)
✅ LISTO PARA LAUNCH 🚀
```

---

## RESUMEN DE GATES

| Sprint | Fecha      | Tests       | Gate                      |
| ------ | ---------- | ----------- | ------------------------- |
| S0     | Lun 14 abr | 14/14       | VPS live + smoke ✅       |
| S1     | Vie 18 abr | 18/18       | Cache hit/miss ✅         |
| S2     | Vie 25 abr | 22/22       | Auto-routing matrix ✅    |
| S3     | Vie 2 may  | 26/26       | RAG retrieval ✅          |
| S4     | Vie 9 may  | 28/28       | Grafana dashboard live ✅ |
| S5     | Vie 16 may | 32/32       | Cost dashboard live ✅    |
| S6     | Lun 26 may | 40/40 + E2E | MVP launch 🚀             |
