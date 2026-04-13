# Predictive BI Engine — Estrategia de Escalabilidad

## Problema

Con 1000 tenants, calcular insights diariamente puede consumir muchos recursos de DB.

## Solución: Background Jobs con BullMQ

### 1. Arquitectura de Jobs

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Scheduler │ ──▶ │   BullMQ    │ ──▶ │  Insight   │
│  (cron)    │     │  insight-q │     │  Worker    │
└─────────────┘     └──────────────┘     └─────────────┘
```

### 2. Job Definition

```typescript
// apps/orchestrator/src/workers/insight-worker.ts
export interface InsightJob {
  tenantId: string;
  tenantSlug: string;
  forceRegenerate?: boolean;
}

export const INSIGHT_QUEUE = "insights";

// Cron expression: daily at 2am UTC
const CRON_EXPRESSION = "0 2 * * *";
```

### 3. Rate Limiting

- **Max 10 tenants/worker** ejecutándose en paralelo
- **Delay 100ms** entre jobs para no saturar DB
- **Retry con backoff**: 1min, 5min, 30min, 2h

### 4. query Optimization

```sql
-- No calcular desde cero cada vez
-- Usar vista materializada para stats agregados
CREATE MATERIALIZED VIEW platform.tenant_daily_stats AS
SELECT 
  tenant_id,
  date_trunc('day', created_at) as day,
  count(*) as event_count,
  sum(amount) as revenue
FROM platform.usage_events
GROUP BY tenant_id, date_trunc('day', created_at);

-- Refresh cada hora en background
REFRESH MATERIALIZED VIEW CONCURRENTLY platform.tenant_daily_stats;
```

### 5. Cache Strategy

```typescript
// Redis cache para insights calculados
const INSIGHT_CACHE_TTL = 3600; // 1 hour

async function getCachedInsight(tenantId: string, type: InsightType) {
  const cacheKey = `insight:${tenantId}:${type}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const insight = await computeInsight(tenantId, type);
  await redis.setex(cacheKey, INSIGHT_CACHE_TTL, JSON.stringify(insight));
  return insight;
}
```

### 6. Horizontals Caling

| Tenants | Workers | Redis | Notas |
|--------|--------|-------|-------|-------|
| 1-50 | 1 | 1 | Todo en un worker |
| 50-200 | 2 | 1 | Workers paralelos |
| 200-1000 | 5+ | Redis Cluster | Sharding por tenant |

### 7. Fallback para DB lenta

```typescript
// Si DB > 5s, usar cache aunque sea stale
const DB_TIMEOUT = 5000;
const STALE_CACHE_OK = 3600 * 24; // 24h max

async function getInsightWithFallback(tenantId: string) {
  try {
    const result = await Promise.race([
      computeInsight(tenantId),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("timeout")), DB_TIMEOUT)
      ),
    ]);
    return result;
  } catch {
    // Return stale cache si hay error
    return getStaleCache(tenantId);
  }
}
```

---

## Costos Estimados

| Recurso | 50 tenants | 500 tenants | 1000 tenants |
|--------|-----------|------------|--------------|
| Redis | $0/mes | $15/mes | $30/mes |
| Worker CPU | 0.1 vCPU | 0.5 vCPU | 1 vCPU |
| DB queries | 50/day | 500/day | 1000/day |

## Recomendaciones

1. **Empezar simple**: Sin BullMQ, solo cron diario
2. **Añadir colas cuando sea necesario**: No optimices prematuramente
3. **Monitorizar**: logs de duración por tenant
4. **Alertas**: si > 30s por tenant = investigar