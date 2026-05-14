# Hardening multi-tenant — evidencias (Opsly)

> **Canónico:** editar este archivo (`docs/tenants/production/`). Stub: [`docs/stubs/TENANT-PRODUCTION-HARDENING.md`](../../stubs/TENANT-PRODUCTION-HARDENING.md).

Controles de seguridad y trazabilidad que deben mantenerse en **producción multi-tenant**. Complementa [`SECURITY_CHECKLIST.md`](../../SECURITY_CHECKLIST.md) y [`SECURITY-MITIGATIONS-2026-04-09.md`](../../04-infrastructure/SECURITY-MITIGATIONS-2026-04-09.md).

## 1. Identidad y aislamiento

- **Service role Supabase:** solo en backend/Doppler; nunca en cliente ni en imágenes públicas.
- **Portal Zero-Trust:** `tenant_slug` y datos sensibles salen de sesión JWT + `platform.tenants`, no del cuerpo arbitrario del cliente.
- **Segmento dinámico `[slug]`:** validar `tenantSlugMatchesSession` (o equivalente) antes de consultas por tenant.

## 2. API pública y abuso

- **`GET /api/public/tenants/status`:** rate limit por IP (y criterios adicionales si aplica); monitorizar **429** y picos.
- **CORS:** orígenes explícitos en API; sin `*` en producción.

## 3. Claves y automatización

- **`/api/v1/keys`:** uso de `x-tenant-id` (u otro mecanismo acordado); rotación periódica; auditoría de quién crea/revoca.
- **Webhooks Stripe:** un único endpoint registrado en Stripe hacia la URL **canónica** (`apps/api`); evitar doble procesamiento.

## 4. Red e infraestructura

- **SSH:** preferir Tailscale; UFW con política mínima (ver runbooks VPS).
- **Redis:** autenticación y red interna en producción; no exponer 6379 públicamente.
- **Secretos:** Doppler `prd` como fuente; sin literales en git.

## 5. Observabilidad

- **Health:** degradación de `checks` en `/api/health` debe generar alerta operativa.
- **Jobs BullMQ:** `tenant_slug` + `request_id` en payloads donde aplique (OpenClaw).

## 6. Evidencias sugeridas (artefactos)

| Control | Evidencia mínima |
| ------- | ---------------- |
| Zero-Trust portal | Export de tests Vitest / captura CI |
| Rate limit público | Log/métrica 429 o test de carga acotado |
| Stripe webhook | Captura configuración dashboard (sin secretos) |
| Redis | Fragmento `docker compose` / red interna |

## Referencias

- [TENANT-PRODUCTION-BASELINE.md](./TENANT-PRODUCTION-BASELINE.md)
- [TENANT-PRODUCTION-CHECKLIST.md](../runbooks/TENANT-PRODUCTION-CHECKLIST.md)
- [TENANT-PRODUCTION-ROLLOUT.md](../runbooks/TENANT-PRODUCTION-ROLLOUT.md)
