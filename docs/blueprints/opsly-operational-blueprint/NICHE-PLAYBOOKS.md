---
status: draft
owner: product
last_review: 2026-05-19
---

# Opsly Operational Blueprint — Niche Playbooks

Cómo aplicar el blueprint por vertical. **Un nicho = un MVP acotado.**

## Plantilla por nicho

| Campo | Pregunta |
|-------|----------|
| Core problem | ¿Qué duele cada semana? |
| First dashboard | ¿Qué debe ver el dueño en 30 s? |
| First workflow | ¿Qué automatizar primero? |
| First feedback loop | ¿Cómo saber si va bien? |
| First automation | ¿Qué recordatorio ahorra tiempo? |
| Content opportunities | ¿Qué publicar sin inventar? |

---

## Swim schools / Peskids (ejemplo)

| | |
|-|-|
| **Core problem** | Padres preguntan horarios; leads se pierden en WhatsApp; poca visibilidad de satisfacción. |
| **First dashboard** | Leads esta semana, clases activas, feedback reciente, pendientes follow-up. |
| **First workflow** | Form web → lead → notificación staff → follow-up 48h. |
| **First feedback loop** | Encuesta post-clase (1–5 + comentario). |
| **First automation** | Recordatorio staff si lead sin respuesta; reporte semanal (no auto-envío al padre). |
| **Content opportunities** | Logros alumnos, tips seguridad agua, horarios temporada — borrador IA + aprobación. |

**Nota:** Peskids es referencia incubada; ver `docs/tenants/peskids/`. No definir todo el blueprint solo para natación.

---

## Barber shops

| | |
|-|-|
| **Core problem** | Citas por DM desordenadas; no-shows; sin lista de clientes frecuentes. |
| **First dashboard** | Citas hoy, leads nuevos, clientes sin visita 30 días. |
| **First workflow** | Form / Instagram link → lead → WhatsApp manual template. |
| **First feedback loop** | “¿Cómo estuvo tu corte?” 1 pregunta post-visita. |
| **First automation** | Recordatorio cita (solo tras política aprobada). |
| **Content opportunities** | Antes/después, promos martes, barbero destacado. |

**Evitar:** sistema de citas enterprise tipo Fresha en día 1.

---

## Restaurants

| | |
|-|-|
| **Core problem** | Reservas por teléfono; reseñas dispersas; menú desactualizado. |
| **First dashboard** | Reservas/leads, feedback semana, items menú pendientes. |
| **First workflow** | Form reserva → notificación manager. |
| **First feedback loop** | QR mesa → feedback corto. |
| **First automation** | Reporte semanal reseñas agregadas (manual review). |
| **Content opportunities** | Plato del día, eventos, horario festivo. |

**Evitar:** POS integration en MVP.

---

## Construction / BIM

| | |
|-|-|
| **Core problem** | RFIs y versiones de plano; comunicación obra-oficina lenta. |
| **First dashboard** | Proyectos activos, pendientes aprobación, incidencias abiertas. |
| **First workflow** | Form incidencia obra → registro → assignee. |
| **First feedback loop** | Check-in semanal jefe obra (form interno). |
| **First automation** | Recordatorio documentos vencidos. |
| **Content opportunities** | Avance obra (fotos aprobadas), seguridad, hitos. |

**Evitar:** gemelo digital completo en fase incubación.

---

## Clinics / spas

| | |
|-|-|
| **Core problem** | Recordatorios cita; consentimiento; seguimiento post-servicio. |
| **First dashboard** | Citas, leads tratamiento, feedback NPS simple. |
| **First workflow** | Lead tratamiento → follow-up 72h. |
| **First feedback loop** | Post-visita (privado, sin datos clínicos en texto libre). |
| **First automation** | Recordatorio cita (aprobación + compliance). |
| **Content opportunities** | Cuidados post-tratamiento genéricos (no diagnóstico). |

**Evitar:** almacenar historial clínico sin asesoría legal.

---

## Consultants / agencies

| | |
|-|-|
| **Core problem** | Propuestas lentas; seguimiento comercial débil; reporting cliente manual. |
| **First dashboard** | Pipeline deals, tareas semana, horas (manual). |
| **First workflow** | Lead web → CRM simple → follow-up. |
| **First feedback loop** | NPS trimestral por cliente activo. |
| **First automation** | Reporte semanal borrador para clientes (approval). |
| **Content opportunities** | Casos de éxito anonimizados, tips sector. |

**Evitar:** construir CRM competidor de HubSpot.

---

## Matriz de módulos por nicho

| Módulo | Natación | Barber | Restaurant | BIM | Clínica | Agencia |
|--------|----------|--------|------------|-----|---------|---------|
| Lead Capture | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Feedback Loop | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Follow-up | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Parent/Customer UI | ✓ | · | · | · | ✓ | · |
| Content Workflow | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Weekly Report | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Approval Queue | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Elegir nicho para incubar

1. Dueño comprometido (responde en 48h).  
2. Proceso repetible (no proyecto único de 6 meses).  
3. Datos exportables y bajo riesgo regulatorio inicial.  
4. Presupuesto al menos **Hybrid Recommended**.

Ver [IMPLEMENTATION-CHECKLIST.md](./IMPLEMENTATION-CHECKLIST.md).
