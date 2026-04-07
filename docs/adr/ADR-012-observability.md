# ADR-012: Observabilidad por Tenant

## Estado: ACEPTADO | Fecha: 2026-04-07

## Contexto

No hay forma de saber cuántos tokens usó cada tenant,
qué jobs fallaron ni cuánto cuesta servir a cada cliente.
Sin esto no podemos cobrar por uso ni optimizar.

## Decisión

Agregar tabla `platform.usage_events` en Supabase y
endpoint `GET /api/metrics/tenant/:slug` con:

- tokens_used_today
- tokens_used_month
- cost_estimate_usd
- jobs_completed
- jobs_failed
- cache_hit_rate

## Consecuencias

- Cada llamada LLM registra evento en Supabase
- Admin dashboard muestra métricas por tenant
- Base para billing por uso en Fase 3
