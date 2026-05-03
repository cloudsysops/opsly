# ADR-041 — Local Services Phase 1: tenant API (`platform.ls_*`)

## Status

Accepted (implemented).

## Context

Local Services (Equipa) se trata como tenant Opsly con datos en schema `platform` y `tenant_slug` en todas las filas (`0046_local_services_core.sql`).

## Decision

- Tablas: `ls_services`, `ls_customers`, `ls_bookings`, `ls_quotes`, `ls_reports` con FK a `platform.tenants.slug`.
- API autenticada portal: `/api/local-services/tenants/{slug}/...` vía `runLocalServicesTenantDal` (JWT + `tenantSlugMatchesSession` + `runWithTenantContext`).
- Reserva pública: `POST /api/local-services/public/tenants/{slug}/bookings` sin JWT; validación de tenant activo en `assertLocalServicesTenantPublic`.

## Consequences

- n8n y automatismos externos no usan JWT portal; ver ADR complementario para webhooks Phase 2 (`/api/local-services/webhooks/{slug}/...`).
