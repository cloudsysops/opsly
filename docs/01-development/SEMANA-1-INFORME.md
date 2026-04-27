# Semana 1 — Routing y costes visibles — COMPLETADO

**Periodo:** 2026-04-14 → 2026-04-20  
**Fecha realización:** 2026-04-15  
**Commit base:** 3780f01

## Objetivo Logrado

Implementar metering unificado con trazabilidad end-to-end: cada evento LLM registra `tenant_slug` + `request_id` + costos.

## Tareas Ejecutadas

### 1. ✅ Revisión cadena de proveedores (COMPLETADO)

- `apps/llm-gateway/src/providers.ts`: 6 proveedores definidos (Anthropic Haiku/Sonnet, Ollama, OpenRouter, OpenAI Mini/4o)
- `apps/llm-gateway/src/llm-direct.ts`: Routing con fallback, health checks integrados
- `apps/llm-gateway/src/health-daemon.ts`: Daemon completo con circuit breaker (3 fallos = down), notificaciones Discord

**Status:** ✅ Cadena de proveedores coherente y monitoreada

### 2. ✅ Metering unificado (COMPLETADO)

#### 2.1 Schema Updated

- **Migración SQL:** `/opt/opsly/supabase/migrations/0034_usage_events_add_request_id.sql`
  - Agrega columna `request_id TEXT` a tabla `platform.usage_events`
  - Índice en `request_id` para correlación con logs de orchestrator
  - Grants actualizados para `service_role`

#### 2.2 TypeScript Types

- **Archivo:** `/opt/opsly/apps/llm-gateway/src/types.ts:90`
- **Cambio:** `UsageEvent` interface ahora incluye `request_id?: string`
- **Validación:** Type-check ✅ PASS

#### 2.3 Gateway Implementation

- **Archivo:** `/opt/opsly/apps/llm-gateway/src/llm-direct.ts:201-211`
- **Cambio:** `logUsage()` ahora recibe `request_id` de `LLMRequest`
- **Correlación:** Cada evento se registra con:
  - `tenant_slug` (identificación de tenant)
  - `request_id` (correlación con orquestador)
  - `model`, `tokens_input`, `tokens_output`, `cost_usd`, `cache_hit`
  - `session_id`, `created_at`

**Flujo End-to-End:**

```
LLMRequest(tenant_slug, request_id, ...)
  ↓ (llmCallDirect)
→ runProvider(...) → finalizeSuccess()
  ↓ (logUsage)
→ Supabase platform.usage_events
  (tenant_slug, request_id, model, costs, ...)
```

### 3. ✅ Tests Regresión (COMPLETADO)

**File:** `/opt/opsly/apps/llm-gateway/__tests__/gateway.test.ts`

- **Test agregado:** "registra request_id en logUsage para trazabilidad"
  - Verifica que `logUsage()` reciba `request_id` correctamente
  - Valida que eventos incluyan `tenant_slug` y `request_id`

**Resultados:**

```
Test Files  12 passed (12)
Tests       56 passed (56)
Duration    14.08s
```

## Checkpoints ✅

| Check            | Resultado | Evidencia                                  |
| ---------------- | --------- | ------------------------------------------ |
| UsageEvent type  | ✅ PASS   | types.ts:90                                |
| Migration SQL    | ✅ PASS   | 0034_usage_events_add_request_id.sql       |
| logUsage() calls | ✅ PASS   | llm-direct.ts:201-211                      |
| Gateway tests    | ✅ PASS   | 56/56 tests                                |
| Type-check       | ✅ PASS   | turbo type-check --filter=llm-gateway      |
| Health checks    | ✅ PASS   | health-daemon.ts (all providers monitored) |

## Impacto

### Observabilidad Mejorada

- **Antes:** Logs de costos sin correlación con requests
- **Después:** Eventos con request_id permiten trazar cada LLM call → orchestrator logs → decisiones del planner

### Readiness para Fase 2

- ✅ Metering coherente (tenant_slug + request_id)
- ✅ Health monitoring de cadena de proveedores
- ✅ Tests de regresión verdes (baseline para cambios futuros)
- ✅ Zero breaking changes en API

## Próximas Semanas (ROADMAP)

- **Semana 2:** Planner + workers + NotebookLM (límites por plan)
- **Semana 3:** Context Builder + continuidad de sesiones
- **Semana 4:** Cost transparency en admin dashboard
- **Semana 5:** Feedback loop (producto)
- **Semana 6:** Segundo cliente + validación E2E

---

**Ejecutado por:** Claude Haiku  
**Branch:** main  
**Commit:** 3780f01
