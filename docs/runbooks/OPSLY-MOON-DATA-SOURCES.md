---
status: canon
owner: platform
last_review: 2026-08-07
type: runbook
tags:
  - opsly/moon
  - opsly/data-sources
---

# Opsly Moon — Runbook fuentes de datos

Complemento operativo de `docs/00-architecture/OPSLY-MOON-DATA-SOURCES.md`.

## Checklist antes de añadir un KPI

1. ¿Existe API/config real?
2. ¿Etiqueta REAL / ESTIMADO / PROYECTADO?
3. ¿Puede omitirse en empty-state en lugar de mock?
4. ¿Filtra PII / owner_email / leads?
5. ¿Documentado en DATA-SOURCES arquitectura?

## Fuentes rápidas

| UI | Fuente |
| --- | --- |
| Clients | `GET /api/tenants` + `config/tenants/*.json` |
| Usage | `GET /api/metrics`, `GET /api/metrics/tenant/:slug` |
| Costs | `GET /api/admin/costs` (ESTIMADO) |
| Teams/queue | `GET /api/metrics/teams` |
| Approvals | `GET /api/approval-decisions` (admin proxy) |
| Fleet | `config/agent-*.json`, `external-agent-registry.json` |
| Modules | `config/modules.json` |
| Blueprints | `config/vertical-blueprints`, `config/blueprints/academy` |
| Ventures | solo `config/ventures.json` |
| MRR | **omitido** |

## Enlaces

- [[../00-architecture/OPSLY-MOON-DATA-SOURCES]]
- [[OPSLY-MOON-OPERATIONS]]
