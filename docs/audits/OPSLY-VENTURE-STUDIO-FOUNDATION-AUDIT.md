---
status: ready_for_review
owner: platform
last_review: 2026-08-02
baseline: origin/main@ee698f25
---

# Opsly Venture Studio — auditoría de fundación

## Veredicto

**PARTIAL_MODULE_PLATFORM**

Opsly ya tiene un control plane multi-tenant, catálogos operativos, módulos de
infraestructura, tenants, Academy Blueprint, CRM/adapters, automatizaciones,
agents y observabilidad. No existe todavía un contrato único que convierta esas
piezas en una plataforma de módulos funcionales reutilizables para varias
verticales.

Este PR documenta decisiones y límites. No modifica runtime, migraciones,
secretos, despliegues ni tenants productivos.

## Evidencia y clasificación

| Capacidad                     | Evidencia en `origin/main`                                                                                                | Clasificación                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Tenancy e identidad           | `platform.tenants`, `config/tenants/schema.tenant-config.json`, `apps/api/lib/tenant-context.ts`, `apps/api/lib/auth.ts`  | `REUSABLE_WITH_REFACTOR`                                               |
| Roles y autorización          | `apps/api/lib/auth.ts`, `apps/api/lib/portal-trusted-identity.ts`, rutas admin/portal                                     | `REUSABLE_WITH_REFACTOR`                                               |
| Librerías compartidas         | `config/modules.json`, `lib/*`, `packages/*`                                                                              | `PRODUCTION_REUSABLE` como registry de código                          |
| Módulos operativos por tenant | `config/tenant-modules-catalog.json`, scripts bajo `scripts/tenants/`                                                     | `REUSABLE_WITH_REFACTOR`                                               |
| Catálogo comercial            | `config/commercial-catalog.json`, `apps/icso/lib/commercial-catalog.ts`, `apps/icso/content/commercial-catalog.json`      | `PRODUCTION_REUSABLE` como catálogo comercial                          |
| Pattern catalog               | `lib/pattern-catalog/src/*`, fixtures y tests                                                                             | `REUSABLE_WITH_REFACTOR`                                               |
| Tenant provisioning           | `apps/api/lib/tenant-bootstrapper.ts`, `scripts/provisioning/*`, `scripts/generate-tenant-config.sh`                      | `REUSABLE_WITH_REFACTOR`                                               |
| Academy Blueprint             | `docs/blueprints/academy/*`, `config/blueprints/academy/*`                                                                | `REUSABLE_WITH_REFACTOR`                                               |
| Blueprints verticales JSON    | `config/vertical-blueprints/*`                                                                                            | `POC_ONLY` como contrato global; requiere loader común                 |
| CRM                           | Twenty/adapters y rutas operativas; `apps/api/lib/peskids/*`                                                              | `REUSABLE_WITH_REFACTOR`                                               |
| Pipelines                     | `apps/api/lib/peskids/sales-pipeline.ts`, flujos local-services                                                           | `TENANT_SPECIFIC` / `REUSABLE_WITH_REFACTOR`                           |
| Forms/intake                  | schemas y rutas específicas en API/tenants                                                                                | `REUSABLE_WITH_REFACTOR`                                               |
| Providers de negocio          | No existe módulo común; `apps/api/lib/cloud-providers/*` es infraestructura y `apps/admin/components/providers.tsx` es UI | `MISSING`                                                              |
| Service catalog de negocio    | `config/commercial-catalog.json` es comercial; no hay catálogo de servicios por proveedor                                 | `MISSING`                                                              |
| Quotes/proposals              | `apps/api/app/api/provisioning/quote/*`, local-services quotes                                                            | `TENANT_SPECIFIC`                                                      |
| Case management               | No se encontró motor común de casos                                                                                       | `MISSING`                                                              |
| Booking requests              | local-services booking routes/repositories                                                                                | `TENANT_SPECIFIC`                                                      |
| Document vault                | No se encontró vault común con clasificación y signed URLs                                                                | `MISSING`                                                              |
| Payments                      | Stripe/Wompi y billing existentes                                                                                         | `REUSABLE_WITH_REFACTOR`                                               |
| Communications                | email, social y WhatsApp adapters existentes                                                                              | `REUSABLE_WITH_REFACTOR`; WhatsApp fuera de este track                 |
| Automations/events            | n8n catalog, BullMQ/event bus y handlers                                                                                  | `REUSABLE_WITH_REFACTOR`                                               |
| Agents/orchestration          | `apps/orchestrator/src/*`, `lib/external-agent-registry`, skills y policies                                               | `REUSABLE_WITH_REFACTOR`; el contrato canónico debe verificarse en PR1 |
| Health/observability/audit    | `apps/api/lib/infra/heartbeat.ts`, audit, metrics y health routes                                                         | `REUSABLE_WITH_REFACTOR`                                               |
| Venture lifecycle/dashboard   | No existe modelo completo de venture y experiments                                                                        | `MISSING`                                                              |

Para el formato de estado solicitado por PR0, la equivalencia es:
`PRODUCTION_REUSABLE` → `IMPLEMENTED`; `REUSABLE_WITH_REFACTOR` y
`TENANT_SPECIFIC` → `PARTIAL`; `POC_ONLY` y `MISSING` → `PROPOSED`. No se marca
ningún módulo como `DEPRECATED` en esta auditoría. Esta conversión evita
presentar un adapter o una implementación tenant-specific como un Core
terminado.

## Catálogos y duplicaciones

Actualmente existen tres fuentes con responsabilidades distintas:

1. `config/modules.json`: módulos de librería y consumidores.
2. `config/tenant-modules-catalog.json`: packs operativos que pueden activar
   scripts/servicios por tenant.
3. `config/commercial-catalog.json`: módulos, paquetes y verticales para venta.

Academy además tiene dos representaciones: `docs/blueprints/academy/` y
`config/blueprints/academy/`. `config/vertical-blueprints/` añade plantillas
JSON de otra generación.

La solución aprobada no borra estos catálogos en PR0. El Module Registry será
primero una proyección/adaptador validado. Cada fuente conservará su dueño hasta
que todos sus consumidores migren en PRs posteriores.

## Dependencias y consumidores

```text
config/modules.json
  └── librerías/packages y consumidores del monorepo

config/tenant-modules-catalog.json
  └── scripts/tenants, provisioning y administración operativa

config/commercial-catalog.json
  └── apps/icso/lib/commercial-catalog.ts y contenido espejo validado

config/blueprints/* + docs/blueprints/*
  └── validadores, runbooks, provisioning y documentación

platform.tenants + tenant config
  └── API, portal, admin, contexto, billing, jobs y observabilidad
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
  proveedores comerciales de una vertical.
- `docs/adr/ADR-004-supabase-schema-por-tenant.md` documenta una decisión previa
  de schemas por tenant. La estrategia aprobada para la nueva capa funcional es
  tablas compartidas con `tenant_id` y RLS; un ADR futuro deberá superseder la
  decisión anterior antes de implementar tablas nuevas.

## Decisiones canónicas de PR0

- El catálogo operativo actual permanece vigente durante la transición.
- El Module Registry inicial solo lee, valida, normaliza y detecta conflictos.
- Los datos funcionales nuevos usarán tablas compartidas, `tenant_id NOT NULL`,
  RLS, autorización backend, índices y constraints scoped por tenant.
- No se implementan schemas separados por tenant en esta fase.
- Documentos usarán las clases `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`,
  `SENSITIVE_PERSONAL`, `SENSITIVE_HEALTH` y `REGULATED`.
- `medical-tourism-demo` será el primer fixture; no se crea aún un tenant
  productivo de Colombia Health Journey.
- Sin datos clínicos reales, secretos, pagos activos, comunicaciones externas,
  deploy o migraciones productivas.

## Migraciones potenciales fuera de PR0

No se crean todavía. Los contratos futuros podrían requerir, como mínimo,
entidades compartidas para `tenant_entitlements`, `tenant_capabilities`,
`providers`, `provider_documents`, `service_catalog_items`, `service_bundles`,
`quotes`, `quote_items`, `cases`, `case_events`, `booking_requests`,
`documents`, `communications`, `automation_runs`, `ventures` y
`venture_experiments`. Cada PR deberá aportar RLS, rollback y tests de
aislamiento antes de solicitar una migración.

## Secuencia ajustada

`PR-VENTURE-1` debe crear solo el adapter/schema del registry. Después:

`PR-VENTURE-2` entitlements → `PR-VENTURE-3` generator → `PR-VENTURE-4`
blueprint loader → `PR-VENTURE-5` CRM/pipelines → `PR-VENTURE-6` providers →
`PR-VENTURE-7` service catalog → `PR-VENTURE-8` bundles → `PR-VENTURE-9` quotes →
`PR-VENTURE-10` cases → `PR-VENTURE-11` booking requests → `PR-VENTURE-12`
documents → `PR-VENTURE-13` communications → `PR-VENTURE-14` automations →
`PR-VENTURE-15` medical-tourism blueprint → `PR-VENTURE-16` sandbox fixture →
`PR-VENTURE-17` Business Builder → `PR-VENTURE-18` venture dashboard →
`PR-VENTURE-19` reuse proof and closure.

## Estado de PR0

**READY_FOR_REVIEW**

La auditoría y los contratos documentales de este PR se basan en
`origin/main@ee698f25`. No se declara implementado ningún módulo funcional que
no tenga código y consumidores verificables.
