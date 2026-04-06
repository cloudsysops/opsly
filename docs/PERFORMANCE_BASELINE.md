# Performance baseline — Opsly

Referencia **orientativa** para Fase 1 de validación; no sustituye APM ni pruebas de carga formales.

## API (Next.js route handlers)

| Área | Objetivo orientativo | Notas |
|------|----------------------|--------|
| `GET /api/health` | &lt; 300 ms p95 (red hacia Supabase incluida) | Timeout interno de probe ~2 s. |
| `GET /api/metrics` | &lt; 2 s p95 con Supabase cola de conteos | Varios `head: true` en paralelo. |
| `GET /api/metrics/system` | &lt; 3 s p95 si Prometheus alcanzable | Fallback mock si Prom no responde. |
| Onboarding (`provisionTenant`) | Minutos (I/O Docker, health interno) | No comparable a request corto. |

## Métricas de host (Prometheus / node_exporter)

Las consultas usadas por código están en `apps/api/lib/fetch-host-metrics-prometheus.ts` (ver también [OBSERVABILITY.md](OBSERVABILITY.md)): CPU %, RAM, disco `/`, uptime.

## Cliente (admin / portal)

- **First Contentful Paint / LCP:** seguir presupuesto del producto; builds `standalone` en producción.
- Datos en dashboard admin: SWR ~30 s — ajustar según carga del VPS.

## Próximos pasos (fases posteriores)

- Pruebas de carga con k6 o equivalente contra staging.
- Presupuestos de cold start en Functions si algún endpoint migra a edge.

## Historial

- **2026-04-06:** Baseline documentada (sin mediciones numéricas capturadas en runtime en este commit).
