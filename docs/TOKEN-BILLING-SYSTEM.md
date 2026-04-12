# Sistema de tokens y billing — diseño y estado en Opsly

> **Estado actual (código):** facturación y límites de uso IA pasan por **LLM Gateway** en **USD** y **tokens reales de proveedor**, con **planes** (`startup` / `business` / `enterprise`), **`PLAN_BUDGETS`** en `apps/llm-gateway/src/budget.ts`, presupuesto opcional por tenant (`tenant_budgets`), y **`usage_events`** en Supabase.  
> **Estado “wallet prepago en tokens abstractos”** (cargar saldo → N tokens → debitar por tarea): **no implementado**; este documento sirve de **especificación de producto** y de alineación con optimizaciones ya existentes (caché, routing).

## Flujo de dinero (visión producto)

```
┌─────────────────────────────────────────────────────────────┐
│  HOY: Suscripción / Stripe + límites por plan + USD usage   │
│  FUTURO (opcional): Prepago → créditos “tokens” internos     │
├─────────────────────────────────────────────────────────────┤
│  Medición real: cost_usd + tokens (proveedor) en usage_events │
│  Gateway: caché Redis + cadena de modelos + routing_bias     │
│  Alertas: umbral presupuesto (portal), Discord (gateway)      │
└─────────────────────────────────────────────────────────────┘
```

Si en el futuro se introduce **prepago**, los “tokens” del cliente pueden ser **unidades de cuenta** derivadas de USD (ej. 1 USD = 100 créditos) **sin** sustituir la contabilidad real en USD de los proveedores.

## Lo que ya optimiza costos (implementado)

| Mecanismo | Dónde |
|-----------|--------|
| Caché por hash + tenant | `apps/llm-gateway` — `LLM_CACHE_TTL_SECONDS` |
| Cadena de proveedores (cheap → Haiku → Sonnet) | `llmCall` / `buildChain` |
| `routing_bias`: `cost` \| `balanced` \| `quality` | `LLM-GATEWAY.md`, `routing-hints.ts` |
| Límites por plan (tokens/coste mensual) | `PLAN_BUDGETS` en `budget.ts` |
| Forzar modelo barato al acercarse al tope | `force_cheap` en `BudgetStatus` |
| Presupuesto mensual USD por tenant | `tenant_budgets` + API portal budget |

## Jerarquía de modelos (orientativa)

Los nombres comerciales del prompt (GPT-4o, Gemini, etc.) son **ejemplos**. En el repo los hints son **`cheap`**, **`haiku`**, **`sonnet`**, más Ollama local — ver tabla en `docs/LLM-GATEWAY.md`.

| Tier conceptual | Rol | Equivalente Opsly |
|-----------------|-----|-------------------|
| FREE / barato | Consultas simples, caché | `cheap`, Ollama, cache hit |
| MEDIO | Refactors moderados | Haiku, OpenRouter económico |
| ALTO | Arquitectura, código complejo | Sonnet, GPT-4o según cadena |
| PREMIUM | Crítico (si política lo permite) | Extremo de cadena + `quality` |

**Default “barato”:** ya se favorece cuando `routing_bias` es `cost` o cuando el presupuesto fuerza `force_cheap`.

## Tokens abstractos (ejemplo del prompt)

Si se implementara wallet prepago, una tabla **orientativa** podría mapear **tareas** → **créditos internos** (no confundir con tokens de facturación de Anthropic/OpenAI):

| Operación | Créditos ejemplo | Nota |
|-----------|------------------|------|
| Consulta con cache hit | 0 | Ya ahorra coste real |
| Tarea simple (cheap) | 0–5 créditos | |
| Tarea media | 10–20 | |
| Tarea compleja | 50–200 | Confirmación antes de gastar |

**Regla:** los créditos deberían derivarse de **coste USD esperado** o de tokens de proveedor, no de números fijos sin calibración.

## Alertas de consumo

**Hoy:** `BudgetStatus.warn_threshold`, `force_cheap`, presupuesto portal (`alert_threshold_pct`), notificaciones Discord en el gateway.

**Roadmap tipo prompt:** umbrales 50 % / 75 % / 90 % / 100 % sobre **saldo prepago** — requiere producto + persistencia + ADR.

## Dashboard

- Uso LLM por tenant: admin / métricas existentes; portal: `LlmUsageCard` + `GET /api/portal/tenant/.../usage`.
- Un “wallet” de créditos prepago **no** está en el admin hasta existir API y datos.

## Referencias

- `docs/LLM-GATEWAY.md`
- `docs/TOKEN-SYSTEM-GUIDE.md` (guía corta)
- `docs/WORKER-TEAM-BILLING.md`
- `docs/adr/ADR-016-worker-teams-billing-roadmap.md`
- `docs/adr/ADR-017-prepaid-token-wallet-roadmap.md`
- `apps/llm-gateway/src/budget.ts`
