# Plan de pruebas para tenants (staging)

**Dominio base:** `ops.smiletripcare.com` (sustituir si tu entorno usa otro `PLATFORM_DOMAIN`).  
**Detalle técnico ampliado:** [`TENANT-TESTING-GUIDE.md`](TENANT-TESTING-GUIDE.md).

## Estado del sistema (verificación operativa)

Checklist rápido antes de invitar a tenants:

| Componente         | Verificación                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| API                | `GET https://api.ops.smiletripcare.com/api/health` → `status: ok`, `checks.supabase` / `checks.redis` |
| Costes (admin)     | `https://admin.ops.smiletripcare.com/costs` (requiere sesión admin / token según despliegue)          |
| Redis (plataforma) | En VPS: contenedor `infra-redis-1` healthy                                                            |
| Worker remoto      | Opcional: nodo Mac 2011 u otro worker con cola BullMQ (ver `docs/WORKER-SETUP-MAC2011.md`)            |

## URLs para probar

| Recurso          | URL                                                                            |
| ---------------- | ------------------------------------------------------------------------------ |
| Health API       | `https://api.ops.smiletripcare.com/api/health`                                 |
| Admin            | `https://admin.ops.smiletripcare.com`                                          |
| Portal           | `https://portal.ops.smiletripcare.com` (si el servicio portal está desplegado) |
| Dashboard costos | `https://admin.ops.smiletripcare.com/costs`                                    |

## Tenants de referencia (ejemplos)

| Tenant       | n8n                                              | Uptime Kuma                                         |
| ------------ | ------------------------------------------------ | --------------------------------------------------- |
| localrank    | `https://n8n-localrank.ops.smiletripcare.com`    | `https://uptime-localrank.ops.smiletripcare.com`    |
| jkboterolabs | `https://n8n-jkboterolabs.ops.smiletripcare.com` | `https://uptime-jkboterolabs.ops.smiletripcare.com` |

_Esperado típico:_ n8n **200** en raíz; Uptime **302** hacia login.

## Pasos para el tenant

### 1. Verificar stack activo

```bash
curl -sI --max-time 15 "https://n8n-TU-SLUG.ops.smiletripcare.com" | head -3
curl -sI --max-time 15 "https://uptime-TU-SLUG.ops.smiletripcare.com" | head -3
```

### 2. n8n

Abrir URL → registro admin solo la primera vez → importar o crear workflows de prueba.

### 3. Uptime Kuma

Abrir URL → crear admin → añadir monitor HTTP (p. ej. `https://api.ops.smiletripcare.com/api/health`).

### 4. Feedback (portal)

`POST /api/feedback` está pensado para **usuarios autenticados con JWT de portal** (Zero-Trust); no sustituyas tenant/email en el cuerpo. Ver `docs/SECURITY_CHECKLIST.md` y `apps/api/lib/feedback/`. Desde el producto, usar el flujo del portal (`FeedbackChat`) con Bearer.

## Soporte

Usar el email de soporte si está publicado en portal (`NEXT_PUBLIC_SUPPORT_EMAIL`) o el canal acordado con Opsly (p. ej. Discord interno). No pegar secretos en tickets.

## Próximas mejoras (producto / ops)

- Backups automáticos por tenant según `VISION.md` / runbooks.
- Monitoreo proactivo (Uptime + alertas).
- Runbooks de troubleshooting por incidente (ya hay base en `docs/runbooks/`).
