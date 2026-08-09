---
status: canon
owner: platform
last_review: 2026-08-07
type: architecture
tags:
  - opsly/moon
  - opsly/admin
---

# Opsly Moon

**Opsly Moon** es la evolución del control plane en `apps/admin` (no `apps/moon`, no segundo control plane vía `apps/mission-control`).

## Qué es

Control plane profesional multi-tenant para IntCloudSysOps: clientes, blueprints, módulos, agentes, colas, approvals, automatizaciones, health, usage/costos etiquetados, ventures (si existen), command center dry-run.

## Qué no es

- **No** es Peskids Mission Control (leads, familias, clases, PII operativa).
- **No** inventa MRR ni clientes ficticios.
- **No** despliega ni muta prod desde la UI por defecto.

## Documentación

| Doc | Rol |
| --- | --- |
| [OPSLY-MOON-AUDIT.md](./OPSLY-MOON-AUDIT.md) | Auditoría MOON-0 |
| [OPSLY-MOON-DATA-SOURCES.md](./OPSLY-MOON-DATA-SOURCES.md) | Fuentes REAL/ESTIMADO/PROYECTADO |
| [OPSLY-MOON-ROUTE-MAP.md](./OPSLY-MOON-ROUTE-MAP.md) | Legacy ↔ `/moon/*` |
| [../runbooks/OPSLY-MOON-OPERATIONS.md](../runbooks/OPSLY-MOON-OPERATIONS.md) | Operación |
| [../runbooks/OPSLY-MOON-ROLLBACK.md](../runbooks/OPSLY-MOON-ROLLBACK.md) | Rollback |
| [../runbooks/OPSLY-MOON-PERMISSIONS.md](../runbooks/OPSLY-MOON-PERMISSIONS.md) | Permisos |
| [../runbooks/OPSLY-MOON-DATA-SOURCES.md](../runbooks/OPSLY-MOON-DATA-SOURCES.md) | Runbook fuentes |

## Entrada

- UI: `/moon` (root admin redirige aquí; `/dashboard` legacy intacto)
- Shell: `MoonShell` / `MoonSidebar` / `MoonHeader`

## Principios

1. Reutilizar APIs admin existentes.
2. Dry-run / read-only por defecto.
3. Approval-first para acciones sensibles.
4. LLM solo vía Orchestrator → Gateway.
5. Respetar caps de memoria VPS (`docs/runbooks/VPS-MEMORY-CAPS.md`).
