# Dashboard operacional — autonomía Opsly (4 métricas clave)

**Objetivo:** una sola vista mental de salud para operación autónoma; la UI puede estar repartida en Admin hasta consolidarse.

## 1. SLO / disponibilidad

- **Qué:** disponibilidad de API, portal, orchestrator, LLM Gateway (objetivo plan: servicios críticos ≥ 99,5 % a 60 días).
- **Dónde hoy:** Admin **Dashboard** — métricas de sistema (`GET /api/metrics/system`), uptime; health público `GET /api/health`.
- **Cómo profundizar:** Prometheus/Grafana si están desplegados (`docs/adr/ADR-019-prometheus-grafana-observability.md`).

## 2. Costo (LLM / tenant)

- **Qué:** USD agregado por tenant y modelo; presupuestos y alertas.
- **Dónde hoy:** Admin **`/costs`** — `GET/POST /api/admin/costs`; uso por tenant **`/api/metrics/tenant/:slug`** (y portal **`/api/portal/usage`**).
- **Logs:** `usage_events` / gateway (`docs/00-architecture/LLM-GATEWAY.md`).

## 3. Tasa de éxito de jobs autónomos

- **Qué:** ratio de jobs completados vs fallidos en colas OpenClaw / workers (objetivo plan: ≥ 95 % para riesgo bajo/medio).
- **Dónde hoy:** logs estructurados `worker_start` / `worker_complete` / `worker_fail` (`apps/orchestrator/src/observability/worker-log.ts`); Admin **Agents** / métricas equipos si `GET /api/metrics/teams` está enlazado.
- **Práctica:** filtrar por `autonomy_risk`, `tenant_slug`, `request_id` en agregador de logs (Loki/CloudWatch/Datadog según despliegue).

## 4. MTTR incidentes P1/P2

- **Qué:** tiempo medio de resolución &lt; 30 min (meta plan).
- **Dónde hoy:** proceso manual + Discord; runbooks por incidente.
- **Referencia:** [`INCIDENT-AUTONOMOUS-AGENT.md`](./INCIDENT-AUTONOMOUS-AGENT.md), [`DEPLOY-GITHUB-ACTIONS.md`](./DEPLOY-GITHUB-ACTIONS.md) (rollback imagen).

## Go/No-Go semanal

Criterios numéricos y procedimiento: [`../plans/AUTONOMY-GO-NO-GO-WEEKLY.md`](../plans/AUTONOMY-GO-NO-GO-WEEKLY.md).

## Evolución (producto)

Unificar estas cuatro series en una sola página Admin (`/operations/autonomy`) es mejora opcional; hasta entonces este documento es el contrato de qué medir y dónde mirar.
