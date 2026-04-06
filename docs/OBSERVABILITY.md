# Observabilidad — Opsly (Prometheus / métricas host)

Documentación alineada con el código en `apps/api/lib/fetch-host-metrics-prometheus.ts` y `apps/api/lib/prometheus.ts`.

## Endpoints / integración

- **Prometheus** expuesto según tu despliegue (p. ej. `PROMETHEUS_BASE_URL` / `host.docker.internal:9090` desde el contenedor API).
- **`GET /api/metrics/system`:** agrega lecturas instantáneas vía `/api/v1/query`; si Prometheus no responde, devuelve payload **mock** (`mock: true`).

## Consultas PromQL (instant query)

Copiar en la UI de Prometheus o en Grafana (panel instant / range según caso).

| Métrica lógica | PromQL |
|----------------|--------|
| CPU % (aprox.) | `100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)` |
| RAM usada (bytes) | `sum(node_memory_MemTotal_bytes) - sum(node_memory_MemAvailable_bytes)` |
| RAM total (bytes) | `sum(node_memory_MemTotal_bytes)` |
| Disco usado `/` (bytes) | `sum(node_filesystem_size_bytes{mountpoint="/"}) - sum(node_filesystem_free_bytes{mountpoint="/"})` |
| Disco total `/` (bytes) | `sum(node_filesystem_size_bytes{mountpoint="/"})` |
| Uptime (s) | `time() - node_boot_time_seconds` |

**Notas:**

- Las sumas asumen un solo nodo scrapeado o agregación global; en múltiples nodos filtrar por `instance` o `job`.
- El código acota CPU al rango `[CPU_MIN_PCT, CPU_MAX_PCT]` en `HOST_METRICS` (`lib/constants.ts`).

## Alertas sugeridas (ejemplos)

Definir en **Prometheus** `rule_files` o en **Grafana Alerting**; umbrales a calibrar por entorno.

```yaml
# Ejemplos conceptuales — no son ficheros del repo
groups:
  - name: opsly-host
    rules:
      - alert: OpslyHighCPU
        expr: 100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: CPU alta en nodo Opsly

      - alert: OpslyDiskLow
        expr: |
          (sum(node_filesystem_free_bytes{mountpoint="/"}))
          / (sum(node_filesystem_size_bytes{mountpoint="/"})) < 0.15
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Disco raíz con menos del 15% libre
```

## Dashboard (Grafana) — esquema de paneles

1. **Fila “Host”:** CPU %, RAM usada/total (GB), disco usado/total (GB), uptime (stat o timeline).
2. **Fila “Opsly”:** `containers_running`, `active_tenants` (métricas expuestas vía API o fuente propia si se exportan).
3. **Enlace** al job `node_exporter` / target Prometheus que alimenta las queries anteriores.

## API interna

- **`GET /api/metrics`:** agregados de tenants + `mrr_usd` (Supabase + Stripe); auth admin / demo read según política.

## Referencias

- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md)
