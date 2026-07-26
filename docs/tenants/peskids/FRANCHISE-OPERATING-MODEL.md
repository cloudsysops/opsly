---
status: draft
owner: operations
last_review: 2026-07-26
type: runbook
tenant: peskids
---

# Peskids — Franchise operating model

## Principio

**Un solo `tenant_slug=peskids`.** Llanogrande y Domicilios no son tenants Opsly separados.

ICSO/Opsly administra el tenant; las franquicias son entidades **dentro** de Peskids.

## Sedes / franquicias iniciales

| Slug | Tipo | Rol |
|------|------|-----|
| `llanogrande-principal` | `flagship` (`is_primary=true`) | Franquicia/sede principal (clases en sede) |
| `domicilios-peskids` | `mobile` / owned | Operación propia a domicilio |

Compatibilidad: `class_modality` / `service_mode` `llanogrande` \| `domicilio` sigue válida hasta que todo el runtime escriba `franchise_id`.

## Qué debe llevar `franchise_id` (cuando exista la columna)

- leads / interesados
- students / alumnos
- classes / grupos
- trial_classes
- followups
- staff memberships (tabla dedicada)

`franchise_id` es **nullable** al inicio; backfill desde modality/location es idempotente (migración franchise model).

## Qué no hacer

- No crear tenant `llanogrande` ni `domicilios` en Opsly “para aislar”.
- No duplicar CRM ni n8n por sede como control plane paralelo.
- No asumir ACL teacher/support por franquicia hasta que esté implementada (solo memberships preparadas).

## Relación con código / PRs

- Migración / tablas: PR franchise model (`0090_peskids_franchise_operating_model.sql`).
- Seed machine: `blueprints/academy/seed/franchise-defaults.json`.
- Doc índice Academy: `docs/blueprints/academy/README.md`.

## Operación diaria

1. Lead familia sede → preferir franquicia primary / modality `llanogrande`.
2. Lead familia domicilio → franquicia mobile / modality `domicilio` + barrio/zona.
3. Staff/profesor → membership en la franquicia donde opera.
4. Dashboard: filtrar por `franchise_id` cuando el UI lo exponga.
