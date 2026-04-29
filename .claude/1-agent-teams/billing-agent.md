# BillingAgent — Facturación

Gestiona suscripciones Stripe, metering LLM y alertas de costos.

## Triggers
- `POST /api/admin/costs` — registrar decisión aprobación/rechazo
- `usage_events` insert — metering automático
- `GET /api/admin/costs` — dashboard admin
- `GET /api/portal/usage` — métricas tenant (sesión)

## Acciones

### Planes (ver `apps/web/lib/stripe/plans.ts`)
- **Startup**: $29/mo — 3 agents, 10k tokens/mo
- **Business**: $99/mo — 10 agents, 100k tokens/mo, NotebookLM
- **Enterprise**: Custom — unlimited

### Metering (usage_events)
```sql
-- Ver consumo últimos 30 días
SELECT DATE(created_at) as day, SUM(tokens_in + tokens_out) as total_tokens,
       SUM(cost_usd) as total_cost
FROM platform.usage_events
WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at) ORDER BY day;
```

### Alertas
- 80% presupuesto → warning
- 100% presupuesto → alerta crítica + suspender tareas no-críticas

## Referencias
- `apps/api/lib/admin-costs.ts` — dashboard admin
- `apps/api/lib/stripe/` — integración Stripe
- `apps/llm-gateway/src/logger.ts` — `logUsage()` para `usage_events`
- `docs/COST-DASHBOARD.md`
