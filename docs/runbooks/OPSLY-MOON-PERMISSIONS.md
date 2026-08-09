---
status: canon
owner: security
last_review: 2026-08-07
type: runbook
tags:
  - opsly/moon
  - opsly/security
---

# Opsly Moon — Permissions

## Auth

Misma sesión admin Supabase que `apps/admin` (middleware + `AuthSessionRedirect`).

## Principios

| Acción | Política |
| --- | --- |
| Lectura tenants/metrics/costs | Admin autenticado (existente) |
| Mutación queue/deploy | **Bloqueada** en UI Moon hasta API + approval |
| Approval decisions | Sin auto-approve; legacy auditado |
| Command Center | Dry-run / navegación; sin gasto LLM no autorizado |
| Secretos | Solo **nombres** de env; nunca valores |

## Tenant isolation

- Ficha cliente: slug de path + APIs existentes.
- No listar PII (`owner_email` omitido en cards Moon).
- No mezclar datos operativos Peskids (leads/estudiantes).

## Auditoría

Cambios sensibles deben pasar por Approval Center / flujos API existentes. Moon no añade bypass.
