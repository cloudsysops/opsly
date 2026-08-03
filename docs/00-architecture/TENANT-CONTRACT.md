---
status: proposed_contract
owner: platform
last_review: 2026-08-02
---

# Tenant Contract

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
