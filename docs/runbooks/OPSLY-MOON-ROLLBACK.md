---
status: canon
owner: operations
last_review: 2026-08-07
type: runbook
tags:
  - opsly/moon
---

# Opsly Moon — Rollback

## UI / código

1. Revertir PR(s) Moon o `git revert` de commits en la rama mergeada.
2. Root `apps/admin/app/page.tsx` puede volver a `redirect('/dashboard')` si hace falta.
3. Restaurar `AppChrome` en `layout.tsx` si el shell Moon rompe bookmarks críticos (legacy pages siguen existiendo bajo `/dashboard`, `/tenants`, …).

## Feature

No hay feature flag runtime obligatorio: las rutas `/moon/*` son aditivas. Quitar nav Moon = revertir `MoonShell`/`nav.ts`.

## Datos

Moon es mayormente read-only; no hay migraciones propias en MOON-0…13 de esta night shift.

## Deploy

No hay deploy Moon automático en esta entrega. Si se desplegó admin por error: redeploy imagen admin previa desde GHCR tag conocido.
