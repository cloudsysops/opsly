# Hardening multi-tenant — evidencias y deuda conocida

Este documento complementa el checklist de producción con **controles de seguridad**, **superficies sensibles** y plantilla de evidencia (sin valores secretos).

## 1. Autenticación y autorización

| Superficie | Estado deseado | Notas |
| ---------- | -------------- | ----- |
| Admin API (`requireAdminAccess`) | Token plataforma o sesión super-admin | Suspend/resume/DELETE tenant, creación tenant. |
| Portal (`tenantSlugMatchesSession`) | JWT + coincidencia de slug en rutas `[slug]` | Ver implementación en `apps/api/lib/portal-trusted-identity.ts`. |
| `GET /api/metrics/web-dashboard` | `requireAdminAccessUnlessDemoRead` | No exponer agregados sensibles sin auth en prod. |
| `GET /api/public/tenants/status` | Solo email + rate limit | No devolver PII extra; monitorizar abuso. |

## 2. Deuda: `v1/keys`

Las rutas `GET|POST /api/v1/keys` y `DELETE /api/v1/keys/[id]` replican el contrato legacy (`x-tenant-id` UUID).

**Riesgo:** cualquier actor que conozca `tenant_id` UUID podría gestionar claves si el endpoint es alcanzable sin capa adicional.

**Mitigación recomendada (siguiente iteración):**

1. Exigir `requireAdminAccess` y comprobar que el tenant pertenece a la sesión o al operador.
2. O emitir claves solo desde un job interno con service identity.
3. Rotar claves existentes tras el cambio de política.

Registrar fecha y responsable cuando se cierre la deuda.

## 3. Redis y rate limiting

- `public/tenants/status` usa Redis (`INCR` + `EXPIRE`) por IP.
- Evidencia esperada: variable `REDIS_URL` en runtime API; gráfica o logs de 429 acotados.

## 4. Stripe

- Un único endpoint de webhook en configuración Stripe → URL del **API** canónico.
- Verificar firma (`stripe-signature`) y idempotencia en el handler del API.

## 5. Plantilla de evidencia (copiar al cerrar hardening)

```
Fecha:
Tenant(s):
- Cloudflare proxy: sí/no
- SSH solo Tailscale: sí/no
- Doppler prd sin placeholders críticos: sí/no
- GET /api/health (checks supabase/redis): ok/degradado
- Webhook Stripe probado (test mode o evento real): ok/N/A
- Backup/restauración documentado o probado: ok/N/A
- v1/keys policy: legacy / endurecido (fecha):
```

## 6. Referencias

- [PRODUCTION-SECURITY-BASELINE.md](./runbooks/PRODUCTION-SECURITY-BASELINE.md)
- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
- [TENANT-PRODUCTION-BASELINE.md](./TENANT-PRODUCTION-BASELINE.md)
