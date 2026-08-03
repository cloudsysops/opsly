---
status: ready_for_review
owner: platform
last_review: 2026-08-03
baseline: origin/main@ee698f25
---

# Opsly Venture Studio — auditoría de fundación

## Veredicto

**PARTIAL_MODULE_PLATFORM**

Opsly ya tiene un control plane multi-tenant real (no solo documentado):
`platform.tenants` es una tabla viva con CRUD real en `apps/api`, hay un
orchestrator BullMQ real con 30+ workers, un LLM Gateway real con pipeline de
routing/cache/budget, un adapter Twenty limpio, y automatizaciones n8n reales.
No existe todavía un contrato único que convierta esas piezas en una
plataforma de módulos funcionales reutilizables para varias verticales — y,
más importante para esta auditoría, **varias piezas que el equipo asume como
"ya existentes" (AgentTaskEnvelopeV1, el pipeline Router→Policies→
Orchestrator→LLM Gateway, un event bus tenant-aware) no existen como tales en
código ni en documentación**. Este documento corrige esas suposiciones con
evidencia verificable antes de que se construya nada encima de ellas.

Este PR documenta decisiones y límites. No modifica runtime, migraciones,
secretos, despliegues ni tenants productivos.

## Corrección de supuestos del brief original

El brief que originó este audit asumía que lo siguiente "ya existe en
Opsly". Verificado con `grep` exhaustivo sobre todo el repo (código + docs):

| Supuesto                                                    | Realidad verificada                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AgentTaskEnvelopeV1`                                         | **No existe.** Cero resultados de `grep -i "AgentTaskEnvelope"` en todo el repo, incluyendo `docs/**/*.md`. No hay ningún tipo, contrato ni doc con este nombre.                                                                                                                                                                                        |
| Pipeline `Router → Policies → Orchestrator → LLM Gateway`     | **No existe como secuencia nombrada/cableada.** Existen piezas reales por separado (`apps/llm-gateway/src/router.ts` para routing de modelos, `apps/orchestrator/src/agents/executor-router.ts` para routing de jobs, `lib/external-agent-registry` para workers CLI externos) pero no están unificadas bajo un contrato común, y ningún código impone que una tarea de agente pase por las cuatro etapas en ese orden.                              |
| Agent Router / Agent Registry                                 | `lib/external-agent-registry` es real y tiene un consumidor real (`apps/orchestrator/src/lib/external-agent-coordinator.ts`), pero es un registro de *workers CLI externos* (Claude Code, Codex), no un router genérico de tareas de agente. `apps/orchestrator/src/agents/registry.ts` es un modelo de datos para mission-control, no un motor de enforcement. `apps/agent-manager` (huérfano, sin `package.json`) es un tercer artefacto desconectado, no un alias de ninguno de los dos anteriores. |
| Policies                                                       | `docs/blueprints/academy/agent-policy.yaml` se autodeclara `status: contract-only`, `rollout.enabled: false`. Su único consumidor es `scripts/ci/validate-academy-blueprint.mjs`, que valida la forma del YAML, no el comportamiento en runtime. Ningún código lee este archivo para permitir o denegar una acción real.                                                                                                                                |
| Skills                                                         | `packages/skills/*` es real como sistema de skills para el propio agente de código (Claude Code), no como "agent skills" de negocio consumidos por el runtime de Opsly. No confundir ambos conceptos en PRs futuros.                                                                                                                                     |
| Event bus                                                      | Split-brain (ver sección siguiente). El lado interno (Redis pub/sub en el orchestrator) es real. El lado tenant-facing HTTP (`OPSLY_EVENT_BUS_URL`) no tiene receptor en ningún lugar del repo — es una llamada HTTP que cae al vacío o se omite silenciosamente si la variable no está configurada.                                                     |

Esto no es un juicio sobre el trabajo previo — es la razón de ser de PR0: si
PR1 hubiera empezado a construir "sobre" `AgentTaskEnvelopeV1`, habría estado
construyendo sobre un contrato que no existe.

## Evidencia y clasificación

| Capacidad                        | Evidencia en `origin/main`                                                                                                                                                                                                                                                                                                                     | Clasificación                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Tenancy e identidad                | `platform.tenants` (real, `supabase/migrations/0002_tenants_table.sql`), CRUD real en `apps/api/app/api/tenants/**`, `platform.tenant_memberships` (roles reales owner/admin/operator/viewer)                                                                                                                                                | `REUSABLE_WITH_REFACTOR`                                                                    |
| Entitlements                       | `platform.tenant_entitlements` + `lib/services/entitlements` + `apps/api/app/api/tenants/[slug]/entitlements/**` — **construido y verificado en esta misma sesión** (PR #882 abierto, no mergeado; ver "Progreso ya iniciado")                                                                                                              | `PRODUCTION_REUSABLE` en código, `not_merged` en estado de repo                             |
| Roles y autorización               | `apps/api/lib/auth.ts`, `platform.tenant_memberships`, rutas admin/portal                                                                                                                                                                                                                                                                       | `REUSABLE_WITH_REFACTOR`                                                                    |
| Librerías compartidas              | `config/modules.json`, `lib/*`, `packages/*`                                                                                                                                                                                                                                                                                                    | `PRODUCTION_REUSABLE` como registry de código (drift vs `.claude/CLAUDE.md` ya corregido en PR separado) |
| Módulos operativos por tenant      | `config/tenant-modules-catalog.json`, scripts bajo `scripts/tenants/`                                                                                                                                                                                                                                                                           | `REUSABLE_WITH_REFACTOR`                                                                    |
| Catálogo comercial                 | `config/commercial-catalog.json`, `apps/icso/lib/commercial-catalog.ts`                                                                                                                                                                                                                                                                          | `PRODUCTION_REUSABLE` como catálogo comercial; sin enforcement runtime hasta PR #882         |
| Tenant provisioning                | `apps/api/lib/orchestrator.ts` (`OnboardingOrchestrator`, `provisionTenant`, 752 líneas, pipeline real de compose/infra), `scripts/provisioning/*`                                                                                                                                                                                             | `REUSABLE_WITH_REFACTOR`                                                                    |
| Tenant generator (por blueprint)   | `scripts/blueprints/generate-academy-tenant.mjs` + `lib/academy-blueprint` + `apps/tenant-onboarding-agent` — **construido y verificado en esta misma sesión** (PR #875 abierto, no mergeado)                                                                                                                                                 | `PRODUCTION_REUSABLE` en código (single-blueprint hoy: academy), `not_merged` en estado de repo |
| Academy Blueprint                  | `docs/blueprints/academy/*` + `config/blueprints/academy/*` (contrato de dos capas: docs humano/agente + machine pack), `provisioning.enabled: false` intencional y forzado por CI (`scripts/ci/validate-academy-blueprint.mjs`)                                                                                                              | `REUSABLE_WITH_REFACTOR`                                                                    |
| Blueprints verticales JSON         | `config/vertical-blueprints/*`                                                                                                                                                                                                                                                                                                                   | `POC_ONLY` como contrato global; requiere loader común                                       |
| **`packages/opsly-core`**          | **Hallazgo no cubierto por el brief original.** Paquete real con `TenantConfig`, `AgentRuntime`, `EventBuilder`, `AiGateway` (providers mock/gemini/stub), `WorkflowDispatcher` (`MockWorkflowDispatcher`). `src/cli/demo.ts` y `__tests__/fixtures/demo-tenants.ts` confirman naturaleza de demo. Único consumidor real: `apps/smiletripcare/config/tenant.config.ts` — y `apps/smiletripcare` es en sí mismo un app huérfano (sin `package.json`). Su `TenantConfig` es un concepto de *clasificación de intents* (`allowedIntents`, `intents: Record<IntentName, IntentDefinition>`) para lead-capture en modo shadow — **sin relación con** `platform.tenants`, `config/tenants/*.json`, ni con el contrato de negocio (providers/catalog/quotes/cases) que este programa necesita. | `POC_ONLY` — riesgo real de convertirse en "otro framework" (regla #2) si no se ignora explícitamente |
| CRM                                | `lib/services/twenty/client.ts` (`TwentyClient`) es un adapter limpio (apiKey/baseUrl por parámetro); `env-config.ts` hardcodea 2 familias de env vars por tenant (`TWENTY_PESKIDS_*`, `TWENTY_INTCLOUDSYSOPS_*`) en vez de una función genérica por slug. 2 tenants reales lo consumen (peskids, icso)                                       | `PARTIAL` — cliente reusable, capa de config no genérica                                     |
| Pipelines                          | `apps/peskids/lib/agents/pipeline-rules.ts` hardcodea nombres de etapa y evidencia de Peskids (swim classes). El "segundo consumidor" en `apps/intcloudsysops/lib/agents/pipeline-rules.ts` **es una copia sin adaptar** que sigue consultando `.schema('peskids').from('class_enrollments')` dentro de la app intcloudsysops, sin ningún call site en rutas/cron. Incluso en Peskids, `PipelineManagerService.evaluateAndAdvance` no tiene call sites fuera de sus propios tests.                          | `TENANT_SPECIFIC`, con evidencia de **posible dead code** en ambas apps                      |
| Forms/intake                       | Sin form-builder compartido. `apps/intcloudsysops/lib/validation/lead.schema.ts` es una copia casi literal del schema de Peskids, con vocabulario de natación sin adaptar (`class_modality: llanogrande\|domicilio`) pegado en un CRM de intcloudsysops                                                                                       | `MISSING` como módulo compartido; evidencia de copy-paste sin adaptar                        |
| Followups                          | Peskids, ICSO e intcloudsysops implementaron cada uno su propio motor de followups desde cero — el de intcloudsysops (`lead-followup.service.ts`) importa literalmente `PeskidsGoHighLevelThreadClient`                                                                                                                                        | `MISSING` como módulo compartido; tres implementaciones divergentes                          |
| Providers de negocio               | No existe módulo genérico. `apps/local-services` (tenant real "Equipa") tiene `platform.ls_technician_schedules` — la implementación más cercana, pero acoplada a técnicos de campo. Peskids `teachers` es plano, sin abstracción debajo.                                                                                                       | `MISSING` como módulo compartido; 1 implementación tenant-specific real                       |
| Service catalog de negocio         | `platform.ls_services` (local-services) es real pero tenant-specific; Peskids `class.service.ts` es swim-class-specific, sin abstracción común                                                                                                                                                                                                  | `MISSING` como módulo compartido                                                             |
| Quotes/proposals                   | `platform.ls_quotes` (local-services) es real: estados draft/sent/accepted/rejected/expired, `amount_cents`, ruta API real, documentado en `docs/adr/ADR-038-custom-quotes-vs-fixed-pricing.md`. Peskids no tiene concepto de quote.                                                                                                            | `TENANT_SPECIFIC` (local-services only)                                                      |
| Case management                    | No existe en ningún lugar del repo. Sin tabla `cases`, sin motor multi-entidad que agrupe cliente+proveedor+documentos+timeline+tareas.                                                                                                                                                                                                          | `MISSING`                                                                                    |
| Booking requests                   | Dos implementaciones reales, independientes, no genéricas: `platform.ls_bookings` (local-services, con lat/long/travel-time) y `class_enrollments` de Peskids (capacidad, solapamiento por profesor/piscina). Ningún motor común debajo.                                                                                                        | `TENANT_SPECIFIC` × 2, sin abstracción compartida                                            |
| Document vault                     | `grep` de `.storage.from(` en todo el repo encontró **exactamente un bucket**: `peskids-staff-uploads` (privado, solo service_role, sin versionado, sin expiración, sin clasificación de sensibilidad). Ningún otro app usa Supabase Storage.                                                                                                  | `MISSING` — ni siquiera existe un patrón ad-hoc reutilizable                                  |
| Payments                           | Dos sistemas separados sin abstracción común: Stripe de plataforma (`apps/api/lib/stripe/*`, `platform.billing_plans`/`billing_subscriptions`) y un segundo Stripe independiente en `apps/web` para onboarding. Wompi (`lib/wompi-gateway`, adapter limpio) solo tiene un consumidor: Peskids. **Bug real:** `apps/intcloudsysops/lib/services/payment.service.ts` es copia byte-a-byte del servicio Stripe de Peskids, todavía hardcodeada a `.schema('peskids')` y al dominio `peskids.op-sly.com` — código muerto/roto en producción para intcloudsysops.        | `PARTIAL` — múltiples implementaciones no unificadas, una de ellas rota                       |
| Communications                     | `apps/peskids/lib/notifications.ts` es un dispatcher real pero local a esa app. `lib/whatsapp`, `lib/wacrm-channel`, `lib/voice-messaging`, `lib/openwa` son paquetes reales por canal — sin ninguna interfaz común (`ChannelAdapter` o similar) que los unifique.                                                                              | `PARTIAL` — piezas reales, cero contrato compartido                                          |
| Dashboards                         | Sin registry de widgets ni config JSON-driven (`grep` de `WidgetRegistry`/`DashboardConfig`: cero resultados). Cada app (`admin`, `portal`, `peskids`) construye su propio árbol React de dashboard. `@intcloudsysops/components` solo se usa en 4 archivos totales entre admin y portal — 0 en Peskids.                                       | `MISSING` como sistema compartido                                                            |
| Automations/events (n8n)           | Catálogo n8n real. Event bus HTTP tenant-facing (`OPSLY_EVENT_BUS_URL`) sin receptor en el repo (ver "Event bus"); Redis pub/sub interno del orchestrator sí es real pero orchestrator-only                                                                                                                                                     | `REUSABLE_WITH_REFACTOR` para n8n; `PARTIAL`/dead-path para el event bus HTTP                 |
| Agents/orchestration               | Orchestrator real (BullMQ, 30+ workers, 56 archivos de test), LLM Gateway real (routing/cache/budget) — **pero no universalmente forzado**: llamadas directas a Anthropic SDK en `apps/orchestrator/src/workers/ClaudeCodeWorker.ts`, `apps/mcp-rendering-server/src/index.ts`, `apps/mcp/src/tools/obsidian/mcp-tool.ts`, `packages/skills/user/opsly-brain-researcher/brain-researcher.ts` — contradice directamente la regla #9 de este programa.       | `REUSABLE_WITH_REFACTOR` con **riesgo activo de incumplimiento de regla #9**                  |
| Health/observability/audit         | Cada app expone su propio `/health` sin contrato compartido. Bug encontrado: `apps/intcloudsysops/app/api/health/route.ts` hardcodea `service: 'peskids'`. `platform.audit_log` es real y compartido.                                                                                                                                           | `REUSABLE_WITH_REFACTOR` para audit; `MISSING` contrato común de health                       |
| CI/CD                              | 30+ workflows reales en `.github/workflows/` (conteo puntual, no verificable de forma estable). `ci.yml` es el gate real en cada PR (type-check, tests, Playwright, Trivy, secret-scan). **Riesgo operativo a verificar:** `deploy.yml` se dispara automáticamente en cada push a `main`/`staging` y declara `environment: staging`/`environment: production` — si esos GitHub Environments no tienen reviewers/protección configurados en los settings del repo (algo que este audit no puede verificar desde el YAML), el deploy corre sin gate humano; si sí la tienen, el gate existe pero vive en configuración externa al código. Las migraciones SQL NO se aplican automáticamente (el único `supabase db push` está en un job legacy deshabilitado que nunca se dispara). | `IMPLEMENTED` el gate de calidad; **riesgo a verificar** si el auto-deploy tiene o no protección de environment |
| Venture lifecycle/dashboard         | No existe modelo de venture ni experiments                                                                                                                                                                                                                                                                                                        | `MISSING`                                                                                    |

Para el formato de estado solicitado por PR0, la equivalencia es:
`PRODUCTION_REUSABLE` → `IMPLEMENTED`; `REUSABLE_WITH_REFACTOR` y
`TENANT_SPECIFIC`/`PARTIAL` → `PARTIAL`; `POC_ONLY` y `MISSING` → `PROPOSED`.
No se marca ningún módulo como `DEPRECATED` en esta auditoría. Esta conversión
evita presentar un adapter o una implementación tenant-specific como un Core
terminado.

## Progreso ya iniciado (esta sesión, no mergeado)

Dos PRs abiertos avanzan directamente sobre este programa, construidos antes
de que se formalizara PR-VENTURE-0-19, pero alineados con su dirección — se
documentan aquí para que PR1 y PR3 los hereden en vez de reconstruirlos:

- **PR #882** — `platform.tenant_entitlements` real + `lib/services/entitlements`
  (check/list/grant/revoke, fail-closed) + rutas admin
  `apps/api/app/api/tenants/[slug]/entitlements/**`. `module_id` se valida
  contra `config/commercial-catalog.json` en runtime (no solo formato).
  Verificado contra un Postgres 16 real y con un `next build` real, no solo
  revisado — dos bugs reales de review (un ENOENT en producción por lectura
  de filesystem en el runtime de Docker, y validación de slug faltante) ya
  corregidos.
- **PR #875** — `scripts/blueprints/generate-academy-tenant.mjs` (generador
  dry-run/`--write` para tenants Academy) + `lib/academy-blueprint` (lógica
  compartida) + `apps/tenant-onboarding-agent` reconstruido como servicio
  HTTP real (antes era código huérfano sin `package.json`).

Ninguno de los dos toca providers/catalog/quotes/cases/bookings/documents ni
crea un tenant productivo — quedan exactamente en el alcance de
PR-VENTURE-1/PR-VENTURE-3 tal como estaban planeados, solo que con una base
de código ya validada en vez de partir de cero.

## Catálogos y duplicaciones

Existen **cinco** fuentes con responsabilidades distintas para "tenant" o
"módulo" — dos más de las que el primer borrador de este audit identificó:

1. `config/modules.json`: módulos de librería y consumidores (16 entradas
   reales).
2. `config/tenant-modules-catalog.json`: packs operativos que activan
   scripts/servicios por tenant.
3. `config/commercial-catalog.json`: módulos, paquetes y verticales para
   venta (9 módulos, 4 paquetes).
4. `platform.tenants` + `config/tenants/*.json`: identidad operativa real
   (DB) y config de infraestructura (puerto, dominio, schema_name) por
   archivo — dos representaciones ya, no una.
5. **`config/opsly.config.json`'s `tenants[]`** (5 entradas) y **`packages/opsly-core`'s `TenantConfig`** (concepto de intent-classification, no de negocio): dos fuentes adicionales de "qué es un tenant", ninguna de las cuales debe convertirse en la fuente de verdad del nuevo contrato.

Academy además tiene dos representaciones: `docs/blueprints/academy/` y
`config/blueprints/academy/`. `config/vertical-blueprints/` añade plantillas
JSON de otra generación.

La solución aprobada no borra estos catálogos en PR0. El Module Registry será
primero una proyección/adaptador validado. Cada fuente conservará su dueño
hasta que todos sus consumidores migren en PRs posteriores. `packages/opsly-core`
y `config/opsly.config.json.tenants[]` se documentan aquí explícitamente como
**fuentes a NO proyectar** — no describen el mismo concepto de tenant que este
programa necesita, y proyectarlas mezclaría conceptos incompatibles.

## Dependencias y consumidores

```text
config/modules.json
  └── librerías/packages y consumidores del monorepo

config/tenant-modules-catalog.json
  └── scripts/tenants, provisioning y administración operativa

config/commercial-catalog.json
  └── apps/icso/lib/commercial-catalog.ts (+ mirror en apps/icso/content/)
  └── apps/api/app/api/tenants/[slug]/entitlements (validación runtime, PR #882)

config/blueprints/academy/* + docs/blueprints/academy/*
  └── scripts/ci/validate-academy-blueprint.mjs
  └── scripts/blueprints/generate-academy-tenant.mjs (PR #875)
  └── apps/tenant-onboarding-agent (PR #875)

platform.tenants + platform.tenant_entitlements (PR #882)
  └── apps/api (CRUD, entitlements), portal, admin, billing, jobs, observability

packages/opsly-core
  └── apps/smiletripcare (único consumidor; app huérfano sin package.json)
```

## Hardcodes y riesgos

- `apps/api/lib/peskids/*`, `config/tenants/peskids.json` y documentación
  Peskids son tenant-specific.
- Academy contiene supuestos sobre Twenty y el piloto Peskids; deben quedar en
  un validador vertical, no en el loader común.
- `config/tenant-modules-catalog.json` contiene scripts, servicios y dominios
  operativos; no debe convertirse directamente en el contrato funcional de
  providers, quotes o cases.
- `apps/api/lib/cloud-providers/*` describe proveedores de infraestructura, no
  proveedores comerciales de una vertical — nombre confuso a evitar al
  diseñar el módulo de providers de negocio.
- **`docs/adr/ADR-004-supabase-schema-por-tenant.md` está `Aceptada`** (no
  solo "documentada"), y decide explícitamente schema por tenant. La
  estrategia aprobada para la nueva capa funcional (tablas compartidas +
  `tenant_id` + RLS) la contradice. Un ADR futuro debe supersederla
  explícitamente antes de que PR-VENTURE-6 en adelante cree tablas nuevas —
  este audit no la supersede, solo la señala.
- **Copy-paste sin adaptar, con evidencia concreta de bugs en producción**:
  `apps/intcloudsysops/lib/services/payment.service.ts` (Stripe hardcodeado a
  `peskids`), `apps/intcloudsysops/lib/agents/pipeline-rules.ts` (etapas de
  natación), `apps/intcloudsysops/lib/validation/lead.schema.ts`
  (`class_modality`), `apps/intcloudsysops/app/api/health/route.ts`
  (`service: 'peskids'` hardcodeado). Ninguno de estos cuatro es "reuse" —
  son copias que nunca se adaptaron. Riesgo directo para la regla #20 ("no
  declarar reusable sin demostrarlo con dos tenants") si se citan como
  evidencia de reutilización sin verificar primero si de verdad funcionan.
- **LLM Gateway bypasseado en 4 ubicaciones reales** (ver tabla) — riesgo
  activo contra la regla #9 de este programa. PR-VENTURE-16 (Business Builder
  Agent) no puede asumir que "todo ya pasa por el gateway".
- **Event bus HTTP tenant-facing sin receptor** — `apps/peskids/lib/events.ts`
  y `apps/intcloudsysops/lib/events.ts` publican a un endpoint que no existe
  en el repo. Cualquier evento canónico nuevo de PR-VENTURE-12/13 necesita
  definir primero quién consume, no asumir que "el event bus ya funciona".
- **Deploy automático en push a `main`/`staging`** (`deploy.yml` se dispara en
  cada push, sin trigger manual) — el archivo declara
  `environment: staging`/`environment: production`, así que un gate humano
  *puede* existir si esos GitHub Environments tienen reviewers configurados
  en los settings del repo, pero eso no es verificable desde el YAML ni desde
  este audit. Tensión potencial con la regla #16 ("No hacer merge automático")
  del programa si esa protección no está activa: cualquier PR-VENTURE que se
  mergee manualmente podría disparar deploy real sin paso intermedio. Debe
  confirmarse el estado real de la protección del environment antes de
  asumir cualquiera de los dos escenarios (label, environment gate, o
  mantener los PR-VENTURE tempranos fuera de las
  rutas que dispara `deploy.yml`) antes de PR-VENTURE-14 en adelante.
- Tests de `pattern-catalog` con fallos de resolución de fixtures reportados
  previamente (no re-verificado en esta sesión).
- Test flaky pre-existente y no relacionado en `apps/orchestrator`
  (`phase-5-executor-workers-e2e.test.ts`, aserción de timing `>=10ms`
  observada en `9ms`) — no bloqueante para este programa, mencionado para que
  no se confunda con una regresión real si aparece en CI de un PR-VENTURE
  futuro.

## Decisiones canónicas de PR0

- El catálogo operativo actual permanece vigente durante la transición.
- El Module Registry inicial solo lee, valida, normaliza y detecta
  conflictos. No proyecta `packages/opsly-core` ni
  `config/opsly.config.json.tenants[]` — no describen el mismo concepto de
  tenant funcional.
- Los datos funcionales nuevos usarán tablas compartidas, `tenant_id NOT NULL`,
  RLS, autorización backend, índices y constraints scoped por tenant.
- No se implementan schemas separados por tenant en esta fase (requiere
  superseder `ADR-004` formalmente antes de PR-VENTURE-6).
- Documentos usarán las clases `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`,
  `SENSITIVE_PERSONAL`, `SENSITIVE_HEALTH` y `REGULATED`.
- `medical-tourism-demo` será el primer fixture; no se crea aún un tenant
  productivo de Colombia Health Journey.
- Ningún `AgentTaskEnvelopeV1` se declarará implementado — si PR-VENTURE-16
  necesita un contrato de tarea de agente, se diseña como pieza nueva y se
  nombra explícitamente como tal, no se asume heredado.
- Sin datos clínicos reales, secretos, pagos activos, comunicaciones externas,
  deploy o migraciones productivas.

## Migraciones potenciales fuera de PR0

No se crean todavía. Los contratos futuros podrían requerir, como mínimo,
entidades compartidas para `tenant_capabilities` (si `tenant_entitlements` de
PR #882 no cubre el caso), `providers`, `provider_documents`,
`service_catalog_items`, `service_bundles`, `quotes`, `quote_items`, `cases`,
`case_events`, `booking_requests`, `documents`, `communications`,
`automation_runs`, `ventures` y `venture_experiments`. Cada PR deberá aportar
RLS, rollback y tests de aislamiento antes de solicitar una migración.

## Secuencia ajustada

`PR-VENTURE-1` debe crear solo el adapter/schema del registry — **y puede
heredar entitlements de PR #882 si se mergea antes**, en vez de reconstruirlo.
Después:

`PR-VENTURE-2` entitlements (o cierre/extensión de PR #882) → `PR-VENTURE-3`
generator (puede extender PR #875 más allá de Academy) → `PR-VENTURE-4`
blueprint loader → `PR-VENTURE-5` CRM/pipelines (auditar primero si el
pipeline engine de Peskids tiene call sites reales antes de "reutilizarlo") →
`PR-VENTURE-6` providers → `PR-VENTURE-7` service catalog → `PR-VENTURE-8`
bundles → `PR-VENTURE-9` quotes → `PR-VENTURE-10` cases →
`PR-VENTURE-11` booking requests → `PR-VENTURE-12` documents →
`PR-VENTURE-13` communications → `PR-VENTURE-14` automations →
`PR-VENTURE-15` medical-tourism blueprint → `PR-VENTURE-16` sandbox fixture →
`PR-VENTURE-17` Business Builder (sin asumir `AgentTaskEnvelopeV1` ni un LLM
Gateway libre de bypasses — verificar antes) → `PR-VENTURE-18` venture
dashboard → `PR-VENTURE-19` reuse proof and closure.

## Estado de PR0

**READY_FOR_REVIEW**

La auditoría y los contratos documentales de este PR se basan en
`origin/main@ee698f25`, más una revisión de precisión hecha con investigación
paralela específica sobre: CRM/pipelines/forms/payments/dashboards;
providers/catalog/quotes/cases/bookings/documents/communications/
AgentTaskEnvelopeV1; y agents/orchestrator/observability/CI. No se declara
implementado ningún módulo funcional que no tenga código y consumidores
verificables. Las correcciones sobre la versión anterior de este documento
están explícitas en "Corrección de supuestos del brief original" en vez de
sobrescribirse en silencio.
