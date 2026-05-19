---
status: draft
owner: product
last_review: 2026-05-18
tenant_slug: peskids
---

# Peskids — plan MVP (incubación Opsly)

## Objetivo del MVP

Dar a Peskids **visibilidad operativa** y un **primer circuito de captación y seguimiento** con control humano, usando lo ya provisto por Opsly (n8n, monitoreo, CRM base) y preparando datos/eventos para un producto propio después.

**Fuera de MVP:** WhatsApp API, mensajes automáticos, IA que publique o envíe sin aprobación, deploy de app independiente, cambios en VPS producción sin ventana acordada.

## Alcance MVP

### 1. Presencia web / landing

- Página o sitio mínimo (puede ser externo al inicio) con formulario de contacto o interés.
- Lead entra por webhook/form → **n8n** (workflow *new lead*) → registro en hoja/DB temporal acordada.
- Métrica: leads por semana, fuente, estado.

### 2. Captura de leads

- Reutilizar **CRM Starter Pack** Opsly donde aplique:
  - Lead capture
  - Hot lead alert (notificación al owner)
  - Follow-up reminder
  - Daily pipeline digest
- Ajustar copy y destinos de notificación a Peskids (owner: `sierrasantiago90@gmail.com`).

### 3. Dashboards (fase MVP — ligero)

| Rol | MVP mínimo |
|-----|------------|
| **Owner / operaciones** | Vista de leads, follow-ups pendientes, feedback reciente, reporte semanal |
| **Padres** | Formulario de feedback (enlace o form); sin app nativa en MVP |
| **Estudiantes** | Fuera de MVP salvo lista estática exportada |
| **Docentes** | Formulario de feedback de clase (opcional MVP+1) |

Implementación MVP preferida: **portal Opsly** solo si ya hay invitación/tenant; si no, **forms + n8n + hoja/Supabase futuro** documentado en [DATA-MODEL.md](./DATA-MODEL.md).

### 4. Feedback de padres

- Workflow *parent feedback*: entrada → categorización manual o IA **solo sugerencia** → cola de revisión owner.
- Sin respuesta automática al padre en MVP.

### 5. Seguimiento (follow-up)

- Workflow *follow-up pending*: recordatorios al equipo; estado `pending` / `done` / `snoozed`.
- Owner confirma cierre; no cierre automático por IA.

### 6. Contenido (ideas)

- Workflow *content idea from operation*: captura ideas desde operación (reunión, clase, WhatsApp manual copiado).
- IA puede **sugerir** borrador de post; publicación **solo** tras aprobación explícita.

### 7. Reporte semanal

- Workflow *weekly owner report*: agregado de leads, feedback, follow-ups abiertos, uptime/n8n health summary.
- Entrega: email o Discord/webhook acordado — **sin** envío autónomo fuera de lista blanca definida.

### 8. IA (approval-first)

Todas las capacidades IA bajo [AI-APPROVAL-POLICY.md](./AI-APPROVAL-POLICY.md).

## Criterios de aceptación MVP

- [ ] Owner confirma email y canal de alertas.
- [ ] Al menos un lead de prueba recorre flujo *new lead* de punta a punta (staging o prod acordado).
- [ ] Un feedback de prueba queda registrado y visible para el owner.
- [ ] Un follow-up de prueba se crea y cierra manualmente.
- [ ] Reporte semanal de prueba generado y revisado por humano.
- [ ] Documentación en `docs/tenants/peskids/` revisada por owner (CLIENT-PITCH + MVP).
- [ ] Ningún mensaje saliente automático a padres/clientes sin aprobación documentada.

## Fases después del MVP

| Fase | Contenido |
|------|-----------|
| MVP+1 | Supabase schema Peskids + API mínima |
| MVP+2 | Dashboard Next.js (incubado o repo semilla) |
| MVP+3 | Integración WhatsApp (Jelou) — approval-first |
| Extracción | Repo `peskids-platform` + eventos Opsly opcionales |

## Dependencias Opsly (sin modificar core)

- Tenant activo en `platform.tenants`
- Stack `tenant_peskids` en VPS (operación)
- n8n workflows (CRM + Peskids-specific cuando se diseñen)
- LLM Gateway solo vía políticas aprobadas y `tenant_slug: peskids`
- Futuro: webhooks salientes documentados en [EXTRACTION-PLAN.md](./EXTRACTION-PLAN.md)

## Riesgos MVP

| Riesgo | Mitigación |
|--------|------------|
| Config plantilla desalineada con VPS | Validar con owner + checklist [INCUBATION-CHECKLIST.md](./INCUBATION-CHECKLIST.md) |
| CRM genérico no encaja con negocio educativo | Workflows Peskids en [WORKFLOWS.md](./WORKFLOWS.md) |
| Scope creep (WhatsApp, app móvil) | Mantener MVP acotado; extracción planificada |
