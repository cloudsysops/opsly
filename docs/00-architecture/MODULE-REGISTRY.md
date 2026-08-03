---
status: proposed_contract
owner: platform
last_review: 2026-08-02
---

# Canonical Module Registry

## Propósito

`CanonicalModuleDefinitionV1` es una representación de lectura y validación.
Durante la transición proyecta:

```text
config/tenant-modules-catalog.json
config/modules.json
config/commercial-catalog.json
        ↓
Module Registry Adapter
        ↓
CanonicalModuleDefinitionV1
```

PR0 no cambia consumidores ni elimina fuentes existentes.

## Contrato propuesto

```yaml
schema_version: CanonicalModuleDefinitionV1
id: crm
version: 1.0.0
display_name: CRM
description: Customer and opportunity management
capabilities: [crm, pipelines]
dependencies: [identity, tenancy]
optional_dependencies: [communications]
required_roles: [tenant_owner, operations_admin]
required_tables: []
required_secrets: []
events_produced: []
events_consumed: []
routes: []
dashboards: []
workflows: []
feature_flags: []
health_checks: []
smoke_tests: []
migration_requirements: []
compatibility:
  operational_ids: [twenty]
  commercial_ids: [simple-crm]
status: proposed
```

Los campos de secretos describen nombres contractuales o referencias de
configuración, nunca valores. Los comandos operativos permanecen en el
catálogo operativo y no se exponen como entitlements funcionales.

## Estados

`proposed`, `experimental`, `beta`, `stable`, `deprecated`.

## Reglas de validación

- IDs únicos globalmente dentro de la representación canónica.
- Versiones semver válidas.
- Dependencias existentes y sin ciclos.
- `required_tables`, rutas y smoke tests deben apuntar a artefactos existentes
  cuando el módulo se marque `stable`.
- `required_secrets` nunca contiene valores.
- Un mismo ID operativo/comercial puede mapearse a un módulo canónico solo con
  evidencia y warning explícito de compatibilidad.
- La proyección no muta ninguna fuente.

## Mapeo inicial

| Fuente                               | Responsabilidad  | Tratamiento           |
| ------------------------------------ | ---------------- | --------------------- |
| `config/modules.json`                | librerías        | adapter `library`     |
| `config/tenant-modules-catalog.json` | packs operativos | adapter `operational` |
| `config/commercial-catalog.json`     | venta y paquetes | adapter `commercial`  |

PR1 añadirá schema, adapter, conflictos, validación y fixtures. No añadirá
providers, tablas de dominio ni runtime nuevo.
