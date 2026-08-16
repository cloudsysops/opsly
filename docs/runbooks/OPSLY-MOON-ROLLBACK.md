---
status: canon
owner: platform
last_review: 2026-08-07
type: runbook
tags:
  - opsly/moon
  - opsly/rollback
---

# Opsly Moon — Rollback

## Principio

Moon es UI/docs sobre `apps/admin`. Rollback = revertir commits/PR de admin+docs. **No** requiere migraciones DB ni cambios Doppler por defecto.

## Opciones

1. **Revert PR** night-shift / Moon en GitHub (preferido).
2. **Checkout legacy routes:** `/dashboard`, `/tenants`, `/costs` siguen vivos sin `/moon`.
3. **Root redirect:** si `/` → `/moon` causa problema, restaurar redirect a `/dashboard` en `apps/admin/app/page.tsx`.

## No hacer

- Hard reset de `main` en prod.
- Rebuild VPS paralelo bajo alerta de memoria.
- Desactivar Peskids para “arreglar” Moon.

## Deploy

Solo en ventana nocturna America/Bogota 22:00–06:00 si el cambio toca imagen admin en prod (ver `PRODUCTION-CHANGE-WINDOW.md`). Este track night-shift **no** despliega.

## Enlaces

- [[OPSLY-MOON-OPERATIONS]]
- [[PRODUCTION-CHANGE-WINDOW]]
