# Guía de testing para tenants (staging)

**Checklist corto:** [`TENANT-TESTING-PLAN.md`](TENANT-TESTING-PLAN.md).

Dominio base de ejemplo en staging: `ops.smiletripcare.com`. Sustituye `<slug>` por el slug de tu tenant (p. ej. `localrank`, `jkboterolabs`).

## 1. Verificar que el stack está activo

- **n8n:** `https://n8n-<slug>.ops.smiletripcare.com` — esperado: **HTTP 200** en la raíz (tras TLS).
- **Uptime Kuma:** `https://uptime-<slug>.ops.smiletripcare.com` — suele responder **302** a la página de login (normal).

Comprobar desde tu máquina:

```bash
curl -sI --max-time 10 "https://n8n-<slug>.ops.smiletripcare.com" | head -3
curl -sI --max-time 10 "https://uptime-<slug>.ops.smiletripcare.com" | head -3
```

En el servidor (compose por tenant), los compose viven bajo `/opt/opsly/tenants/` como `docker-compose.<slug>.yml`.

## 2. Acceder a n8n

1. Abrir la URL de n8n en el navegador.
2. Completar el registro de la cuenta de administrador **solo la primera vez** (instancia nueva).
3. Importar o crear workflows de prueba según tu runbook interno.

## 3. Verificar Uptime Kuma

1. Abrir la URL de Uptime.
2. Crear la cuenta de administrador en el primer acceso.
3. Añadir un monitor de prueba (HTTP/TCP) hacia un endpoint público conocido.

## 4. Portal y API (producto)

- **Portal:** login e invitación según flujo documentado en `AGENTS.md` (invitación admin → email → activación).
- **Salud de la API:** `GET https://api.<dominio>/api/health` — `checks.supabase` debe ser `ok` si el proyecto Supabase responde (tras el chequeo de alcanzabilidad documentado en el código de health).

## 5. Feedback y mejoras (sin duplicar rutas)

- **Feedback desde el portal (usuario autenticado):** `POST /api/feedback` con JWT de portal; ver implementación en `apps/api/lib/feedback/` y UI `apps/portal/components/FeedbackChat.tsx`.
- **OpenClaw / MCP / orquestador:** arquitectura orientativa en `docs/OPENCLAW-ARCHITECTURE.md`; MCP en `apps/mcp/`, orquestador en `apps/orchestrator/`.

No se añade un segundo endpoint paralelo de “tenant feedback” en la API: el canal oficial de mensajes del tenant hacia plataforma es el flujo de feedback existente más invitaciones/admin.

## 6. Reportar incidencias

Incluye: captura de pantalla, URL exacta, hora (UTC), mensaje de error del navegador o cuerpo de respuesta HTTP relevante (sin pegar secretos).

Si el producto publica un email de soporte vía `NEXT_PUBLIC_SUPPORT_EMAIL`, úsalo en el portal; si no, contacta por el canal acordado con Opsly.
