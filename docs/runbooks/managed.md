# Runbook — Operaciones _managed_ (cliente / tenant)

**Audiencia:** equipo que atiende tenants con stack desplegado (n8n, Uptime Kuma, etc.) según plan.

## Límites del servicio _managed_

- Cambios de infra por tenant siguen el modelo compose por tenant (ADR-001)
- No se ofrece SSH al cliente; intervenciones vía API/support interno

## Flujo típico de solicitud

1. Identificar tenant por `slug` o ID en Supabase `platform.tenants`
2. Ver `GET /api/tenants/:ref` (admin) — `stack_status` y campos `services` (URLs portal)
3. Acciones: suspender/reanudar, eliminar, reenvío de invitación portal según scripts/API disponibles

## Modos portal

- **developer** / **managed** — ver `lib/portal-me.ts` (`parsePortalMode`) y documentación de producto
- Invitaciones: flujo probado en tests `invitation-admin-flow`

## Escalación

- Errores de orquestación o Docker en VPS → `docs/runbooks/incident.md`
- Facturación/Stripe → verificar webhooks y estado en Supabase
