# ADR-019: Prometheus + Grafana para Observabilidad de la Plataforma

## Estado: ACEPTADO | Fecha: 2026-04-12

## Contexto

La plataforma Opsly actualmente tiene solo logs (json-file Docker). Sin métricas
estructuradas no es posible:

1. Detectar degradación de performance antes de que afecte a clientes
2. Medir SLA por tenant (p99 latency, error rate)
3. Alertar sobre circuit breaker trips o worker failures
4. Tomar decisiones de scaling basadas en datos

## Decisión

**Prometheus + Grafana** como stack de observabilidad, auto-provisionados vía
Docker Compose (ya en `infra/docker-compose.platform.yml` desde 2026-04-12).

Arquitectura:

```
Servicios Opsly → exponen /metrics (prom-client)
       ↓
Prometheus (scrape cada 30s) → almacena 15 días
       ↓
Grafana (dashboards auto-provisionados)
       ↓
Alerting (reglas en prometheus.yml → notifica Discord)
```

Exporters adicionales:

- **redis-exporter**: métricas BullMQ queue depth, hit rate, memory
- **node-exporter**: métricas del host VPS (CPU, RAM, disco)
- **cAdvisor**: métricas por contenedor (mem_limit, CPU throttling)

**Rechazado:**

- DataDog: $15/host/mes, vendor lock-in, overkill para MVP
- New Relic: similar a DataDog
- CloudWatch: solo AWS, no aplica
- ELK (solo logs): no da métricas de tiempo real

## Métricas clave a instrumentar (Sprint 4)

```typescript
// apps/orchestrator/src/monitoring/prometheus-exporter.ts
const metrics = {
  hermesTickDuration: new Histogram({ name: 'hermes_tick_duration_seconds', ... }),
  hermesTaskTotal: new Counter({ name: 'hermes_tasks_total', labelNames: ['tenant', 'worker', 'status'] }),
  circuitBreakerState: new Gauge({ name: 'circuit_breaker_state', labelNames: ['provider'] }),
  llmLatency: new Histogram({ name: 'llm_request_duration_seconds', labelNames: ['provider', 'model'] }),
  queueDepth: new Gauge({ name: 'bullmq_queue_depth', labelNames: ['queue_name'] }),
  tenantUsageUnits: new Counter({ name: 'tenant_usage_units_total', labelNames: ['tenant', 'feature'] }),
};
```

## Dashboards provisionados

Archivo: `infra/monitoring/grafana/dashboards/opsly-overview.json`

Sprint 4 añade:

- `opsly-tenants.json`: usage por tenant, billing events, error rate
- `opsly-workers.json`: latency por worker, queue depth, circuit breaker
- `opsly-llm.json`: tokens/min, costo estimado, provider health

## Alertas (Sprint 4)

```yaml
# infra/monitoring/prometheus-alerts.yml
groups:
  - name: opsly-sla
    rules:
      - alert: HighErrorRate
        expr: rate(hermes_tasks_total{status="error"}[5m]) > 0.05
        for: 2m
        annotations:
          summary: 'Error rate > 5% on {{ $labels.tenant }}'
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == 1
        for: 30s
        annotations:
          summary: 'Circuit breaker OPEN for {{ $labels.provider }}'
```

## Consecuencias

**Positivas:**

- Visibilidad total del stack en tiempo real
- Alertas proactivas antes de que cliente reporte
- Datos para optimizar routing y costos de LLM
- Dashboard ya live en `grafana.${PLATFORM_DOMAIN}` post-deploy

**Negativas:**

- +~256MB RAM para Grafana + Prometheus data (ya en compose con límites)
- Requiere instrumentación de cada servicio con `prom-client`
- Retención de 15 días (suficiente para MVP, expandir en Sprint 6)

## Criterio de éxito

Sprint 4 Gate: dashboard `opsly-overview` live con datos reales del VPS.
Sprint 6 Gate: SLA dashboard muestra p99 < 500ms para el 95% de tenants.

## Referencias

- `infra/docker-compose.platform.yml`: servicios prometheus, grafana, cadvisor, redis-exporter
- `infra/monitoring/prometheus.yml`: scrape config
- `infra/monitoring/grafana/`: provisioning automático
- ADR-015: Hermes (fuente principal de métricas)
