---
version: "2.0 — Academy Production Complete"
last_updated: 2026-07-07
status: ACADEMY_READY_WITH_EXTERNAL_WARNINGS
---

# Peskids — Client Demo Checklist

> **Stack activo:** Twenty · n8n · Supabase · Peskids Admin · WhatsApp manual (wa.me)  
> **URL prod:** https://peskids.op-sly.com  
> **Guía reunión (21 jul 2026):** [`REUNION-2026-07-21.md`](./REUNION-2026-07-21.md)  
> **Deploy UI polish:** PR [#779](https://github.com/cloudsysops/opsly/pull/779) — merge antes de la cita

---

## Pre-Demo Setup (5 min)

- [ ] Abrir `peskids.op-sly.com` en browser limpio
- [ ] Login admin: `sierrasantiago90@gmail.com`
- [ ] Tener WhatsApp del cliente listo para simular inbound
- [ ] Confirmar API health: `curl https://api.op-sly.com/api/health`

---

## 1. Landing y captación (2 min)

**URL:** `https://peskids.op-sly.com`

- [ ] Landing carga con branding Peskids
- [ ] Formulario visible: nombre, correo, teléfono, modalidad, barrio, nivel
- [ ] Enviar formulario de prueba → debería recibir confirmación
- [ ] **Expected:** `POST /api/leads` → 201, lead aparece en admin

**Qué mostrar:**
- "Cada persona que llena este formulario entra directamente al dashboard"
- "Sin copiar datos a ningún lado"

---

## 2. Admin Dashboard — Leads (3 min)

**URL:** `https://peskids.op-sly.com/admin`

- [ ] Dashboard carga con KPIs
- [ ] Lead recién creado aparece en lista "Interesados"
- [ ] Ver nombre, teléfono, estado, origen
- [ ] Ver botón WhatsApp directo desde el lead
- [ ] Cambiar estado del lead (nuevo → contactado)

**Qué mostrar:**
- "Todo en un solo lugar — no hay que abrir GHL ni otra herramienta"

---

## 3. WhatsApp / wacrm Inbox (3 min)

**URL:** `https://peskids.op-sly.com/admin/messages`

- [ ] Inbox de mensajes carga (puede estar vacío en demo)
- [ ] Explicar flujo: inbound → draft automático → aprobación manual → send
- [ ] Mostrar botón "ir a inbox wacrm" si hay mensajes reales
- [ ] **NOTA:** wacrm activo requiere sidecar VPS + `WACRM_PESKIDS_ENABLED=true`

**Si no hay mensajes reales:** Mostrar captura del inbox + explicar el flujo de aprobación.

**Qué mostrar:**
- "Cada mensaje de WhatsApp llega aquí. Nadie envía nada sin que tú lo apruebas primero."

---

## 4. Follow-ups (2 min)

**URL:** Admin dashboard → sección Seguimientos

- [ ] Ver follow-ups pendientes
- [ ] Crear follow-up desde el dashboard (tipo: llamada, fecha, descripción)
- [ ] Editar follow-up
- [ ] Marcar como completado
- [ ] Ver en el digest diario

**Qué mostrar:**
- "Nadie se olvida de llamar — el sistema te avisa."

---

## 5. Clase de prueba (2 min)

**URL:** Admin dashboard → Clases de prueba

- [ ] Ver clases de prueba programadas
- [ ] Crear clase de prueba para un lead
- [ ] Asignar fecha, hora, modalidad, profesor
- [ ] Cambiar estado (agendada → confirmada → completada)
- [ ] Guardar nota de sesión

**Qué mostrar:**
- "Desde que el papá llena el formulario hasta que el niño nada — todo en el mismo sistema."

---

## 6. Alumno / Familia (3 min)

### Admin side:
- [ ] Convertir lead a alumno
- [ ] Ver alumno en lista de estudiantes
- [ ] Ver datos: nombre, nivel, contacto padre, estado

### Family portal (opcional en demo):
**URL:** `https://peskids.op-sly.com/familias/login`

- [ ] Login con OTP/magic link
- [ ] Portal carga con clases y reservas del estudiante
- [ ] Ver agenda próxima
- [ ] Ver historial de submissions/progreso

---

## 7. Teacher Dashboard (2 min)

**URL:** `https://peskids.op-sly.com/teacher/login`

- [ ] Login como profesor
- [ ] Ver agenda semanal con clases del día
- [ ] Marcar asistencia
- [ ] Guardar notas de sesión
- [ ] Ver métricas básicas (clases hoy, alumnos, submissions pendientes)

---

## 8. Digest Diario (2 min)

**Endpoint:** `GET /api/admin/digest/daily` (requiere auth o cron secret)

**Muestra:**
```json
{
  "leads": { "new_today": 2, "pending": 5 },
  "followups": { "due_today": 1 },
  "messages": { "pending_approval": 3 },
  "trial_classes": { "scheduled_today": 1 },
  "recommended_next_action": {
    "priority": 1,
    "action": "Responder mensajes WhatsApp",
    "detail": "3 conversación(es) wacrm sin respuesta."
  },
  "highlight_lines": ["Resumen diario Peskids — 2026-07-07", ...]
}
```

**Qué mostrar:**
- "Cada mañana a las 8am reciben este resumen en WhatsApp — automático."
- "El sistema les dice qué hacer primero."

---

## 9. Estado Pagos / Wompi

- [ ] Explicar: Stripe está configurado para pagos internacionales
- [ ] Wompi (PSE/Nequi/tarjeta Colombia) está instalado, pendiente sandbox
- [ ] Familias pueden pagar clases desde el portal

**Estado:** `WOMPI_READY_SANDBOX_ONLY`  
**Siguiente paso:** Crear comercio Wompi, obtener llaves sandbox, probar 1 transacción.

---

## 10. Automation / n8n

**Estado:** `READY_NEEDS_N8N_SECRET`

Workflows listos para importar:
- Digest diario 8am
- Alerta lead caliente
- Pipeline wacrm inbound
- Recordatorio follow-up 24h

Para activar: `bash scripts/install-peskids-n8n-workflows.sh`

---

## What Is Ready (Demo Sin Advertencias)

| Feature | Status |
|---------|--------|
| Landing + lead capture | ✅ LIVE |
| Admin dashboard | ✅ LIVE |
| Leads CRUD | ✅ LIVE |
| Follow-ups CRUD | ✅ LIVE (post-deploy) |
| Trial classes | ✅ LIVE |
| Students / families | ✅ LIVE |
| Family portal | ✅ LIVE |
| Teacher dashboard | ✅ LIVE |
| Messages inbox (approval-first) | ✅ LIVE |
| Daily digest + recommended action | ✅ LIVE (post-deploy) |
| Pipeline Active Student → Renewal | ✅ LIVE (post-deploy) |
| Auth (staff/teacher/family) | ✅ LIVE |

## What Requires External Setup

| Feature | Blocker | ETA |
|---------|---------|-----|
| wacrm real inbox | VPS sidecar + `WACRM_PESKIDS_ENABLED=true` | ~2h VPS work |
| n8n automations | `PESKIDS_DIGEST_CRON_SECRET` en Doppler | ~30min |
| Wompi payments | Sandbox credential + test transaction | ~1 día |

## Not Included (Backlog)

- Billing mensual / suscripciones automáticas
- AI copiloto real (digest es determinístico por ahora)
- App móvil nativa
- Reportes BI avanzados
- Multi-sede

---

*Actualizado: 2026-07-07 — Academy Production Completion Loop*
