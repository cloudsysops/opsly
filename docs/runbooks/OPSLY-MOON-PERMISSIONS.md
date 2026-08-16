---
status: canon
owner: platform
last_review: 2026-08-07
type: runbook
tags:
  - opsly/moon
  - opsly/security
---

# Opsly Moon — Permisos

## Modelo actual

Auth admin vía sesión Supabase (mismo gate que `apps/admin` legacy). No hay RBAC fino Moon-only en v1.

## Reglas

| Acción | Política |
| --- | --- |
| Lectura tenants / metrics / costs | Sesión admin válida |
| Mutación costos / approvals | Flujos API existentes + audit; **no** auto-approve |
| Deploy / pause queue / activate n8n | **Bloqueado** en UI Moon hasta approval-first explícito |
| Command Center | Dry-run local únicamente |
| Ver PII tenant (leads, familias) | **Prohibido** en Moon |

## Roles futuros (PROPOSED)

Owner, Operator, Tenant Support, Sales, Finance, Read-only — no implementar sin ADR.

## Secrets

Nunca mostrar valores; solo **nombres** de secretos requeridos en fleet (`required_secret_names`).

## Enlaces

- [[../00-architecture/OPSLY-MOON-AUDIT]]
- [[../SECURITY_CHECKLIST]]
