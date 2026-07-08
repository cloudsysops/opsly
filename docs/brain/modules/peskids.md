---
status: active
owner: product
last_review: 2026-07-08
type: module
layer: tenant-vertical
repo_path: apps/peskids
runtime: Next.js 15 (app router)
port: 3004
tags:
  - opsly/module
  - opsly/peskids
  - opsly/tenant-vertical
related_docs:
  - docs/tenants/peskids/README.md
  - docs/tenants/peskids/INCUBATION-CHECKLIST.md
  - config/tenants/peskids.json
---

# Peskids — Módulo de Producto

`apps/peskids` es el vertical de producto para academias de natación. Primer tenant-producto incubado en Opsly. Sirve como referencia de implementación para futuros verticales.

## Arquitectura

```
apps/peskids/
├── app/
│   ├── admin/           → Dashboard admin: leads, alumnos, followups
│   ├── api/             → API routes (webhooks Jelou, WhatsApp, n8n triggers)
│   ├── auth/            → Auth con Supabase (familias + admin roles)
│   ├── familias/        → Portal de familia: perfil, historial, pagos
│   ├── forms/           → Formularios de inscripción y feedback
│   └── reserva-clase-gratuita/ → Landing + captación de leads
├── components/          → UI compartida (shadcn/ui + Tailwind)
├── lib/                 → Servicios, helpers, validación Zod
├── migrations/          → SQL migrations Supabase (schema peskids)
├── scripts/             → Scripts de operación VPS
└── types/               → TypeScript types compartidos
```

## Flujos principales

### Lead → Alumno

```
WhatsApp / Landing → Jelou webhook → apps/peskids/api/webhooks/jelou
→ Supabase (leads table) → n8n (Peskids - Lead Received workflow)
→ Score + clasificación → Notificación admin → Follow-up manual/auto
→ Clase de prueba → Inscripción → Alumno activo
```

### Admin Dashboard

- Gestión de leads con score HOT/WARM/COLD
- CRUD manual de followups (`/admin/followups`)
- Listado de alumnos y renovaciones pendientes
- Vista de familias con historial completo
- Trigger de notificaciones via n8n

### Familia Portal

- Login con email (Supabase Auth)
- Perfil de alumno y asistencias
- Historial de pagos
- DSAR / gestión de datos

## Integraciones activas

| Integración | Estado | Descripción |
|-------------|--------|-------------|
| Jelou | activo | Webhooks WhatsApp + formularios |
| n8n | activo | 17 workflows en `n8n-peskids.op-sly.com` |
| Supabase | activo | Schema propio + RLS por familia |
| Uptime Kuma | activo | Monitoring en `uptime-peskids.op-sly.com` |
| wacrm (WAHA) | pendiente QR | WhatsApp CRM — requiere QR scan en `wa-peskids.op-sly.com` |
| Twenty CRM | activo | CRM en `crm-peskids.op-sly.com` |
| Wompi | NO ACTIVAR | Gateway Colombia — esperar smoke + secrets |

## n8n Workflows clave

| Workflow | Trigger | Estado |
|----------|---------|--------|
| Peskids - Lead Received | Jelou webhook | activo |
| Peskids - Daily digest 8am | Cron 08:00 | activo ✅ |
| Peskids - WhatsApp Outbound | Manual/auto | activo |
| Peskids - Daily Followup Digest | Cron 08:00 | ⚠️ DEPRECADO — 401 Supabase sin auth headers |

> **Bug conocido:** `Peskids - Daily Followup Digest` llama `/rest/v1/followups` sin headers `apikey`+`Authorization` → 401 diario. Reemplazado por `Peskids - Daily digest 8am`. Desactivar el workflow viejo.

## AI en Peskids

Peskids es el tenant de referencia para el patrón Fable 5:

```ts
// Hot lead → Fable genera la respuesta óptima
const response = await llmCall({
  model: score >= 70 ? 'fable' : 'sonnet',
  prompt: `Lead dice: ${message}\nScore: ${score}\nResponde al lead:`,
  tenant_slug: 'peskids',
  request_id: crypto.randomUUID(),
});
```

Ver rubric completa: [[brain/skills/fable5-agent-instructions]]

## Variables de entorno clave

```bash
NEXT_PUBLIC_SUPABASE_URL         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Anon key (público)
SUPABASE_SERVICE_ROLE_KEY        # Service role (server-side únicamente)
DASHBOARD_ADMIN_SECRET           # Auth para admin dashboard
JELOU_WEBHOOK_SECRET             # Verificación HMAC de webhooks Jelou
NEXT_PUBLIC_JELOU_WORKSPACE_ID   # ID workspace Jelou
OPSLY_EVENT_BUS_URL              # orchestrator:3011/events (red Docker)
```

Todos los secretos se gestionan con: `doppler run --project ops-intcloudsysops --config prd`

## Depende de

- [[brain/modules/api|API Control Plane]] — para eventos cross-tenant
- [[brain/modules/orchestrator|Orchestrator]] — BullMQ para tareas async
- [[brain/modules/llm-gateway|LLM Gateway]] — AI para clasificación de leads y respuestas
- Supabase schema `peskids` (separado del schema `platform`)

## Guardrail

- RLS activo en todas las tablas de familias — validar con `npm run audit:prod`
- Admin autenticado con `DASHBOARD_ADMIN_SECRET` (no Supabase Auth)
- No mezclar secrets de Wompi en producción hasta smoke completado
- wacrm: activar solo después de QR scan y smoke OK

## Skill relacionado

[[opsly-peskids]] — skill de sesión para tareas en este vertical
