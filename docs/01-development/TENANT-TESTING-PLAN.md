# Plan de pruebas para tenants (staging)

**Dominio base:** `op-sly.com` (sustituir si tu entorno usa otro `PLATFORM_DOMAIN`).  
**Detalle técnico ampliado:** [`TENANT-TESTING-GUIDE.md`](TENANT-TESTING-GUIDE.md).

## Estado del sistema (verificación operativa)

Checklist rápido antes de invitar a tenants:

| Componente         | Verificación                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| API                | `GET https://api.op-sly.com/api/health` → `status: ok`, `checks.supabase` / `checks.redis` |
| Costes (admin)     | `https://admin.op-sly.com/costs` (requiere sesión admin / token según despliegue)          |
| Redis (plataforma) | En VPS: contenedor `infra-redis-1` healthy                                                            |
| Worker remoto      | Opcional: nodo Mac 2011 u otro worker con cola BullMQ (ver `docs/WORKER-SETUP-MAC2011.md`)            |

## URLs para probar

| Recurso          | URL                                                                            |
| ---------------- | ------------------------------------------------------------------------------ |
| Health API       | `https://api.op-sly.com/api/health`                                 |
| Admin            | `https://admin.op-sly.com`                                          |
| Portal           | `https://portal.op-sly.com` (si el servicio portal está desplegado) |
| Dashboard costos | `https://admin.op-sly.com/costs`                                    |

## Tenants de referencia (ejemplos)

| Tenant       | n8n                                              | Uptime Kuma                                         |
| ------------ | ------------------------------------------------ | --------------------------------------------------- |
| localrank    | `https://n8n-localrank.op-sly.com`    | `https://uptime-localrank.op-sly.com`    |
| jkboterolabs | `https://n8n-jkboterolabs.op-sly.com` | `https://uptime-jkboterolabs.op-sly.com` |

_Esperado típico:_ n8n **200** en raíz; Uptime **302** hacia login.

## Pasos para el tenant

### 1. Verificar stack activo

```bash
curl -sI --max-time 15 "https://n8n-TU-SLUG.op-sly.com" | head -3
curl -sI --max-time 15 "https://uptime-TU-SLUG.op-sly.com" | head -3
```

### 2. n8n

Abrir URL → registro admin solo la primera vez → importar o crear workflows de prueba.

### 3. Uptime Kuma

Abrir URL → crear admin → añadir monitor HTTP (p. ej. `https://api.op-sly.com/api/health`).

### 4. Feedback (portal)

`POST /api/feedback` está pensado para **usuarios autenticados con JWT de portal** (Zero-Trust); no sustituyas tenant/email en el cuerpo. Ver `docs/SECURITY_CHECKLIST.md` y `apps/api/lib/feedback/`. Desde el producto, usar el flujo del portal (`FeedbackChat`) con Bearer.

## Soporte

Usar el email de soporte si está publicado en portal (`NEXT_PUBLIC_SUPPORT_EMAIL`) o el canal acordado con Opsly (p. ej. Discord interno). No pegar secretos en tickets.

## Próximas mejoras (producto / ops)

- Backups automáticos por tenant según `VISION.md` / runbooks.
- Monitoreo proactivo (Uptime + alertas).
- Runbooks de troubleshooting por incidente (ya hay base en `docs/runbooks/`).
