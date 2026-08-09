---
status: canon
owner: operations
last_review: 2026-08-07
type: runbook
tags:
  - opsly/moon
---

# Opsly Moon — Data sources (runbook)

Espejo operativo de `docs/00-architecture/OPSLY-MOON-DATA-SOURCES.md`.

| Superficie | Fuente | Label |
| --- | --- | --- |
| Clientes | `GET /api/tenants` + `config/tenants/*` | REAL |
| Health host | `GET /api/metrics/system` | REAL si `mock!==true` else ESTIMADO |
| Teams / queue | `GET /api/metrics/teams` | REAL (agregado) |
| Costs | `GET /api/admin/costs` | ESTIMADO |
| Usage tenant | `GET /api/metrics/tenant/:slug` | REAL |
| MRR | — | PROYECTADO omitido |
| Agents | `config/agent-*.json`, `external-agent-registry.json` | REAL (config) |
| Modules | `config/modules.json` | REAL (registry) |
| Blueprints | `config/vertical-blueprints` | REAL (config) |
| Ventures | `config/ventures.json` si existe | REAL o empty |
| Approvals | `GET /api/approval-decisions` | REAL |

**Prohibido:** clientes mock de demos visuales, MRR inventado, heartbeats falsos, PII Peskids.
