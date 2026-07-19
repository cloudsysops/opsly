---
status: baseline
owner: architecture
last_review: 2026-07-19
type: blueprint
tags:
  - opsly/academy
  - opsly/peskids
  - opsly/executive-agent
---

# Academy Blueprint + Executive Agent — baseline real

## Alcance y método

Este baseline cubre PHASE 1 y la base contractual de PHASE 2. Se obtuvo
inspeccionando código, scripts, workflows, configuración y contratos existentes;
la documentación histórica no se tomó como prueba de runtime.

No cambia lógica productiva, provisioning, flags ni datos de Peskids.

## Resumen ejecutivo

- Peskids ya contiene el dominio funcional necesario para un vertical Academy:
  leads, estudiantes, clases, asistencia, agenda, familias, formularios,
  evaluaciones, trials, followups, mensajes, pagos y dashboard.
- Twenty es el proveedor CRM primario en la configuración nueva. GHL conserva
  librerías, rutas y scripts de compatibilidad; algunas rutas ejecutables no
  pasan por el flag de cutover y son deuda explícita.
- Ya existe infraestructura suficiente para un Opsly Executive Agent:
  OpenClaw, Orchestrator/BullMQ, Hermes, Context Builder, MCP, Sigma y logs.
  No se necesita ni se debe instalar otro framework.
- No existe un contrato Academy único. Hay tres familias parcialmente
  solapadas: `config/tenants`, `clients/*.launch.json` y
  `config/vertical-blueprints`.

## Qué existe

### Provisioning y contratos tenant

Flujo principal actual:

- `scripts/provisioning/clone-vertical-launch.sh`
- `scripts/provisioning/bootstrap-tenant.sh`
- `scripts/tenant/onboard.sh`
- `scripts/tenant/onboarding-readiness.sh`
- `config/client-launch.schema.json`
- `config/vertical-blueprints/_base.json`
- `config/vertical-blueprints/swim-school.json`
- `clients/peskids.launch.json`

Flujos solapados que todavía existen:

- `scripts/tenants/new-tenant.sh`
- `scripts/provisioning/tenant-bootstrap-skeleton.sh`
- `scripts/generate-tenant-config.sh`
- `scripts/setup-n8n-tenant.sh`
- `scripts/apply-tenant-pattern.sh`
- `config/tenants/schema.tenant-config.json`
- `config/tenant-modules-catalog.json`

El bootstrap principal consume launch contracts, mientras `new-tenant.sh`
consume tenant configs. `setup-n8n-tenant.sh` acepta un tenant pero conserva
artefactos Peskids hardcodeados; por tanto aún no es un provisioner Academy.

### Superficie Peskids confirmada por código

- Dashboard: `apps/peskids/app/api/dashboard/route.ts`,
  `apps/peskids/lib/services/dashboard.service.ts`.
- Followups: `apps/peskids/app/api/admin/followups/**`,
  `apps/peskids/lib/services/followup-admin.service.ts`.
- Trials: `apps/peskids/app/api/admin/trial-classes/**`,
  `apps/peskids/lib/services/trial-class.service.ts`.
- Estudiantes, clases y matrícula: `apps/peskids/app/api/admin/students/**`,
  `apps/peskids/app/api/admin/classes/**`,
  `apps/peskids/lib/services/{student,class,enrollment,agenda}.service.ts`.
- Docentes: agenda, roles de auth, `professor_user_id` en clases y
  `apps/peskids/app/api/submissions/teacher/**`.
- Familias: `apps/peskids/app/api/families/**`,
  `apps/peskids/lib/{family-auth,family-access}.ts` y formularios familiares.
- Mensajes: `apps/peskids/app/api/messages/**`,
  `apps/peskids/lib/{message-store,message-reply-handler}.ts`.
- Formularios/evaluaciones: `apps/peskids/app/api/forms/**`,
  `apps/peskids/app/api/submissions/**`,
  `apps/peskids/lib/services/family-form.service.ts` y
  `form-submission.service.ts`.
- Pagos: `apps/peskids/app/api/payments/**`,
  `apps/peskids/app/api/webhooks/{stripe,wompi}/**`,
  `apps/peskids/lib/services/{payment,wompi-payment}.service.ts`.

### Capacidades reutilizables de Opsly

- Identidad y auth tenant: `lib/runtime/src/tenant-identity.ts`,
  `lib/runtime/src/tenant-auth-surface.ts`.
- Perfil tenant: `lib/tenant-profile/src`.
- Capacidades/patrones: `lib/pattern-catalog/src/tenant.ts`.
- CRM: `lib/services/twenty` y compatibilidad en
  `lib/services/gohighlevel`.
- WhatsApp: `lib/openwa` y `lib/wacrm-channel`.
- Pagos: `lib/wompi-gateway`.
- API/UI compartida: `lib/api` y `lib/components`.
- Manifest de provisioning: `packages/provisioning/src/types.ts`.

### Base existente para Executive Agent

- Descriptores y routing: `apps/orchestrator/src/openclaw/registry.ts`.
- Intent/OAR/dispatch: `apps/orchestrator/src/engine.ts`.
- Contrato de jobs: `apps/orchestrator/src/types.ts`.
- BullMQ: `apps/orchestrator/src/queue.ts`.
- Estado Hermes: `apps/orchestrator/src/hermes/HermesOrchestrator.ts` y
  `HermesStateRepository.ts`.
- Context packs tenant-aware:
  `apps/context-builder/src/context-pack-builder.ts`.
- Herramientas y scopes MCP: `apps/mcp/src/server.ts`.
- Riesgo y decisiones: `apps/orchestrator/src/autonomy/policy.ts` y
  `apps/mcp/src/tools/sigma-harness.ts`.

La ruta correcta es registrar el futuro Executive Agent como
`OpenClawAgentDescriptor`, usar Hermes para estado y `processIntent()` para
ejecución. No debe aparecer un runtime paralelo.

### Audit y event log

- Jobs/workers: `apps/orchestrator/src/observability/{job-log,worker-log}.ts`.
- Hermes: `apps/orchestrator/src/hermes/hermes-log.ts`.
- API: `apps/api/lib/audit.ts`.
- MCP: `apps/mcp/src/runtime/audit.ts`.
- Core: `packages/opsly-core/src/observability/event-log.ts`.

La trazabilidad está fragmentada. No existe todavía un ledger inmutable único
para decisiones ejecutivas.

## GHL: runtime, compatibilidad y archivo

### Runtime ejecutable que requiere gate o retiro

Estos archivos contienen paths ejecutables y no deben considerarse archivo:

- `apps/api/app/api/public/tenants/peskids/webhooks/gohighlevel/leads/route.ts`
- `apps/api/lib/peskids/opportunity.ts`
- `apps/api/lib/peskids/sales-pipeline.ts`
- `apps/api/app/api/admin/peskids/[slug]/leads/[leadId]/stage/route.ts`
- `apps/intcloudsysops/app/api/leads/route.ts`
- `apps/intcloudsysops/lib/peskids-canonical-api.ts`
- `apps/intcloudsysops/app/api/webhooks/gohighlevel/route.ts`
- `apps/intcloudsysops/app/api/health/ghl/route.ts`
- `apps/intcloudsysops/app/api/analytics/pipeline/route.ts`
- `supabase/functions/gohighlevel-ai-followup/index.ts`
- `lib/services/gohighlevel/workflows/ai-lead-followup.ts`

Esto no prueba que producción los invoque, pero sí que una ruta activa puede
alcanzarlos sin depender necesariamente de `PESKIDS_GHL_ENABLED=false`.

### Compatibilidad gated o apagada por configuración

- `lib/services/twenty/env-config.ts`
- `apps/peskids/lib/peskids-crm-sync.ts`
- `apps/peskids/lib/integrations/peskids-provider-{config,adapters}.ts`
- `apps/peskids/app/api/webhooks/gohighlevel/route.ts`
- `apps/peskids/app/api/health/ghl/route.ts`
- `apps/peskids/lib/services/integration-status.service.ts`
- `apps/icso/lib/icso-crm-sync.ts`
- `scripts/tenants/ghl-disable-legacy.sh`
- `scripts/tenants/doppler-configure-twenty-prd.sh`

Estas referencias son deuda de compatibilidad conocida y quedan congeladas por
el guard inicial; no autorizan nuevas integraciones GHL.

### Archivo/histórico permitido

El guard excluye:

- `docs/**`, incluidos runbooks y reportes de cutover.
- `AGENTS.md`, espejos/contexto generado y `output/**`.
- tests y fixtures.
- migraciones SQL ya aplicadas.
- artefactos de archivo/experimentales.

Las referencias en `.n8n/**`, código, scripts y configuración no se clasifican
automáticamente como documentación: deben estar en el baseline explícito o
fallará el gate.

## Qué falta

- Entidades canónicas `academy_teacher` y `academy_family`; hoy se infieren de
  roles, `professor_user_id`, leads y `students.parent_email`.
- Contrato único validado que conecte blueprint, tenant, capabilities,
  integrations, roles y política del agente.
- Provisioning Academy genérico sin ramas Peskids.
- Validación server-side uniforme de respuestas de formularios.
- Creación transaccional de formulario + campos e idempotencia de submissions.
- Cola/retry/estado visible para sincronización Twenty.
- Asignación de formularios por clase, estudiante o familia.
- Estado canónico de publicación (`draft`, `published`, `active`).
- Ledger ejecutivo tenant-aware con `tenant_slug`, `request_id`, actor,
  decisión, aprobación y resultado.

## Qué está duplicado

- `apps/peskids` y `apps/intcloudsysops` contienen árboles y servicios casi
  equivalentes del dominio Academy.
- Peskids tiene además superficies paralelas bajo `apps/api/app/api/peskids`,
  `apps/api/app/api/admin/peskids/[slug]` y
  `apps/api/app/api/public/tenants/peskids`.
- Hay registries de agentes solapados en `config/agent-services.{json,yaml}`,
  `config/agent-capabilities.json`, `config/external-agent-registry.json`,
  `apps/orchestrator/src/openclaw/registry.ts`,
  `apps/orchestrator/src/agents/registry.ts` y
  `lib/runtime/src/capability-registry.ts`.
- API audit, MCP audit, logs de workers y event log core no convergen en una
  sola secuencia auditable.

## Riesgos antes de tocar runtime

1. Mezcla de schemas `public` y `peskids`, y uso inconsistente de `tenant_id`
   frente a `tenant_slug`.
2. Fallbacks a `NEXT_PUBLIC_TENANT_ID` o `peskids` en lugar de identidad
   confiable derivada de la sesión/request.
3. URLs, sender identities y nombres Peskids hardcodeados en automatizaciones.
4. `JOB_VALIDATION.isValidJob()` no exige actualmente `tenant_slug`.
5. Herramientas Super Orchestrator registradas sin scopes MCP equivalentes.
6. Context Builder genérico sin auth/tenant scope y caché sin namespace tenant.
7. `requiresApproval` no está demostrado como gate central de todos los
   caminos de enqueue.
8. Hermes puede marcar una tarea completa tras encolarla, antes del resultado
   downstream.

## Plan recomendado de PRs pequeños

1. **Este PR:** baseline, contratos mínimos, validador y guard de no-regresión
   GHL. Sin runtime.
2. **Contrato Academy:** reconciliar `tenant.schema.json` con
   `client-launch.schema.json` y `config/tenants`; adaptar `client:plan` en
   modo dry-run solamente.
3. **GHL runtime gates:** añadir guards a las rutas ejecutables listadas,
   mantener Twenty primary y agregar tests de 404/410 cuando GHL esté off.
4. **Identidad y auditoría:** exigir `tenant_slug` + `request_id` en ingresos
   Orchestrator/MCP y persistir aprobación humana para riesgo alto.
5. **Extracción core:** mover primero people/family/teacher y scheduling a
   módulos Academy reutilizables; Peskids queda como adapter/branding.
6. **Provisioning dry-run:** generar tenant config, launch plan y checklist
   n8n/Twenty/WACRM sin aplicar infraestructura.
7. **E2E reproducible:** crear tenant Academy de prueba y verificar lead →
   Twenty → trial → enrollment → family form → teacher grade.

## Gates para pasar a PHASE 2 productiva

- Cero referencias GHL nuevas fuera del baseline.
- Todas las rutas GHL ejecutables responden disabled cuando el flag está off.
- Contratos Academy pasan validación local y CI.
- Identidad tenant no depende de fallbacks públicos.
- Acciones de escritura del Executive Agent tienen scope, aprobación y audit.
- Provisioning completo permanece `--dry-run` hasta revisión humana.
