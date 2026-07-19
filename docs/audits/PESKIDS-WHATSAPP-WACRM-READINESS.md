---
status: audit-phase-0
created: 2026-07-19
updated: 2026-07-19
phase: 0-repository-audit
decision: BLOCKED-PLANNING
---

# PESKIDS + WhatsApp + WACRM Integration — Readiness Audit

**Audit Date:** 2026-07-19  
**Auditor Role:** Architect + DevOps Senior + Full-Stack Developer  
**Scope:** Integration of Peskids with Meta WhatsApp Cloud API, WACRM, n8n, Twenty CRM, and Opsly ecosystem  

---

## 1. ESTADO ACTUAL ENCONTRADO

### 1.1 Servicios Existentes ✅

| Servicio | Estado | Ubicación | Notas |
|----------|--------|-----------|-------|
| **Peskids App** | ✅ Activo | `apps/peskids/` | Next.js + React, mobile (Capacitor), full schema |
| **Peskids API** | ✅ Activo | `apps/api/` | routes peskids existentes, GHL webhook integrado |
| **Peskids Admin** | ✅ Activo | `apps/admin/` | Next.js, dashboard KPI, integration status |
| **Twenty CRM** | ✅ Dockerizado | `infra/docker-compose.twenty.yml` | Auto-servicios: server, db, redis, email via Resend |
| **n8n** | ⚠️ Parcial | `infra/docker-compose.n8n-mcp.yml` | MCP overlay disponible; solo para Peskids via webhooks |
| **Supabase** | ✅ Integrado | Remoto (`jkwykpldnitavhmtuzmo`) | RLS activo, migrations para peskids |
| **Opsly Orchestrator** | ✅ Activo | `apps/orchestrator/` | BullMQ + Temporal, webhooks, fire-and-forget |
| **Opsly LLM Gateway** | ✅ Activo | `apps/llm-gateway/` | inference routing |
| **Opsly MCP** | ✅ Activo | `apps/mcp/` | tools, context resources |
| **Opsly Context Builder** | ✅ Activo | `apps/context-builder/` | v2 staging en `apps/context-builder-v2/` |
| **Traefik** | ✅ Proxy | `infra/` | Labels en docker-compose, HTTPS, redirección |
| **Uptime Kuma** | ✅ Monitoring | Compuesto | health checks básicos |
| **GitHub Actions** | ✅ CI/CD | `.github/workflows/` | build-and-push, deploy, nightly-fix |
| **VPS Docker Compose** | ✅ Orquestado | `/opt/opsly` | DigitalOcean, Tailscale, compose platform |
| **Doppler** | ✅ Secret Manager | `ops-intcloudsysops/prd` | 18 secrets mínimos configurados |

### 1.2 Integración GoHighLevel (Obsoleta) ⚠️

**ENCONTRADO:** Sistema de integración completo con GHL que DEBE ELIMINARSE.

| Componente | Ubicación | Líneas | Acción |
|-----------|-----------|--------|--------|
| **Client GHL** | `lib/services/gohighlevel/client.ts` | ~400 líneas | Eliminar |
| **Service GHL** | `lib/services/gohighlevel/service.ts` | ~300 líneas | Eliminar |
| **Types GHL** | `lib/services/gohighlevel/types.ts` | ~200 líneas | Eliminar |
| **Env Config GHL** | `lib/services/gohighlevel/env-config.ts` | ~80 líneas | Eliminar |
| **Webhook GHL** | `apps/api/app/api/public/tenants/peskids/webhooks/gohighlevel/leads/route.ts` | 164 líneas | Reemplazar |
| **Peskids GHL** | `apps/peskids/lib/services/gohighlevel/` | ~150 líneas | Eliminar |
| **Provisioning GHL** | `packages/provisioning/src/ghl-provisioner.ts` | ~500 líneas | Refactorizar o eliminar |
| **Tests GHL** | `lib/services/gohighlevel/__tests__/` | ~400 líneas | Eliminar |
| **Docs GHL** | `runtime/context/peskids-goals.json` | Referencias | Archivar |

**Total:** ~2200 líneas de código GHL a eliminar o migrar.

### 1.3 Estructura Actual de Peskids

```
apps/peskids/
├── app/                          # Routes + layouts
│   ├── admin/                    # Private admin routes
│   ├── landing/                  # Public landing pages
│   └── [tenantSlug]/            # Tenant routes
├── components/
│   ├── admin/                    # Admin dashboard (KPI, integration status, analytics)
│   ├── forms/                    # Form components
│   └── ...
├── lib/
│   ├── services/
│   │   ├── gohighlevel/         # ⚠️ ELIMINAR
│   │   └── ...
│   ├── integrations/
│   │   ├── peskids-provider-config.ts
│   │   └── ...
│   ├── auth-public-config.ts
│   └── ...
├── migrations/                   # SQL: 20 migraciones (001-011, timestamps)
│   ├── 001_create_peskids_schema.sql
│   ├── 011_add_ghl_contact_id.sql
│   └── 20260706_add_women_payment_provider.sql
├── .env.example                  # Vars completas
├── CLAUDE.md                     # Guía propia
└── DEPLOYMENT.md

Tablas Supabase (20260706):
├── peskids_leads
├── peskids_messages
├── peskids_message_threads
├── peskids_message_approvals
├── peskids_notifications
├── peskids_push_subscriptions
├── peskids_classes
├── peskids_calendar_events
├── peskids_payments
├── peskids_referrals
├── peskids_lead_feedback
├── peskids_families
├── peskids_students
├── peskids_tenant_settings        # tenant_id, feature flags, integrations
└── ... (más detalles en 001_create_peskids_schema.sql)
```

### 1.4 Rutas API Existentes Relacionadas con Peskids

**Webhook Entrantes:**
- ✅ `POST /api/public/tenants/peskids/webhooks/gohighlevel/leads` — **GHL (OBSOLETA)**
- ✅ `POST /api/public/tenants/peskids/leads` — Captura de leads pública
- ✅ `POST /api/public/tenants/peskids/feedback` — Feedback público

**Admin Routes:**
- ✅ `GET /api/admin/peskids/[slug]/executive` — Dashboard ejecutivo
- ✅ `PATCH /api/admin/peskids/[slug]/leads/[leadId]/stage` — Actualizar stage (+ sync Twenty)
- ✅ `GET /api/admin/peskids/[slug]/messages/pending` — Mensajes pendientes aprobación
- ✅ `POST /api/admin/peskids/[slug]/messages/[messageId]/approve` — Aprobar mensaje
- ✅ `POST /api/admin/peskids/[slug]/followups/execute` — Ejecutar follow-up
- ✅ `GET /api/admin/peskids/[slug]/followups/pending` — Follow-ups pendientes

**Portal Routes:**
- ✅ `POST /api/peskids/portal/[tenantSlug]/forms/[formId]/responses` — Respuestas de formularios
- ✅ `GET /api/peskids/admin/[tenantSlug]/forms/analytics` — Analytics de formularios

**Health:**
- ❌ `/api/health/integrations` — Falta (propuesto)
- ❌ `/api/health/whatsapp` — Falta (propuesto)

### 1.5 Variables de Entorno Actuales

**Doppler (`ops-intcloudsysops/prd`) — existentes:**

```bash
SUPABASE_URL=https://jkwykpldnitavhmtuzmo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<redacted>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<redacted>

TWENTY_API_URL=https://crm-peskids.op-sly.com
TWENTY_API_KEY=<redacted>
TWENTY_SERVER_URL=https://crm-peskids.op-sly.com
TWENTY_APP_SECRET=<redacted>
TWENTY_ENCRYPTION_KEY=<redacted>
TWENTY_PG_PASSWORD=<redacted>

# GHL — OBSOLETO
PESKIDS_GHL_LOCATION_ID=<redacted>
PESKIDS_GHL_API_KEY=<redacted>
PESKIDS_GHL_API_BASE_URL=https://rest.gohighlevel.com/v1

N8N_WEBHOOK_BASE_URL=http://n8n-peskids:5678/webhook
PESKIDS_INBOUND_WEBHOOK_SECRET=<redacted>

RESEND_API_KEY=<redacted>
PLATFORM_DOMAIN=op-sly.com
```

**Faltantes (Propuestos para WhatsApp/WACRM):**
```bash
# Meta WhatsApp Cloud API
META_APP_ID=
META_APP_SECRET=
META_VERIFY_TOKEN=
META_ACCESS_TOKEN=
META_WABA_ID=
META_PHONE_NUMBER_ID=
META_API_VERSION=v21.0

# WACRM (si aplica)
WACRM_BASE_URL=https://wa-peskids.op-sly.com
WACRM_API_KEY=
WACRM_WEBHOOK_SECRET=

# Opsly WhatsApp Feature Flags
META_WEBHOOK_ENABLED=false
WACRM_ENABLED=false
PESKIDS_WHATSAPP_ENABLED=false
PESKIDS_WHATSAPP_PROVIDER=wacrm|meta  # enum
PESKIDS_WHATSAPP_SANDBOX=true
PESKIDS_WHATSAPP_APPROVAL_REQUIRED=true
```

### 1.6 Integraciones Twenty CRM ✅

**Estado:** Funcional, pero básico.

**Existente:**
- Docker Compose: servidor, db, redis (auto-arranca)
- Schema Peskids: campos `twenty_person_id`, `twenty_opportunity_id`
- API Key: almacenada en Doppler
- Dashboard KPI: muestra `Sync Twenty OK`

**Faltantes:**
- ❌ Funciones tipadas: `findPersonByPhone()`, `upsertPerson()`, `createOpportunity()`
- ❌ Retry logic para fallos de sincronización
- ❌ Webhook de Twenty para cambios bidireccionales
- ❌ Detalles de mapeo Person → lead (campos específicos)

### 1.7 Integración n8n ⚠️

**Estado:** Parcial, webhooks locales.

**Existente:**
- Docker Compose: servicio n8n_peskids (puerto 5678)
- Webhooks: references en `.env.example` (`NEXT_PUBLIC_N8N_LEAD_WEBHOOK`, `N8N_WEBHOOK_BASE_URL`)
- Workflows: mencionados pero **NO exportados** (`peskids-whatsapp-lead-intake`, etc.)

**Faltantes:**
- ❌ Workflows JSON versionados en `infra/n8n/workflows/peskids/`
- ❌ Secretos/credenciales tipadas
- ❌ Documentación de flujos (inbound → Supabase → Twenty → clasificación)
- ❌ Retry y manejo de errores declarado
- ❌ Tenant-aware filtering

### 1.8 Servicios WhatsApp Existentes

**Encontrado:** `lib/openwa/` — implementación OpenWA (cliente alternativo WhatsApp).

**Estado:** Preparada pero **NO INTEGRADA** en producción.

**Ubicación:** `lib/openwa/src/`
- `types.ts` — tipos OpenWA estándar
- `client.ts` — cliente HTTP a OpenWA server
- `webhook.ts` — manejo de webhooks
- `verify.ts` — verificación de sesión
- `config.ts` — configuración
- `tenant-messaging.ts` — mensajería por tenant
- `__tests__/` — pruebas existentes

**Limitación:** OpenWA es para cliente WhatsApp, no para Meta Cloud API. WACRM es el bridge hacia Meta.

### 1.9 Integración Producción (VPS)

**Infraestructura:**
- VPS DigitalOcean: `vps-dragon@100.120.151.91` (Tailscale only)
- Docker Compose: `infra/docker-compose.platform.yml` (principal)
- Traefik: proxy HTTPS, labels configurados
- Dominios:
  - API: `api.op-sly.com` (3000)
  - Admin: `admin.op-sly.com` (3001)
  - Portal: `portal.op-sly.com` (3002)
  - Twenty: `crm-peskids.op-sly.com` (3000 dentro de twenty-server)
  - WACRM (propuesto): `wa-peskids.op-sly.com`
  - n8n (propuesto): `n8n-peskids.op-sly.com`

**Health Checks:** Básicos (curl), repositorio en `.github/workflows/deploy.yml`

**Logs:** Docker stdout, Uptime Kuma monitorea endpoints

---

## 2. RIESGOS PRINCIPALES 🚨

### 2.1 Riesgo Crítico: Deuda GoHighLevel

**Severidad:** 🔴 CRÍTICA

- 2200+ líneas de código GHL en runtime + tests
- Variables GHL en Doppler (PESKIDS_GHL_*)
- Webhook endpoint GHL aún activo
- Provisioning system acoplado
- **Riesgo:** Confusión al activar WhatsApp; conflicto de lógicas de webhooks

**Mitigación:** Eliminar **antes** de activar WhatsApp.

### 2.2 Riesgo: Persistencia de Mensajes WhatsApp

**Severidad:** 🟡 ALTA

- No existe tabla `whatsapp_messages` en Supabase
- No existe tabla `whatsapp_contacts` con índices por tenant
- No existe tabla `whatsapp_webhook_receipts` (idempotencia)
- Status de mensajes (sent/delivered/read/failed) no está modelado

**Mitigación:** Crear migraciones antes de activar webhook.

### 2.3 Riesgo: Validación de Webhook Meta

**Severidad:** 🟡 ALTA

- Firma `X-Hub-Signature-256` requiere validación constante
- No hay implementación actual en rutas de webhook
- Error en validación → mensajes perdidos

**Mitigación:** Implementar validación tipada con Zod.

### 2.4 Riesgo: Idempotencia

**Severidad:** 🟡 ALTA

- Meta reintenta webhooks (hasta 5 veces)
- Sin `externalMessageId` unique, duplicados en Supabase
- Mensajes duplicados → desorden en conversations

**Mitigación:** Unique constraint en `whatsapp_messages(external_message_id, tenant_id)`.

### 2.5 Riesgo: Fallo de Twenty

**Severidad:** 🟠 MEDIA

- Si Twenty no está disponible, ¿los mensajes se pierden?
- Regla: Guardar primero en Supabase, sincronizar Twenty asincronamente
- Falta retry-logic y dead-letter queue

**Mitigación:** Implementar async sync + retry con estado.

### 2.6 Riesgo: Feature Flags No Implementados

**Severidad:** 🟠 MEDIA

- Variables `META_WEBHOOK_ENABLED`, `WACRM_ENABLED` existen en spec pero **no en código**
- Si se activan sin lógica, app puede fallar

**Mitigación:** Implementar validación y condicionales en startup.

### 2.7 Riesgo: WACRM No Dockerizado

**Severidad:** 🟠 MEDIA

- Template existe (`infra/templates/wacrm/docker-compose.wacrm-health-proxy.yml`)
- Pero **no está en docker-compose.platform.yml**
- Dominio propuesto `wa-peskids.op-sly.com` no activo

**Mitigación:** Integrar template en compose principal.

### 2.8 Riesgo: n8n Workflows No Exportados

**Severidad:** 🟡 ALTA

- Workflows construidos manualmente en UI
- No existen JSONs versionados
- Desastre: ¿Cómo redeploy sin perder lógica?

**Mitigación:** Exportar workflows → `infra/n8n/workflows/peskids/` como JSONs.

### 2.9 Riesgo: Approval-First No Implementado

**Severidad:** 🟠 MEDIA

- Regla: mensajes de IA requieren aprobación antes de enviar
- API routes existen pero lógica de draft/approval incomplete

**Mitigación:** Implementar states y audit log.

### 2.10 Riesgo: Falta Observabilidad

**Severidad:** 🟠 MEDIA

- No hay `correlation_id` en webhooks
- No hay métricas de fallos, latencias, mensajes pendientes
- Debugging será ciego

**Mitigación:** Implementar logging estructurado + dashboards básicos.

---

## 3. PLAN DE ARCHIVOS A MODIFICAR

### 3.1 Crear (Nuevos)

```
docs/audits/PESKIDS-WHATSAPP-WACRM-READINESS.md          ← ESTE ARCHIVO
docs/design/PESKIDS-PRODUCTION-CONTAINERS.md             ← Diagrama Mermaid
docs/runbooks/PESKIDS-META-HUMAN-STEPS.md                ← Tareas manuales Cristian+Santi
docs/runbooks/PESKIDS-WHATSAPP-CUTOVER.md                ← Planeamiento de cutover
docs/runbooks/PESKIDS-WACRM-OPERATIONS.md                ← Operaciones WACRM

lib/whatsapp/
├── provider.ts                                           ← Interface WhatsAppProvider
├── types.ts                                              ← Tipos canónicos
├── meta/
│   ├── client.ts                                         ← Meta Cloud API client
│   ├── webhook-handler.ts                                ← Validación + parsing
│   ├── env-config.ts                                     ← Validación env vars
│   └── types.ts                                          ← Tipos Meta específicos
└── wacrm/
    ├── client.ts                                         ← WACRM API client
    ├── webhook-handler.ts                                ← Validación WACRM
    ├── env-config.ts                                     ← Validación env vars
    └── types.ts                                          ← Tipos WACRM específicos

lib/whatsapp-supabase/
├── persistence.ts                                        ← Guardar mensajes/contactos
├── idempotence.ts                                        ← Deduplicación
├── queries.ts                                            ← Lectura optimizada
└── rls.ts                                                ← Row-level security

lib/whatsapp-twenty/
├── person-sync.ts                                        ← findPerson, upsert
├── opportunity-sync.ts                                   ← createOpportunity
├── retry.ts                                              ← Retry logic
└── types.ts                                              ← Tipos integración

lib/whatsapp-approval/
├── outbox.ts                                             ← Draft/pending/approved states
├── audit.ts                                              ← Auditoría de cambios
└── types.ts                                              ← Estados del outbox

apps/api/app/api/public/integrations/whatsapp/
├── meta/
│   ├── webhook/
│   │   ├── route.ts                                      ← GET (challenge), POST (webhook)
│   │   └── __tests__/route.test.ts
│   └── health/
│       └── route.ts
└── wacrm/
    ├── webhook/
    │   ├── route.ts                                      ← POST webhook WACRM
    │   └── __tests__/route.test.ts
    └── health/
        └── route.ts

apps/peskids/migrations/
└── 20260719_add_whatsapp_tables.sql                      ← Tablas WhatsApp

infra/n8n/workflows/peskids/
├── peskids-whatsapp-inbound.json
├── peskids-whatsapp-lead-intake.json
├── peskids-whatsapp-followup.json
├── peskids-whatsapp-approval-send.json
├── peskids-whatsapp-delivery-status.json
└── peskids-whatsapp-failed-message-retry.json

infra/docker-compose.peskids-whatsapp.yml                 ← Overlay para WACRM

scripts/whatsapp/
├── test-meta-webhook.sh
├── test-wacrm-webhook.sh
├── test-send-sandbox.sh
├── smoke-whatsapp-stack.sh
└── check-feature-flags.sh

blueprints/academy/integrations.yaml                      ← WhatsApp como integración

docs/archive/gohighlevel/
├── CLIENT-DECOMMISSION.md                                ← Plan de eliminación
├── migration-log.md                                      ← Registro de cambios
└── (copia de código GHL histórico)
```

### 3.2 Modificar (Existentes)

```
lib/config/index.ts                                       ← Agregar validación WhatsApp
lib/services/index.ts                                     ← Exportar WhatsAppProvider

apps/peskids/lib/integrations/peskids-provider-config.ts ← Incluir WhatsApp config
apps/peskids/lib/services/ (remove gohighlevel)           ← Eliminar referencias GHL

apps/api/app/api/health/route.ts                          ← Incluir checks WhatsApp
apps/api/lib/peskids/lead-ingest.ts                       ← Adaptar para WhatsApp
apps/api/lib/peskids/automation.ts                        ← n8n dispatch sin GHL

apps/admin/app/integrations/whatsapp/ (nueva sección)     ← Admin UI

infra/docker-compose.platform.yml                         ← Agregar WACRM, n8n
infra/docker-compose.local.yml                            ← Agregar WACRM local

.github/workflows/deploy.yml                              ← Smoke tests WhatsApp
.github/workflows/security.yml                            ← Escanear variables

config/knowledge-index.json                               ← Actualizar índice
```

### 3.3 Eliminar (Decommission GHL)

```
lib/services/gohighlevel/                                 ← Directorio completo
apps/peskids/lib/services/gohighlevel/                    ← Directorio completo
packages/provisioning/src/ghl-provisioner.ts              ← O refactorizar si es usado
apps/api/app/api/public/tenants/peskids/webhooks/gohighlevel/  ← Directorio
runtime/context/peskids-goals.json                        ← Referencia histórica
```

---

## 4. MIGRACIONES PROPUESTAS

### 4.1 Migración Principal: Tablas WhatsApp

**Archivo:** `apps/peskids/migrations/20260719_add_whatsapp_tables.sql`

**Tablas:**
1. `whatsapp_contacts` — Contactos únicos por tenant
2. `whatsapp_conversations` — Hilos de conversación
3. `whatsapp_messages` — Mensajes entrantes/salientes
4. `whatsapp_message_events` — Status (sent/delivered/read/failed)
5. `whatsapp_templates` — Plantillas Meta
6. `whatsapp_outbox` — Draft/pending/approved mensajes (approval-first)
7. `whatsapp_webhook_receipts` — Idempotencia

**Características:**
- Tenant-aware (tenant_id/tenant_slug en cada tabla)
- Índices por (`tenant_id`, `phone_number`, `external_message_id`)
- RLS policies (basado en tenant)
- Timestamps (created_at, updated_at)
- Relaciones opcionales con `peskids_leads`, `peskids_families`, `peskids_students`

### 4.2 Migración Secundaria: Campos de Integración

**Archivo:** `apps/peskids/migrations/20260720_add_whatsapp_integration_fields.sql`

**Cambios:**
- Agregar `whatsapp_contact_id` a `peskids_leads` (nullable, foreign key)
- Agregar `whatsapp_conversation_id` a `peskids_leads` (nullable)
- Agregar `whatsapp_sync_status` a `peskids_leads` (enum: pending, synced, failed)
- Agregar `whatsapp_opted_in_at` a `peskids_leads` (timestamp, nullable)

### 4.3 Migración Config: Tenant Settings

**Archivo:** `apps/peskids/migrations/20260721_add_whatsapp_tenant_config.sql`

**Cambios:**
- Extender tabla `peskids_tenant_settings` con:
  - `whatsapp_enabled: boolean` (default false)
  - `whatsapp_provider: text` (enum: wacrm, meta, openwa)
  - `whatsapp_sandbox_mode: boolean` (default true)
  - `whatsapp_approval_required: boolean` (default true)
  - `whatsapp_phone_number_id: text` (nullable, encrypted)
  - `whatsapp_verified_number: text` (nullable, E164 format)
  - `whatsapp_feature_version: text` (versionado)

---

## 5. PREGUNTAS BLOQUEANTES REALES 🚨

### 5.1 Meta / WACRM Decisión

**Pregunta:** ¿Es Peskids un **multi-tenant SAAS** donde cada tenant conecta su propia Meta App, o **single-tenant/white-label** donde Opsly provee el número?

**Respuesta Esperada:**
- Si multi-tenant → cada tenant necesita `META_APP_ID`, `META_APP_SECRET` (config per-tenant en Doppler o Vault)
- Si single-tenant → una única configuración para todos (Peskids principal)
- Impacta: Webhook architecture, secret storage, approval workflows

**Recomendación:** Single-tenant para MVP (Peskids only). Escalable después.

### 5.2 WACRM o Meta Directo

**Pregunta:** ¿Peskids contactará a Meta Cloud API **directamente** o **siempre vía WACRM**?

**Respuesta Esperada:**
- Si directo → implementar `MetaCloudWhatsAppProvider` (lib/whatsapp/meta/)
- Si WACRM only → implementar solo `WacrmWhatsAppProvider`, dejar meta detrás de feature flag
- Si ambos → ambas implementaciones, toggle per-tenant

**Recomendación:** WACRM only para MVP. Meta como feature flag para futuro.

### 5.3 OpenWA Deprecación

**Pregunta:** ¿Seguir usando `lib/openwa` o migrarlo a WACRM?

**Respuesta Esperada:**
- `lib/openwa` es cliente de WhatsApp Web (autobot)
- WACRM es proxy a Meta Cloud API
- Decisión: abandonar OpenWA o mantener como fallback

**Recomendación:** Abandonar OpenWA. WACRM es oficial, escalable.

### 5.4 Aprobación de Mensajes

**Pregunta:** ¿**Todos** los mensajes generados por IA requieren aprobación o solo los automatizados?

**Respuesta Esperada:**
- Si todos → outbox con estados draft/pending/approved
- Si solo automatizados → solo n8n workflows requieren aprobación
- Impacta: UI, lógica de dispatch, políticas por tenant

**Recomendación:** Solo automatizados de n8n requieren aprobación. Operadores manuales no.

### 5.5 Cutover del Número

**Pregunta:** ¿Cuándo activar el número principal de Peskids?

**Respuesta Esperada:**
- Phase 1: Sandbox number, dev/staging only
- Phase 2: Validation de inbound, outbound, Twenty sync, n8n workflows
- Phase 3: Cutover de número principal (cambio de provider anterior a Meta)
- Riesgo: Pérdida de mensajes si no hay coordinación

**Recomendación:** Phase 1 y 2 paralelas con número sandbox. Phase 3 coordinada con Cristian + Santi.

### 5.6 Blueprint Reutilizable

**Pregunta:** ¿Otros tenants (academias) también necesitarán WhatsApp?

**Respuesta Esperada:**
- Si no → hardcode Peskids, ignorar blueprint
- Si sí → parametrizar en `blueprints/academy/integrations.yaml`
- Impacta: Arquitectura de providers, tenantization

**Recomendación:** Preparar blueprint aunque solo Peskids use inicialmente.

### 5.7 n8n Workflows

**Pregunta:** ¿Existen workflows n8n actuales para Peskids?

**Respuesta Esperada:**
- Si sí → exportarlos + documentar
- Si no → crear JSONs de referencia (sin implementación real en esta tarea)
- Impacta: Deliverables, sprint siguiente

**Recomendación:** Crear JSONs de referencia. Workflows reales en sprint siguiente.

### 5.8 GHL Datos Históricos

**Pregunta:** ¿Conservar datos históricos de GHL o limpiar Supabase?

**Respuesta Esperada:**
- Conservar: Backup + archivo en `docs/archive/gohighlevel/`
- Limpiar: DELETE en migraciones (destructivo)
- Impacta: Auditoría, compliance, recuperabilidad

**Recomendación:** Conservar. Copiar a archivo + mantener datos en Supabase (no afecta operación).

---

## 6. NOMBRE DE LA RAMA PROPUESTA

```
feat/peskids-whatsapp-wacrm-integration-phase-0
```

**Descripción:**
- Rama de feature para integración WhatsApp + WACRM
- Phase 0: Auditoría, setup, migraciones, interfaces
- Fases 1-18 en commits posteriores

**Protocolo Git:**
```bash
git checkout -b feat/peskids-whatsapp-wacrm-integration-phase-0
# Hacer cambios
git add <files>
git commit -m "feat(peskids): phase 0 — audit + schema + providers"
git push -u origin feat/peskids-whatsapp-wacrm-integration-phase-0
# PR draft cuando fase 0 esté lista
```

---

## 7. RESUMEN EJECUTIVO

| Aspecto | Estado | Acción |
|--------|--------|--------|
| **Repositorio** | ✅ Completo | Listo para integración |
| **GoHighLevel** | 🔴 Bloqueador | Eliminar antes de activar WhatsApp |
| **Supabase** | ✅ Base lista | Crear 7 nuevas tablas |
| **Twenty CRM** | ⚠️ Parcial | Implementar sync + retry |
| **n8n** | ⚠️ Webhooks | Exportar workflows JSON |
| **WACRM** | ⚠️ Template | Integrar en compose principal |
| **Meta API** | 📋 Spec | Listo cuando Cristian entregue IDs |
| **Approval-First** | ⚠️ Incomplete | Implementar outbox + audit |
| **Feature Flags** | ⚠️ Vars only | Implementar validación en startup |
| **Health Checks** | ❌ Falta | Crear endpoints `/api/health/whatsapp` |

---

## 8. PRÓXIMO PASO

**ESPERAR APROBACIÓN de este plan antes de implementar.**

Preguntas para resolver:
1. ✋ ¿Responder las 8 preguntas bloqueantes?
2. ✋ ¿Agregar/remover fases?
3. ✋ ¿Cambiar nombres de ramas, archivos, tablas?
4. ✋ ¿Prioridad: GHL elimination vs WhatsApp setup?

**Una vez aprobado**, comenzar:
- FASE 1: Modelo de configuración (Zod validation)
- FASE 2: Adaptador canónico (WhatsAppProvider interface)
- ... (Fases 3-18)

---

**Fin de Auditoría FASE 0**  
**Estado:** BLOCKED — Awaiting approval  
**Decisión:** READY_FOR_HUMAN_META_SETUP (condicionado a eliminar GHL + responder preguntas)
