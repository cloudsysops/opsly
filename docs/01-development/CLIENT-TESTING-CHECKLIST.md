# Checklist de pruebas — Clientes

## Antes de invitar

- [ ] URLs públicas de n8n/uptime responden (HTTP 200/302 según servicio).
- [ ] `GET /api/health` OK en la API pública.
- [ ] Resend configurado (`RESEND_API_KEY`, remitente) y `owner_email` correcto en Supabase.
- [ ] Revisar plantilla en `docs/emails/tenant-welcome-email.md` (opcional).

## Después de invitar

- [ ] Día 1: invitación enviada (`POST /api/invitations` o proceso acordado).
- [ ] Día 2: seguimiento si no hay respuesta.
- [ ] Día 3: recordatorio (plantilla “día 3” en `docs/emails/tenant-welcome-email.md`).
- [ ] Día 7: feedback (plantilla “día 7”).

## Qué verificar con el cliente

### n8n

- [ ] Abre la URL `https://n8n-{slug}.ops.smiletripcare.com`.
- [ ] Creó cuenta admin (primera visita).
- [ ] Importó o creó un workflow.
- [ ] Ejecutó un workflow de prueba.

### Uptime Kuma

- [ ] Abre `https://uptime-{slug}.ops.smiletripcare.com`.
- [ ] Creó cuenta admin.
- [ ] Añadió un monitor.
- [ ] Configuró al menos un canal de notificación.

### Portal

- [ ] Activó invitación y puede iniciar sesión en el portal.
- [ ] Entiende modo developer vs managed (si aplica).

## Feedback a recopilar

1. ¿Qué funcionó bien?
2. ¿Qué mejoraría?
3. ¿Qué integración o flujo necesita a continuación?
4. ¿Algún error o lentitud?

## Soporte

- Responder al hilo de invitación o al contacto comercial.
- Incidencias técnicas: según canal interno Opsly (no publicar secretos en tickets abiertos).
