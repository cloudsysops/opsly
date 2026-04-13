# Plan de Trabajo — LLM Gateway

**Objetivo:** Endurecer el LLM Gateway para producción multi-tenant conobservabilidad, caching y budget controls.

---

## Fase 1: Observabilidad (1 semana)

### 1.1 Métricas mejoradas

- [ ] `logUsage` ya inserta en `usage_events` — verificar que todos los campos del `UsageEvent` estén cubiertos
- [ ] Añadir `request_id` y `session_id` a `usage_events` schema (migración SQL)
- [ ] Exportar métrica `llm_call_complete` + `llm_call_error` en `structured-log.ts` con campos completos

### 1.2 Health checks

- [ ] `HealthDaemon` ya monitoriza providers — añadir `/health` endpoint público en gateway
- [ ] Métricas por provider: latency p50/p99, errores, rate limits

### 1.3 Logging estructurado

- [ ] `logGatewayEvent` ya cubre `llm_call_complete/error` — ampliar con `intent`, `quality_score`, `routing_bias`

**Validación:** `npm run type-check --workspace=@intcloudsysops/llm-gateway`

---

## Fase 2: Cache (1 semana)

### 2.1 Semantic cache

- [ ] `semanticCacheGetExact` + `semanticCacheGetSimilar` — revisar similarity threshold (0.9)
- [ ] TTL configurable por tenant plan
- [ ] Métricas de hit rate por tenant

### 2.2 Redis

- [ ] Verificar `getCacheStats` en `index.ts`
- [ ] Fallback si Redis no disponible

**Validación:** test de integración con embeddings

---

## Fase 3: Budget (1 semana)

### 3.1 Budget por tenant

- [ ] `budget.ts` ya tiene `checkBudget` y `resolveTenantPlan`
- [ ] Añadir `force_cheap` cuando budget próximo a agotarse
- [ ] Notificaciones Discord antes de reach limit

### 3.2 Rate limiting

- [ ] Implementar rate limit por tenant (req/min)
- [ ] Circuit breaker por provider (ya existe parcialmente)

**Validación:** simulate budget exhaustion + verify 429 response

---

## Fase 4: Routing (1 semana)

### 4.1 Provider selection

- [ ] `router.ts` tiene `selectModel` + `MODEL_CONFIG`
- [ ] `routing_bias` ya parsea query/headers
- [ ] Fallback chain (`fallback-chain.ts`)

### 4.2 Quality scoring

- [ ] `quality-scorer.ts` — integrar en pipeline v3 (línea 180-192)
- [ ] Retry logic con Sonnet si score < 60

**Validación:** test con prompts de baja calidad

---

## Fase 5: Testing + CI (1 semana)

### 5.1 Unit tests

- [ ] `gateway.test.ts` — mock de `llmCall` y `logUsage`
- [ ] `logger.test.ts` — test de agregación de uso
- [ ] `router.test.ts` — test de selección de modelo

### 5.2 Integration tests

- [ ] E2E con Supabase real (test tenant)
- [ ] Test de cache hit/miss

### 5.3 CI

- [ ] Añadir `test:coverage` en `package.json`
- [ ] GitHub Actions: test + coverage badge

---

## Dependencias

| Dependencia      | Ubicación             | Estado |
| ---------------- | --------------------- | ------ |
| Supabase         | `supabase-helpers.ts` | ✅     |
| Redis            | `cache.ts`            | ✅     |
| Providers        | `providers.ts`        | ✅     |
| Budget           | `budget.ts`           | ✅     |
| Semantic cache   | `semantic-cache.ts`   | ✅     |
| Intent detection | `intent-detector.ts`  | ✅     |
| Context enricher | `context-enricher.ts` | ✅     |
| Quality scorer   | `quality-scorer.ts`   | ✅     |

---

## Scripts útiles

```bash
# Type-check
npm run type-check --workspace=@intcloudsysops/llm-gateway

# Test
npm run test --workspace=@intcloudsysops/llm-gateway

# Coverage
npm run test:coverage --workspace=@intcloudsysops/llm-gateway
```

---

## Archivo de referencia

- `docs/IMPLEMENTATION-IA-LAYER.md` — arquitectura LLM Gateway
- `docs/LLM-GATEWAY.md` — documentación detallada
- `ROADMAP.md` —timeline semanal

---

## Próximo paso inmediato

Ejecutar `npm run type-check --workspace=@intcloudsysops/llm-gateway` para verificar estado actual.
