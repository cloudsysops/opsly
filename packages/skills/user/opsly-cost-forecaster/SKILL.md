# Opsly Cost Forecaster

> **Triggers:** `predict cost`, `forecast billing`, `token burn`, `lmm spending`, `cost analysis`, `presupuesto`, `proyectar gasto`
> **Priority:** CRITICAL
> **Category:** ai / billing
> **Skills relacionados:** `opsly-billing`, `opsly-llm`, `opsly-telemetry`, `opsly-economist`

## Propósito

Predecir costos de infraestructura e IA (tokens LLM, compute, storage) con 30-90 días de anticipación. Permite a operaciones:

- Alertar antes de sorpresas de factura
- Recomendaciones de ahorro (proveedor, modelo, batching)
- Capacity planning (¿cuándo upgraar infraestructura?)
- ROI por agente (¿vale la pena ejecutar este agente?)

## Cuándo usar

- Admin dashboard requests "forecast monthly costs"
- Operations team planning budget for next quarter
- Tenant onboarding (proyectar costo por tenant)
- LLM Gateway logging token usage (agrega datos históricos)
- Stripe webhook (new invoice detected, compare to forecast)

## Flujo

### 1. Recolectar datos históricos

Fuentes:

- `openclaw_llm_tokens_consumed` (Prometheus) — tokens por proveedor/modelo
- Doppler `ops-intcloudsysops/prd` — active LLM providers + models + pricing
- Stripe API — recent invoices (last 90 days)
- Database — tenant count, agent frequency

Métricas críticas:

```
llm_tokens_per_day = sum(tokens) / days_in_period
compute_monthly = VPS_monthly_cost (DigitalOcean)
storage_monthly = Supabase + S3 + backups
```

### 2. Calcular tokens por modelo

Usar `anthropic-token-counter` (si Claude), `tiktoken` (si OpenAI), estimaciones (otros modelos):

```typescript
const tokenCost = (model: string, tokens: number) => {
  const prices: Record<string, {input: number, output: number}> = {
    "claude-opus": { input: 0.015/1M, output: 0.075/1M },
    "gpt-4": { input: 0.03/1K, output: 0.06/1K },
    // ... actualizar con precios reales
  }
  return tokens * (prices[model]?.input || 0)
}
```

### 3. Proyectar 30/60/90 días

Asumir:

- Token usage crece 5-10% MoM (start conservador, ajustar con datos)
- New tenants = +2-3 token/day por tenant (benchmark)
- Modelo switching = recalcular (si cambias Claude → GPT-4, +50% token cost)

Fórmula simple:

```
forecast_day_N = avg_daily_spend * (1 + growth_rate) ^ (N/30)
forecast_month = sum(forecast_day_1...forecast_day_30)
```

### 4. Generar recomendaciones

**Si forecast > budget:**

1. "Switch 30% of queries to Claude Haiku (50% token cost, 85% quality)" → Est. savings: $150/mo
2. "Batch small queries (10x throughput, same cost)" → Est. savings: $200/mo
3. "Cache repeated queries (LLM Gateway cache hit rate)" → Est. savings: $300/mo
4. "Recommend Claude Sonnet for lower-priority agents" → Est. savings: $400/mo

**Si forecast < budget:**

1. "Headroom $X — can safely add Y new agents"
2. "Consider premium model (Claude Opus for higher accuracy on critical tasks)"

### 5. Output format

```json
{
  "forecast_period": "2026-05-09 to 2026-06-08",
  "current_monthly_spend": 2400,
  "forecast_30d": 2520,
  "forecast_60d": 2650,
  "forecast_90d": 2800,
  "confidence": 0.72,
  "breakdown": {
    "llm_tokens": 1800,
    "compute": 400,
    "storage": 200
  },
  "alerts": ["⚠️ Token spend +12% MoM — if trend continues, will exceed annual budget by Q4"],
  "recommendations": [
    {
      "action": "Switch 30% queries to Haiku",
      "estimated_savings": 150,
      "effort": "low",
      "confidence": "high"
    },
    {
      "action": "Enable query caching",
      "estimated_savings": 300,
      "effort": "medium",
      "confidence": "medium"
    }
  ],
  "next_review": "2026-05-23"
}
```

## Implementación

### Requisitos

- Prometheus access (`openclaw_llm_tokens_consumed` metric)
- Doppler read (pricing data)
- Stripe API token (recent invoices)
- Supabase query (tenant telemetry)

### Scripts

- `forecast.ts` — Main forecast engine
- `token-counter.ts` — Per-model token cost calculation
- `recommendations.ts` — Savings suggestions algorithm

### Test cases

1. Historical accuracy: Compare past forecast vs. actual spend (should be ±15%)
2. Edge cases: New tenant onboarded mid-month, model price changed
3. Budget scenarios: Low spend ($500/mo), high spend ($10k+/mo)

## Ejemplos de uso

```
claude: "Forecast my monthly LLM costs for next 90 days"
→ Loads Prometheus metrics, Stripe invoices, generates forecast + recommendations

admin: "Can we afford to add 3 more agents?"
→ Cost-forecaster calculates token impact, shows budget headroom

ops: "Why did our bill jump 40%?"
→ Compares forecast vs. actual, identifies caused (new agent, model change, etc.)
```

## Integración

- **Admin Dashboard** — Display forecast in /costs page
- **Discord Webhook** — Alert when forecast exceeds 80% of budget
- **Stripe** — Trigger when actual invoice > forecast + 10%
- **Scheduler** — Run forecast weekly (Sundays 00:00 UTC)

## Métricas de éxito

- Forecast accuracy (MAPE) > 85% (Mean Absolute Percentage Error)
- Zero surprise invoices (prediction catches 100% of overages)
- Recommendations save $2k+ per tenant annually
- Adoption: 80%+ of tenants view forecast monthly
