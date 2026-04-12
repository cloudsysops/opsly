# Monitoreo de plataforma — Prometheus + Node Exporter

Stack **versionado en el repo** bajo `infra/monitoring/` y servicios en `infra/docker-compose.platform.yml`:

| Servicio | Imagen | Función |
|----------|--------|---------|
| `prometheus` (`opsly_prometheus`) | `prom/prometheus` | TSDB + API `/api/v1/query` |
| `node-exporter` (`opsly_node_exporter`) | `prom/node-exporter` | Métricas `node_*` del host (CPU, RAM, disco, uptime) |

La API (`app`) usa **`PROMETHEUS_BASE_URL`** (por defecto **`http://prometheus:9090`**) para `GET /api/metrics/system` en el Admin. Si Prometheus no responde, el endpoint devuelve datos **mock** (`mock: true`). Detalle de consultas: [`OBSERVABILITY.md`](./OBSERVABILITY.md).

## Despliegue (VPS)

Tras `git pull` en `/opt/opsly`:

```bash
cd /opt/opsly/infra
docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml pull prometheus node-exporter
docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml up -d prometheus node-exporter
```

El job **Deploy** en GitHub ya incluye pull/up de estos servicios junto al core.

**UI Prometheus (solo localhost en el VPS):** `http://127.0.0.1:9090` (mapeo `PROMETHEUS_HOST_PORT`, default `9090`).

## Relación con el antiguo stack `~/smiletrip/monitoring`

El directorio home **`~/smiletrip/monitoring`** era ajeno al repo y contenía Grafana, Loki, cAdvisor, etc. Ese stack **no** forma parte de Opsly versionado. El monitoreo oficial de plataforma es **solo** lo definido en `infra/`. Si en el futuro se necesita Grafana u observabilidad avanzada, añadir servicios en `infra/` con ADR o extensión documentada aquí.

## Variables

| Variable | Uso |
|----------|-----|
| `PROMETHEUS_BASE_URL` | URL que usa el contenedor API (default `http://prometheus:9090`). |
| `PROMETHEUS_HOST_PORT` | Puerto host para `127.0.0.1` → Prometheus (default `9090`). |

## Retención y volumen

Datos TSDB: volumen Docker **`prometheus_data`**. Retención configurada en compose: **15 días** (ajustable en `command` de `prometheus`).
