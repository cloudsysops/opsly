---
status: proposed_contract
owner: platform
last_review: 2026-08-02
---

# Tenant Contract

## Fuente de verdad vs. otras representaciones de "tenant"

Este contrato describe la representación de negocio de un tenant. No es la
única representación de "tenant" que existe hoy en el repo — hay al menos
cinco (ver `docs/audits/OPSLY-VENTURE-STUDIO-FOUNDATION-AUDIT.md`, sección
"Catálogos y duplicaciones"): `platform.tenants` (DB, real), `config/tenants/*.json`
(infra onboarding), instancias de blueprint (`config/blueprints/academy/instances/*.json`),
`config/opsly.config.json.tenants[]` (usado solo por el read-model de Mission
Control), y `packages/opsly-core`'s `TenantConfig` (intent-classification, no
relacionado). Este contrato no reemplaza ninguna a la fuerza en PR0 — define
la forma que PR3/PR4 deben producir y validar, apoyada en `platform.tenants` +
`platform.tenant_entitlements` (PR #882) como la fuente operativa real.

## Identidad mínima

```yaml
schema_version: TenantDefinitionV1
slug: <tenant-slug>
name: <display-name>
blueprint: <blueprint-id>
locale: <locale>
supported_locales: []
operating_country: <country-code>
customer_markets: []
currencies: []
timezone: <iana-timezone>
branding: {}
plan: <plan-id>
modules: {}
feature_flags: {}
roles: []
integrations: {}
status: trial
```

El contrato es tenant-aware y no contiene secretos. Los valores reales se
resolverán por configuración segura fuera del archivo versionado.

## Estados

`trial`, `active`, `suspended`, `cancelled`.

## Entitlements

La resolución futura será:

```text
blueprint defaults
  + plan limits
  + tenant overrides
  + feature flags
  = effective entitlements
```

El backend debe aplicar la resolución en cada ruta, job, evento y repositorio.
Ocultar una opción en UI no es autorización.

## Modelo de datos aprobado

Los módulos funcionales nuevos usarán tablas compartidas:

- `tenant_id NOT NULL`.
- RLS y autorización backend.
- índices `(tenant_id, ...)`.
- unicidad scoped por tenant.
- cache keys, eventos, jobs y paths de archivos tenant-aware.

Schemas separados por tenant quedan fuera de esta fase. La decisión previa
documentada en `docs/adr/ADR-004-supabase-schema-por-tenant.md` requiere una
revisión futura antes de crear tablas nuevas.
