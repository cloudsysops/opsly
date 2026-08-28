---
status: canon
owner: product
last_review: 2026-07-26
tenant_slug: peskids
---

# Peskids — modelo de franquicias (dentro del tenant)

## Regla no negociable

**No crear un tenant Opsly por franquicia.** El control plane sigue siendo un solo tenant:

- `tenant_slug` / `tenant_id` = **`peskids`**
- Cada unidad comercial/operativa es una fila en `platform.peskids_franchises`

Duplicar tenants partiría CRM, alumnos, profesores, reportes, Twenty/n8n y permisos. Migrarlo después es más caro.

## Unidades iniciales

| Slug | Nombre | Tipo | Rol |
|------|--------|------|-----|
| `llanogrande-principal` | Llanogrande Principal | `flagship` | Franquicia principal / sede física |
| `domicilios-peskids` | Domicilios Peskids | `mobile` | Unidad operativa propia de Peskids |

Futuras franquicias (Rionegro, Envigado, …) = **nuevas filas** en `peskids_franchises` con `type = franchise`, no tenants nuevos.

## Capas

```
tenant peskids
  └── franchises (flagship | owned | franchise | mobile)
        └── franchise_locations (pool | home_zone | office | service_area)
        └── franchise_staff_memberships (user_id + role)
```

Operativo existente:

- `pools` / `classes` / `leads` / `trial_classes` / `students` / `followups` / `messages` ganan `franchise_id` nullable.
- `class_modality` / `location` (`llanogrande` \| `domicilio`) siguen como **compatibilidad**, no como control principal.

## Backfill

- `class_modality` / `modality` / `location` = `domicilio` → `domicilios-peskids`
- cualquier otro / null → `llanogrande-principal`
- Idempotente: solo rellena donde `franchise_id IS NULL`

## Permisos (fase actual)

- `owner` / `admin` globales: ven **todo** (filtro admin opcional).
- `teacher` / `support`: el portal Franchise aplica membership/scope server-side para la lectura de unidades; el enforcement equivalente aún debe extenderse y probarse en todos los endpoints Peskids.
- Seed: memberships owner/admin en ambas franquicias cuando hay `user_id` en `platform.tenant_memberships`.

## Migración

- Canónica: `supabase/migrations/0090_peskids_franchise_operating_model.sql`
- Espejo: `apps/peskids/migrations/20260727_franchise_operating_model.sql`

## UI mínima

- Filtro «Franquicia / sede» en dashboard admin/support (`?franchise_id=`).
- Settings muestra franquicias activas / flagship (solo lectura).
- El portal Franchise no debe exponer automáticamente emails de padres ni otra PII familiar; cualquier excepción requiere política explícita y pruebas de scope.

## Relación con PR intake (#831)

El intake de leads con campos `lead_type` / `service_mode` puede rebasearse **sobre** este modelo. No mezclar «franquicia = tenant hijo».

## Enlaces

- [[DATA-MODEL|Modelo de datos]]
- [[ARCHITECTURE|Arquitectura tenant]]
