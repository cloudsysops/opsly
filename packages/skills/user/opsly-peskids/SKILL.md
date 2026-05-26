---
name: opsly-peskids
description: Peskids tenant-specific product and operations work. Use when changing landing, admin, teacher, support, families, auth, routes, docs, or deployment for the Peskids tenant.
---

# Peskids Tenant Skill

## Cuándo usar

Usa este skill para cualquier trabajo de Peskids: UI, auth, APIs, docs, deploy, smoke tests o cambios de rol.

## Reglas

- `tenant_slug` es la fuente de verdad.
- Si algo sirve para más de un tenant, va al core de Opsly y se activa por configuración.
- Peskids no es un fork permanente; es un tenant incubado que debe poder extraerse a su propio VPS.
- No tocar otros tenants ni cambiar arquitectura global salvo que el cambio sea reusable y esté alineado con `VISION.md`.

## Orden de lectura

1. `AGENTS.md`
2. `VISION.md`
3. `docs/tenants/peskids/README.md`
4. `docs/tenants/peskids/PRODUCTION-HARDENING-BLUEPRINT.md`
5. `docs/tenants/peskids/CLIENT-HANDOFF-CHECKLIST.md`

## Superficies Peskids

- `Landing`: home pública y CTA.
- `Families`: acceso por Google y sus propias entregas.
- `Teacher`: agenda docente, entregas y observaciones.
- `Support`: mensajes, seguimiento e incidencias.
- `Admin`: equipo, leads, configuración y operación.

## Workflow

1. Identifica la superficie y el rol.
2. Decide si la capacidad debe vivir en Opsly core o solo en Peskids.
3. Usa helpers compartidos para auth, routing y tenant scoping.
4. Mantén los copy y permisos separados por rol.
5. Valida con type-check, tests y smoke browser antes de mostrar al cliente.

## Validación mínima

- `npm run type-check --workspace=peskids`
- tests relevantes del área tocada
- `git diff --check`
- smoke en navegador para el rol afectado

## No hacer

- No hardcodear `peskids` como caso especial cuando la regla pertenece al core.
- No mezclar admin, support y teacher en la misma UX.
- No dejar rutas públicas leyendo datos de otro rol o de otro `tenant_slug`.

