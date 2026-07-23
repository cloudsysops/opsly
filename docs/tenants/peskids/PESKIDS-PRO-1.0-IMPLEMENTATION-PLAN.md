---
status: active
owner: operations
last_review: 2026-07-22
type: tenant
tags:
  - opsly/tenant
  - peskids/pro-1.0
---

# Peskids Pro 1.0 — Plan de implementación

> Documento canónico del programa "Peskids Pro 1.0": lleva Peskids del MVP actual a un sistema
> operativo completo de captación → seguimiento → clase de prueba → matrícula → sincronización
> Twenty, sin tocar Meta Cloud API / WABA / WACRM runtime (fase independiente y posterior).
>
> Referencias que este documento complementa, no reemplaza:
> [`EVENT-CONTRACT.md`](./EVENT-CONTRACT.md) (contrato de eventos existente),
> [`DAILY-DIGEST-RUNBOOK.md`](./DAILY-DIGEST-RUNBOOK.md) (digest ya en producción),
> [`TWENTY-CRM.md`](./TWENTY-CRM.md) (desactualizado a jun-2026, ver nota abajo),
> [`REUNION-2026-07-21.md`](./REUNION-2026-07-21.md) (última demo real al cliente).

---

## 1. Estado actual (auditoría 2026-07-22)

### Captación de leads

- `POST /api/leads` valida con Zod (`lib/validation/lead.schema.ts`) y delega el insert real a
  `apps/api` vía `postPeskidsCanonicalLead()` (`lib/peskids-canonical-api.ts:101-157`) —
  Peskids no inserta directamente, es un proxy validado.
- `sendLeadToTwenty()` (`apps/peskids/lib/twenty-lead-sync.ts:73-106`) crea Person + Opportunity
  en Twenty; falla silenciosamente (try/catch + `console.warn`) sin bloquear el guardado.
- Ya existen eventos reales: `lead.created`, `feedback.created`, `feedback.alert`
  (`lib/events.ts`, documentados en `EVENT-CONTRACT.md`). No existe `lead.contacted`,
  `lead.status_changed`, `lead.lost`, ni ningún evento de followup/trial/enrollment.

### Estado de leads — dos fuentes

- Fuente real usada por el admin: **`platform.peskids_leads`**
  (`lib/services/lead-admin.service.ts`), enum `new | contacted | trial | enrolled | archived`
  (`lib/validation/lead-admin.schema.ts`), mapeado a stages `new | contacted | qualified |
  converted | lost` (`mapAdminStatusToPlatform`).
- `public.leads` (creada en `migrations/001_create_peskids_schema.sql`) es legado — cualquier
  PR nuevo se construye contra `platform.peskids_leads`, no contra esta.

### Seguimientos (followups)

- Tabla `public.followups` + rutas `app/api/admin/followups/*`.
- **`POST /api/admin/followups/execute` ya sincroniza con Twenty Tasks**
  (`lib/services/followup-admin.service.ts`): crea Task al crear followup, sincroniza status al
  actualizar, guarda `twenty_task_id` (columna agregada en
  `migrations/20260706_add_twenty_task_id_to_followups.sql`). El diseño ya asume Peskids como
  fuente de verdad ("staff work entirely from this CRUD, never opening Twenty").
- Enum real: `type: call | email | sms | in-person`, `status: pending | completed | cancelled`
  (`lib/validation/followup.schema.ts`). No hay `sync_status`, `sync_error`, `retry_count`.

### Clases de prueba (trials)

- Tabla `trial_classes` + rutas `app/api/admin/trial-classes/*`.
- Estado real: `scheduled | confirmed | attended | no_show | cancelled`
  (`lib/validation/trial-class.schema.ts`) — usa `attended`, no `completed`.

### Digest diario

- **Ya existe y está en producción**: `GET /api/admin/digest/daily` +
  `lib/services/daily-digest.service.ts` (439 líneas), documentado en `DAILY-DIGEST-RUNBOOK.md`.
  Incluye leads/followups/mensajes/trials del día + `highlight_lines[]` listos para
  email/WhatsApp.
- **No existe** alerta hot-lead disparada de forma no bloqueante desde `POST /api/leads` con
  estado de entrega observable e idempotencia (PR-PRO-1).
- **Workflows n8n en repo:** exports en `.n8n/1-workflows/peskids/` (p. ej. `hot-lead-alert.json`,
  `peskids-daily-digest.json`, `peskids-followup-24h.json`, `peskids-notify.json`,
  `peskids-lead-capture.json`). Instalador: `scripts/install-peskids-n8n-workflows.sh`.
  **Falta** la ruta canónica pedida por este programa: `infra/n8n/workflows/peskids/` (PR-PRO-1
  debe copiar/alinizar exports ahí y validar que coinciden con el contenedor VPS).

### Health check

- `app/api/health/route.ts` es un stub trivial (`{status:'ok'}`) — no verifica Supabase, Twenty,
  n8n ni Resend.

### Roles y permisos

- Leads/followups/trials están gateados por `isAdminSurfaceUser` (`owner`/`admin` únicamente,
  `lib/staff-user.ts`). El rol `support` no tiene acceso a estas rutas hoy.

### Auditoría de negocio

- No existe ningún `audit_log` de negocio (cambios de estado de lead/followup/trial) — solo
  `updated_at`. `lib/shadow-audit-store.ts` es de un canal conversacional experimental no
  relacionado.

### CI/CD

- **`apps/peskids` no estaba cubierto por los jobs `lint`/`test-unit` de
  `.github/workflows/ci.yml`** — solo `build`. PR-PRO-0 agrega `npm run type-check` y
  `npm test` para peskids, más `npx eslint .` real.
- **Hallazgo:** ESLint 9+ resuelve flat config subiendo desde el cwd — sin un
  `eslint.config.*` propio, `cd apps/peskids && npx eslint .` heredaba el flat config
  **raíz** del monorepo (mucho más estricto que el `.eslintrc.json` propio de peskids),
  exponiendo ~3826 errores preexistentes en archivos no tocados por este PR. Se agregó
  `apps/peskids/eslint.config.mjs` (mismo patrón `FlatCompat` que usa la raíz, apuntando
  al `.eslintrc.json` de peskids) — `npx eslint .` ahora reporta 0 errores, 16 warnings
  preexistentes menores, igual que `next lint`.

### Migraciones

- `apps/peskids/migrations/*.sql` es un espejo local — la fuente canónica real son los archivos
  numerados en `supabase/migrations/` (0057–0085, ver `MIGRATION_ORDER.md`).

### Integración Twenty CRM

- `lib/services/twenty/client.ts` (`TwentyClient`): `createPerson`, `findPersonByEmail`,
  `createOpportunity`, `createTask`, `updateTask`, `createTaskTarget`. **No existe
  `updateOpportunity`/cambio de stage** — la Opportunity se crea una vez con
  `resolveTwentyEnv().defaultOpportunityStage` fijo y nunca se mueve.
- IDs externos guardados: `twenty_person_id`, `twenty_opportunity_id`
  (`platform.peskids_leads`), `twenty_task_id` (`followups`).
- **Nota de vigencia:** `TWENTY-CRM.md` (jun-2026) dice "sin contenedor Twenty en VPS", pero los
  commits de julio ("align Twenty lead sync with live API", #750) y la guía de demo del
  21-jul-2026 (`REUNION-2026-07-21.md`, tarjeta "Conexiones activas → Twenty") indican que **hoy
  sí está vivo**. Verificar con un health check real antes de diseñar PR-PRO-3 en detalle — no
  asumir ninguno de los dos documentos por sí solo.
- No hay retry/dead-letter — los fallos solo se loguean.

### n8n

- Exports versionados en `.n8n/1-workflows/peskids/` (13 JSON + README). Hot-lead actual suele
  depender de polling externo, no de evento post-save con delivery log.
- Destino canónico del programa: `infra/n8n/workflows/peskids/` (aún no creado).
- Antes de activar flags en prod: comparar export git ↔ workflows reales en
  `https://n8n-peskids.op-sly.com`.

### WhatsApp manual (wa.me)

- `lib/contact-channels.ts` (`buildWhatsAppUrl`) y `lib/integrations/wacrm-admin-links.ts`
  (`buildWhatsAppDeepLink`) — ambas puramente `https://wa.me/...`, sin SDK de Meta. Confirmado
  limpio.

### GHL

- Legado intencional, apagado por defecto (`isPeskidsGhlEnabled()` → `false`), rutas marcadas
  `LEGACY`. No tocar `lib/services/gohighlevel/`.

### WACRM / Meta

- Vive en un **paquete/servicio externo** `@intcloudsysops/wacrm-channel` — Peskids solo lee
  filas de estado y abre un link externo; el botón de inbox está `disabled`.
  `REUNION-2026-07-21.md` lo confirma: *"WhatsApp masivo: manual hoy; WACRM cuando activen
  sidecar"*. El runtime Meta/WABA no vive dentro de `apps/peskids` — este programa puede avanzar
  sin rozarlo.

### Academy Blueprint

- Widget `academy-ops-map.tsx` en `/admin#academy` (mapa de estado por dominio: leads, families,
  teachers, classes, calendar, reservations, payments, automations, reminders). Este programa
  debe mantenerlo funcional (regla #24), no reemplazarlo.

### Tenant-awareness

- Patrón real: `process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'` + `config/tenants/peskids.json`.
- **Triple schema de Postgres** para un mismo tenant: `public` (students/feedback/followups),
  `peskids` (classes/class_enrollments/payments), `platform` (peskids_leads). Toda migración
  nueva debe elegir schema deliberadamente, documentado en la sección 7.

---

## 2. Componentes reutilizables

| Componente | Para qué sirve en el programa |
| --- | --- |
| `lib/services/lead-admin.service.ts` | Mapeo de estados de lead — patrón a seguir en PR-PRO-3/5 |
| `lib/services/followup-admin.service.ts` | Patrón de sync a Twenty Tasks ya resuelto — replicar para otros syncs |
| `lib/services/daily-digest.service.ts` + `/api/admin/digest/daily` | Base lista para PR-PRO-1 |
| `lib/services/twenty/client.ts` + `env-config.ts` (`parseBooleanFlag`) | Cliente Twenty + patrón de flags a reusar en todos los `PESKIDS_*_ENABLED` |
| `lib/contact-channels.ts` / `lib/integrations/wacrm-admin-links.ts` | wa.me ya correcto — no reinventar |
| `lib/staff-user.ts` | Guards de rol (`isAdminSurfaceUser`, `isStaffUser`, `isSupportSurfaceUser`) |
| `components/admin/academy-ops-map.tsx` | Patrón de widget de estado operativo — modelo para PR-PRO-8 |
| `config/tenants/peskids.json` | Patrón de metadata tenant-aware |
| `lib/events.ts` (extendido en este PR) | Catálogo de eventos de dominio — base para PR-PRO-1/3/4/9 |

---

## 3. Arquitectura

```text
Landing (apps/peskids)
  → POST /api/leads (Zod) → apps/api (insert real, platform.peskids_leads)
       → sendLeadToTwenty() (Person + Opportunity, best-effort)
       → emitEvent('lead.created') (best-effort, OPSLY_EVENT_BUS_URL opcional)

Admin (apps/peskids /admin)
  → lead-admin.service.ts (CRUD sobre platform.peskids_leads)
  → followup-admin.service.ts (CRUD + sync Twenty Tasks)
  → trial-class routes (CRUD sobre trial_classes)
  → daily-digest.service.ts (GET /api/admin/digest/daily)

n8n (VPS, no versionado)
  → polling/cron → llama endpoints admin con cron secret
  → futuro: hot-lead-alert, daily-digest push (PR-PRO-1)

Twenty CRM (externo, vía TwentyClient)
  → Person/Opportunity/Task — hoy solo creación, sin update de stage (PR-PRO-3)

WACRM (servicio externo separado, @intcloudsysops/wacrm-channel)
  → fuera de alcance de este programa
```

Regla dura: **una caída de Twenty, n8n o Resend nunca impide guardar un lead en Supabase** — todo
sync externo es best-effort/try-catch, patrón ya establecido en `sendLeadToTwenty()` y a replicar
en cada PR nuevo.

---

## 4. Modelo de datos (contratos canónicos — PR-PRO-0)

Definidos en `apps/peskids/lib/domain/`:

- Tipos: `peskids-pro-contracts.ts`
- Mappers puros (admin ↔ platform ↔ Pro ↔ Twenty slug): `peskids-pro-mappers.ts`
- Barrel: `lib/domain/index.ts`
- Tests: `lib/__tests__/peskids-pro-mappers.test.ts`

Contratos objetivo:

- `LeadStatus`: `new | contacted | trial_scheduled | trial_completed | enrolled | lost`
- `FollowUpStatus`: `pending | completed | cancelled | overdue`
- `FollowUpType`: `call | whatsapp | email | other`
- `TrialStatus`: `scheduled | confirmed | completed | no_show | cancelled`
- `LeadSource`: `website | instagram | facebook | referral | whatsapp | other`
- `IntegrationSyncStatus`: `pending | synced | failed | retrying | skipped`

Estos son tipos **objetivo**, no cambian ningún enum de Zod/CHECK constraint existente. La
migración real de cada enum ocurre en el PR que la necesita (ver sección 7). En PR-PRO-0 los
mappers documentan la adaptación (`trial`↔`trial_scheduled`, `archived`↔`lost`,
`attended`↔`completed`) sin cablear runtime.

Eventos de dominio (`apps/peskids/lib/events.ts`, catálogo `PESKIDS_PRO_EVENT_NAMES`):

`lead.created` (ya real) · `lead.contacted` · `lead.status_changed` · `lead.lost` ·
`followup.created` · `followup.completed` · `followup.overdue` · `trial.scheduled` ·
`trial.completed` · `trial.no_show` · `student.enrolled`

Solo `lead.created`/`feedback.created`/`feedback.alert` se emiten hoy. El resto es catálogo, sin
lógica runtime nueva (criterio de PR-PRO-0: si se elimina, la app se comporta igual).

---

## 5. Flujos

Flujo objetivo (sin cambios respecto al pedido original):

```text
Landing → interesado → alerta operativa → email de confirmación → seguimiento
  → contacto manual WhatsApp (wa.me) → clase de prueba → conversión a estudiante
  → actualización Twenty → métricas ejecutivas
```

Estado de cada tramo hoy: ver sección 1. Tramos ya operativos: captación, seguimientos↔Twenty
Tasks, digest diario, clases de prueba (CRUD). Tramos por construir: alerta hot-lead, email de
confirmación, stage-sync a Twenty, reglas de aging, ficha 360, Kanban, dashboard ejecutivo,
wizard de matrícula.

---

## 6. Riesgos

1. **CI no cubría type-check/unit de peskids** — corregido en este PR (eslint completo
   diferido a PRO-11 por deuda preexistente).
2. **Triple schema** (`public`/`peskids`/`platform`) para un solo tenant — elegir schema con
   cuidado en cada migración nueva.
3. **Doble fuente de estado de leads** (`public.leads` legado vs `platform.peskids_leads` real) —
   construir siempre contra la segunda.
4. **Twenty sin capacidad de update de stage** — PR-PRO-3 requiere extender el cliente, no solo
   la app.
5. **n8n git vs VPS** — exports en `.n8n/` pueden divergir del contenedor; PR-PRO-1 debe
   reconciliar y publicar en `infra/n8n/workflows/peskids/`.
6. **Docs de Twenty con vigencia dudosa** — verificar en vivo antes de PR-PRO-3 (ver nota sección 1).
7. **Email / Resend** — el monorepo ya usa Resend (invitaciones, notificaciones de plataforma).
   **No** hay confirmación de lead al acudiente hoy; PR-PRO-2 reutiliza Resend con flags off.
8. **Purga de datos demo ya ejecutada** (PR #779, commit `ca4c5b90`, 21-jul-2026,
   `scripts/purge-peskids-demo-data.sh`) — producción está intencionalmente sin datos demo desde
   la reunión con el cliente. Cualquier prueba de este programa en producción debe usar datos
   reales o un tenant/entorno de prueba, no asumir que existen seeds demo.

---

## 7. Secuencia de PRs

| PR | Alcance | Migraciones |
| --- | --- | --- |
| **PR-PRO-0** ✅ | Contratos canónicos + mappers + CI coverage peskids + este documento | Ninguna |
| **PR-PRO-1** ✅ | Hot-lead alert (event webhook) + digest Discord gate + exports en `infra/n8n/workflows/peskids/` | Ninguna (delivery log estructurado en stdout; tabla opcional diferida) |
| **PR-PRO-2** ✅ | Email de confirmación (Resend u otro ya adoptado) | Tabla `platform.peskids_lead_email_deliveries` (pending/sent/failed/skipped) + idempotency key |
| **PR-PRO-3** ✅ | Embudo Peskids → Twenty (stage-sync real) | Columnas `twenty_sync_status`, `twenty_sync_error`, `twenty_synced_at` en `platform.peskids_leads` |
| **PR-PRO-4** ✅ | Seguimientos ↔ Twenty Tasks (observabilidad) | Columnas `sync_status`, `sync_error`, `retry_count` en `followups` |
| **PR-PRO-5** ✅ | Reglas 24h/48h sin contacto | Tabla `platform.peskids_aging_alert_deliveries` (idempotencia) |
| **PR-PRO-6** ✅ | Ficha 360° del interesado (`/admin/interesados/[id]`) | Ninguna |
| **PR-PRO-7** (este) | Pipeline Kanban (`/admin/pipeline`) | Ninguna |
| PR-PRO-8 | Dashboard ejecutivo (extiende `dashboard-view.tsx` existente) | Ninguna |
| PR-PRO-9 | Conversión a estudiante | Probablemente ninguna — `source_lead_id` ya vincula lead↔estudiante (migración `20260609`) |
| PR-PRO-10 | Agenda y clases de prueba Pro | Ninguna, o índice para queries de calendario |
| PR-PRO-11 | Pulido UX, mobile y accesibilidad (extiende design system `pk-*` existente) | Ninguna |
| PR-PRO-12 | Observabilidad, runbooks y cierre | Posible `audit_log` genérico tenant-aware — punto de decisión de producto, no asumido |

Un PR = una sola capacidad coherente. No combinar salvo justificación explícita.

---

## 8. Dependencias críticas entre PRs

- PR-PRO-3 depende de verificar que Twenty esté realmente vivo en VPS (ver riesgo 6).
- PR-PRO-4 comparte esa misma dependencia.
- PR-PRO-5 depende de la infraestructura de alertas de PR-PRO-1 para tener a quién notificar.
- PR-PRO-6/7/8 deben construirse contra `platform.peskids_leads`, no la tabla legada.
- PR-PRO-9 depende de que PR-PRO-6 exista como punto de entrada natural para "Matricular
  estudiante".

---

## 9. Criterios de aceptación (globales, ver también checklist original del programa)

- El lead se guarda primero en Supabase; una caída de Twenty/n8n/Resend nunca lo impide.
- CI verde para peskids significa algo real (lint + typecheck + test, no solo build).
- Sin secretos en el repo — todo vía Doppler.
- Sin GHL activo, sin runtime Meta/WACRM nuevo — WhatsApp sigue siendo manual vía `wa.me`.
- Cada PR es reversible y no rompe producción.
- Documentación y runbooks actualizados en cada PR que los afecte.

---

## 10. Estrategia de rollback

- Cada PR es un commit/squash aislado en su propia rama — revert directo en `main` si CI o smoke
  post-deploy fallan.
- Migraciones nuevas siguen el patrón `IF NOT EXISTS` / aditivo — ninguna elimina columnas o
  tablas existentes, por lo que un revert de código no dejar datos huérfanos.
- Flags de feature (`PESKIDS_*_ENABLED`) permiten apagar comportamiento nuevo sin revertir código
  si algo falla en producción después del deploy.
- Ya existe precedente de purga/reset controlado: `scripts/purge-peskids-demo-data.sh`
  (PR #779) — mismo patrón de script idempotente + `--dry-run` a seguir para cualquier rollback
  de datos que este programa necesite.

---

## 11. Tareas manuales

- Verificar en vivo si el contenedor Twenty corre en VPS antes de diseñar PR-PRO-3 en detalle.
- Diff n8n VPS ↔ `.n8n/1-workflows/peskids/` antes de PR-PRO-1; publicar en
  `infra/n8n/workflows/peskids/`.
- Decidir si `audit_log` (PR-PRO-12) entra en este programa o se difiere.
- Confirmar `PESKIDS_EMAIL_FROM` / reply-to y SLA (`PESKIDS_CONTACT_SLA_HOURS`, default 48)
  con Sierra antes de activar confirmación en prod.
- Timezone operativo asumido: `America/Bogota` (confirmar).

---

## 12. Exclusiones Meta / WACRM (recordatorio)

Fuera de alcance de todo este programa: Meta WhatsApp Cloud API, webhooks Meta, WABA, Phone
Number ID, envío de mensajes por Meta, runtime WACRM, inbox de WhatsApp Business, bots de
WhatsApp, respuestas automáticas, campañas/envíos masivos, migración del número principal, GHL,
pagos Wompi/Stripe, portal familiar completo, app móvil nativa, IA autónoma que contacte
clientes. WhatsApp sigue siendo manual: Admin → botón WhatsApp → `wa.me` → conversación manual
fuera de Peskids. La integración Meta es una fase posterior e independiente.
