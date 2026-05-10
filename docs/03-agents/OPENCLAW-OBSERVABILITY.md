# OpenClaw Observability — Sprints 15-16

## Introducción

La observabilidad de OpenClaw está construida sobre tres pilares:
1. **Prometheus** — Métricas en tiempo real (counters, gauges, histogramas)
2. **Jaeger** — Distributed tracing (flujos per-tenant)
3. **ELK Stack** — Logging estructurado y búsqueda

Todos los datos están separados **por tenant** para análisis aislado y troubleshooting.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenClaw Services                         │
│  (API, Orchestrator, MCP, LLM-Gateway, Context-Builder)     │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├─► Prometheus Exporter (port 9090)
       │   └─ Scrape every 15s
       │
       ├─► Jaeger Agent (port 6831 UDP)
       │   └─ Trace collection
       │
       └─► ELK/Filebeat
           └─ Log shipping

┌──────────────┬──────────────┬──────────────┐
│ Prometheus   │   Jaeger     │  ELK Stack   │
│ (metrics)    │  (traces)    │ (logs)       │
└──────┬───────┴───────┬──────┴──────┬───────┘
       │               │             │
       └───────┬───────┴─────┬───────┘
               │             │
          Grafana        Kibana
          (dashboards)   (analysis)
```

## Métricas Prometheus

### Core Metrics

#### 1. openclaw_tenant_job_count
**Type:** Counter
**Labels:** `tenant_slug`, `status` (success/failure/timeout), `job_type`
**Description:** Número total de jobs ejecutados

```promql
# Ejemplo: Success rate por tenant
rate(openclaw_tenant_job_count{status="success"}[5m]) / 
  rate(openclaw_tenant_job_count[5m])

# Jobs fallidos en última hora
increase(openclaw_tenant_job_count{status="failure"}[1h])
```

#### 2. openclaw_tenant_job_duration_ms
**Type:** Histogram
**Labels:** `tenant_slug`, `job_type`
**Buckets:** [100, 500, 1000, 2000, 5000, 10000, 30000]ms
**Description:** Duración de ejecución de jobs

```promql
# Latencia p99 por tenant
histogram_quantile(0.99, rate(openclaw_tenant_job_duration_ms_bucket[5m]))

# Jobs lentos (>5s)
rate(openclaw_tenant_job_duration_ms_bucket{le="5000"}[5m])
```

#### 3. openclaw_tenant_cost_usd
**Type:** Gauge
**Labels:** `tenant_slug`
**Description:** Costo acumulado del día actual

```promql
# Top 5 tenants más caros
topk(5, openclaw_tenant_cost_usd)

# Costo promedio por tenant
avg(openclaw_tenant_cost_usd)
```

#### 4. openclaw_tenant_concurrent_jobs
**Type:** Gauge
**Labels:** `tenant_slug`, `plan`
**Description:** Número de jobs concurrentes activos

```promql
# Máximo de concurrencia por tenant
max(openclaw_tenant_concurrent_jobs)

# Tenants cerca del límite
openclaw_tenant_concurrent_jobs > 10
```

#### 5. openclaw_ml_feedback_score
**Type:** Histogram
**Labels:** `tenant_slug`
**Buckets:** [0.1, 0.3, 0.5, 0.7, 0.9, 1.0]
**Description:** Score de feedback ML (0-1)

```promql
# Average ML quality score
histogram_quantile(0.5, rate(openclaw_ml_feedback_score_bucket[1h]))

# Low quality alerts (<0.7)
histogram_quantile(0.5, openclaw_ml_feedback_score_bucket) < 0.7
```

#### 6. openclaw_skill_invocations
**Type:** Counter
**Labels:** `tenant_slug`, `skill_name`, `status`
**Description:** Invocaciones de skills por tenant

```promql
# Top skills por invocaciones
topk(10, rate(openclaw_skill_invocations[5m]))

# Skill failure rate
rate(openclaw_skill_invocations{status="failure"}[5m]) /
  rate(openclaw_skill_invocations[5m])
```

#### 7. openclaw_skill_invocation_duration_ms
**Type:** Histogram
**Labels:** `tenant_slug`, `skill_name`
**Buckets:** [10, 50, 100, 500, 1000, 2000, 5000]ms
**Description:** Duración de invocación de skills

```promql
# Skill más lento (p99)
topk(1, histogram_quantile(0.99, 
  rate(openclaw_skill_invocation_duration_ms_bucket[5m])))
```

#### 8. openclaw_notebooklm_latency_ms
**Type:** Histogram
**Labels:** `tenant_slug`, `operation` (index, query, sync)
**Buckets:** [100, 500, 1000, 2000, 5000]ms
**Description:** Latencia de NotebookLM

```promql
# Query performance
histogram_quantile(0.95, rate(
  openclaw_notebooklm_latency_ms_bucket{operation="query"}[5m]))
```

#### 9. openclaw_tenant_job_errors
**Type:** Counter
**Labels:** `tenant_slug`, `error_type`
**Description:** Conteo de errores por tipo

```promql
# Error rate
rate(openclaw_tenant_job_errors[5m])

# Most common errors
topk(5, rate(openclaw_tenant_job_errors[1h]))
```

#### 10. openclaw_provisioning_duration_ms
**Type:** Histogram
**Buckets:** [1000, 5000, 10000, 20000, 30000]ms
**Description:** Tiempo de provisioning

```promql
# Provisioning time p50
histogram_quantile(0.5, openclaw_provisioning_duration_ms_bucket)

# Alert if > 30s
histogram_quantile(0.5, openclaw_provisioning_duration_ms_bucket) > 30000
```

## Jaeger Tracing

### Traces per-Tenant

Todos los spans incluyen el tag `tenant_slug` para filtering:

```javascript
span.setAttributes({
  'tenant.slug': tenantSlug,
  'tenant.plan': plan,
  'tenant.user_id': userId,
});
```

### Trace Flows

#### 1. Job Execution Flow
```
job.execute
├─ job.id = "job-123"
├─ job.type = "agent_farm"
├─ tenant.slug = "acme-corp"
└─ Spans hijos:
   ├─ knowledge_pipeline.orchestrator
   ├─ knowledge_pipeline.notebooklm
   ├─ knowledge_pipeline.obsidian
   └─ knowledge_pipeline.graphyfi
```

#### 2. Skill Invocation Flow
```
skill.invoke
├─ skill.name = "opsly-api"
├─ tenant.slug = "acme-corp"
└─ child spans:
   ├─ skill.execute
   ├─ skill.timeout_check
   └─ skill.cost_tracking
```

#### 3. Provisioning Flow
```
tenant.provisioning
├─ tenant.slug = "new-tenant"
└─ child spans:
   ├─ tenant.setup_db
   ├─ tenant.sync_skills
   ├─ tenant.health_check
   └─ tenant.ready
```

### Querying Jaeger

**URL:** http://localhost:16686

**Ejemplos de búsqueda:**

```
# Todos los traces para tenant
tags: tenant.slug=acme-corp

# Jobs fallidos
tags: job.status=failure

# Latencia alta
tags: job.duration_ms>5000

# NotebookLM queries lentas
serviceName=openclaw & operationName=knowledge_pipeline.notebooklm & 
  tags: knowledge_pipeline.stage=notebooklm
```

### Jaeger Query Helper

```bash
# Ver traces de un tenant
export TENANT_SLUG="acme-corp"
curl "http://localhost:16686/api/traces?service=openclaw&tags=%7B%22tenant.slug%22:%22$TENANT_SLUG%22%7D"
```

## ELK Stack (Logging)

### Log Structure

Todos los logs incluyen:
```json
{
  "timestamp": "2026-05-01T12:34:56Z",
  "level": "info",
  "service": "openclaw",
  "tenant_slug": "acme-corp",
  "request_id": "req-uuid",
  "message": "Skill invoked successfully",
  "context": {
    "skill_name": "opsly-api",
    "duration_ms": 150,
    "cost_usd": 0.01
  }
}
```

### Elasticsearch Queries

```bash
# Búsqueda básica
GET logs-openclaw-*/_search
{
  "query": {
    "match": {
      "tenant_slug": "acme-corp"
    }
  }
}

# Logs de errores por tenant
GET logs-openclaw-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "tenant_slug": "acme-corp" } },
        { "match": { "level": "error" } }
      ]
    }
  }
}

# Agregación: errores por tipo
GET logs-openclaw-*/_search
{
  "aggs": {
    "by_error_type": {
      "terms": {
        "field": "error_type"
      }
    }
  }
}
```

### Kibana Queries

**KQL Syntax:**

```
# Last 24h errors
@timestamp > now-24h AND level: error AND tenant_slug: acme-corp

# Slow queries
duration_ms > 2000 AND operation: "notebooklm_query"

# Skill failures
skill_status: failure AND tenant_slug: acme-corp
```

## Grafana Dashboards

### 1. Admin Dashboard: "OpenClaw per Tenant Overview"

**URL:** http://grafana:3000/d/openclaw-per-tenant

**Panels:**

1. **Tenant Metrics Table**
   - Columns: Tenant | Plan | Concurrent Jobs | Hourly Cost | Status | Agents
   - Query: `topk(50, max(openclaw_tenant_cost_usd))`

2. **Job Success Rate (%) [Gauge]**
   - Formula: `sum(rate(openclaw_tenant_job_count{status="success"}[5m])) / sum(rate(openclaw_tenant_job_count[5m])) * 100`
   - Alert: < 95%

3. **Job Latency p50/p99 [Graph]**
   - Query: `histogram_quantile(0.50/0.99, rate(openclaw_tenant_job_duration_ms_bucket[5m]))`

4. **Cost Trend [Graph]**
   - Query: `increase(openclaw_tenant_cost_usd[1h])`
   - Stacked by tenant

5. **Errors [Counter]**
   - Query: `sum(rate(openclaw_tenant_job_errors[1h]))`
   - Alert: > 10 errors/hour

6. **Skill Usage [Heatmap]**
   - Query: `rate(openclaw_skill_invocations[5m])`
   - X-axis: skill_name
   - Y-axis: tenant_slug

### 2. Tenant Self-Service: "My Dashboard"

**URL:** http://portal:3002/dashboard/insights

**Panels:**

1. **Agent Status [Status Lights]**
   - Green: healthy
   - Yellow: degraded
   - Red: failing

2. **Recent Jobs [Table]**
   - Columns: Job ID | Type | Duration | Status | Time
   - Limit: Last 10

3. **Cost This Period [Gauge + Trends]**
   - Top-level gauge: Total cost today
   - Breakdown: This hour / This day / This month

4. **Success Rate [Gauge]**
   - Formula: `sum(rate(openclaw_tenant_job_count{status="success",tenant_slug="$TENANT"}[1h])) / sum(rate(openclaw_tenant_job_count{tenant_slug="$TENANT"}[1h])) * 100`

5. **Skills Usage [Bar Chart]**
   - Top 10 skills invocados
   - Query: `topk(10, rate(openclaw_skill_invocations{tenant_slug="$TENANT"}[24h]))`

### 3. Platform Health: "OpenClaw Platform Health"

**URL:** http://grafana:3000/d/openclaw-health

**Panels:**

1. **Global Success Rate [Gauge]**
   - Aggregado de todos los tenants

2. **Total Active Tenants [Counter]**
   - Query: `count(distinct(openclaw_tenant_job_count))`

3. **P99 Job Latency [Gauge]**
   - Query: `histogram_quantile(0.99, rate(openclaw_tenant_job_duration_ms_bucket[5m]))`

4. **Anomaly Detection [Graph]**
   - Machine learning para detectar anomalías

5. **Top Error Types [Bar Chart]**
   - Global error distribution

## Alerting Rules

### Prometheus Alerting

**File:** `/infra/prometheus/openclaw-tenant-rules.yml`

```yaml
groups:
  - name: openclaw_tenant_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighJobErrorRate
        expr: |
          (rate(openclaw_tenant_job_count{status="failure"}[5m]) /
           rate(openclaw_tenant_job_count[5m])) > 0.05
        for: 5m
        annotations:
          summary: "Tenant {{ $labels.tenant_slug }} has > 5% job failure rate"
          dashboard: "http://grafana:3000/d/openclaw-per-tenant"

      # Slow jobs
      - alert: SlowJobLatency
        expr: histogram_quantile(0.99, openclaw_tenant_job_duration_ms_bucket) > 10000
        for: 10m
        annotations:
          summary: "Tenant {{ $labels.tenant_slug }} jobs taking >10s"

      # High cost
      - alert: HighTenantCost
        expr: increase(openclaw_tenant_cost_usd[1h]) > 100
        for: 15m
        annotations:
          summary: "Tenant {{ $labels.tenant_slug }} cost > $100/hour"

      # Provisioning timeout
      - alert: ProvisioningTimeout
        expr: increase(openclaw_provisioning_duration_ms[5m]) > 30000
        for: 5m
        annotations:
          summary: "Tenant provisioning took >30s"

      # Skill failures
      - alert: HighSkillFailureRate
        expr: |
          (rate(openclaw_skill_invocations{status="failure"}[5m]) /
           rate(openclaw_skill_invocations[5m])) > 0.1
        for: 10m
        annotations:
          summary: "Skill {{ $labels.skill_name }} has > 10% failure rate"
```

### Slack/PagerDuty Integration

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: "${SLACK_WEBHOOK_URL}"

route:
  receiver: "default"
  group_by: ["tenant_slug", "severity"]
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 4h

receivers:
  - name: "default"
    slack_configs:
      - channel: "#openclaw-alerts"
        title: "[{{ .GroupLabels.severity }}] {{ .Alerts.Firing | len }} alerts"
        text: "Tenant: {{ .GroupLabels.tenant_slug }}"
        send_resolved: true
```

## Performance Benchmarks

| Component | Target | Alert Threshold |
|-----------|--------|-----------------|
| Provisioning | <30s | >45s |
| Job baseline | <5s | >10s |
| NotebookLM query | <2s | >3s |
| Obsidian graph | <1s | >2s |
| Skill discovery | <100ms | >200ms |
| Cost tracking latency | <100ms | >500ms |

## Debugging Guide

### Scenario 1: High Error Rate for Tenant

```bash
# 1. Check Prometheus
curl "http://prometheus:9090/api/v1/query?query=rate(openclaw_tenant_job_count{tenant_slug=\"acme-corp\",status=\"failure\"}[5m])"

# 2. Check Jaeger traces
# Visit: http://localhost:16686/?service=openclaw&tags=%7B%22tenant.slug%22:%22acme-corp%22%7D

# 3. Check logs
curl "http://elasticsearch:9200/logs-openclaw-*/_search" -d '{
  "query": {
    "bool": {
      "must": [
        {"match": {"tenant_slug": "acme-corp"}},
        {"match": {"level": "error"}}
      ]
    }
  },
  "sort": [{"@timestamp": {"order": "desc"}}],
  "size": 50
}'

# 4. Check skill status
curl "http://api:3000/api/tenants/acme-corp/skills/status"
```

### Scenario 2: Slow Latency

```bash
# Identificar el skill lento
curl "http://prometheus:9090/api/v1/query?query=topk(5, rate(openclaw_skill_invocation_duration_ms_bucket[5m]))"

# Ver traces detallados
# Jaeger: filter por skill_name y buscar spans con duración alta

# Revisar ejecutor del skill
grep -r "skill_name" logs/ | grep "acme-corp" | tail -100
```

### Scenario 3: Cost Anomaly

```bash
# Graficar aumento de costo
# Prometheus: `increase(openclaw_tenant_cost_usd[1h])`

# Identificar qué skill causó el aumento
curl "http://prometheus:9090/api/v1/query?query=topk(10, increase(openclaw_skill_invocations{tenant_slug=\"acme-corp\"}[1h]))"

# Revisar invocaciones de ese skill
curl "http://api:3000/api/tenants/acme-corp/skills/opsly-notebooklm/history?limit=100"
```

## Onboarding Observabilidad

### Para Operators

1. Revisar Grafana dashboards diarios
2. Set alerts en Slack
3. Monthly review de Prometheus retention
4. Jaeger data cleanup (30 días)

### Para Developers

1. Usar `MetricsCollector` para registrar operaciones
2. Usar `createJobSpan()` / `createSkillSpan()` para tracing
3. Incluir tenant_slug en logs
4. Test observability en PR reviews

### Para Product

1. Monitor cost trends en dashboard
2. Detectar tenants high-value
3. Identificar features más usadas (skills)
4. Feedback loops via ML scores

## URLs y Acceso

| Servicio | URL | Puerto | Auth |
|----------|-----|--------|------|
| Prometheus | http://prometheus:9090 | 9090 | none |
| Grafana | http://grafana:3000 | 3000 | admin/admin |
| Jaeger UI | http://localhost:16686 | 16686 | none |
| Elasticsearch | http://elasticsearch:9200 | 9200 | none |
| Kibana | http://kibana:5601 | 5601 | none |
| OpenClaw Metrics | http://api:3000/metrics | 3000 | Bearer token |

## Next Steps

- [ ] Implementar alertas custom por tenant SLA
- [ ] Machine learning para anomaly detection
- [ ] Custom Grafana plugins para visualización OpenClaw
- [ ] Distributed logs con correlation IDs
- [ ] OpenTelemetry protocol (OTLP) en lugar de Jaeger agent
