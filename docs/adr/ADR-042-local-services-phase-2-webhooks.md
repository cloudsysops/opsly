# ADR-042 — Local Services Phase 2: n8n webhooks (HMAC, tenant path)

## Status

Accepted (initial implementation: webhook routes).

## Context

n8n y otros orquestadores deben llamar a la API sin sesión Supabase, manteniendo aislamiento estricto por tenant.

## Decision

- Rutas: `POST /api/local-services/webhooks/{slug}/booking-created`, `.../booking-completed`, `.../reports/create`.
- Autenticación: cabecera `X-Opsly-Signature` = `sha256=` + hex(HMAC-SHA256(body UTF-8)) con secreto por env:
  - `LOCAL_SERVICES_WEBHOOK_SECRET_<SLUG_NORMALIZADO>` (slug en MAYÚS, caracteres no alfanuméricos → `_`), o
  - `LOCAL_SERVICES_WEBHOOK_SECRET` como fallback (solo dev / un solo tenant).
- Autorización de tenant: `assertLocalServicesTenantPublic(slug)` (tenant existe y `status === active`).
- Datos: todas las consultas filtran por `tenant_slug` del path; no se acepta `tenant_slug` sustituto en el cuerpo para cambiar de tenant.

## Consequences

- SendGrid / Twilio / Stripe en flujos n8n se configuran en n8n y Doppler; la API solo expone puntos de entrada firmados.
- Rotación de secretos: actualizar env y credencial en n8n.
