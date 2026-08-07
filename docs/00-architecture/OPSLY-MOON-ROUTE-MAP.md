---
status: canon
owner: platform
last_review: 2026-08-07
type: architecture
tags:
  - opsly/moon
  - opsly/routing
  - opsly/admin
---

# Opsly Moon — Mapa de rutas (legacy ↔ `/moon`)

**PR-MOON-0 / night-shift.** `apps/admin` es canónico. Legacy permanece. `/moon/*` son aliases reales (no redirects 301 masivos aún).

## Principios

1. No big-bang de URLs.
2. Legacy funcional (`/dashboard`, `/tenants`, `/costs`, …).
3. `/moon` no implica `apps/moon`.
4. Panel tenant Peskids **fuera** de este mapa.

## Aliases Moon (**IMPLEMENTED**)

| Alias Moon | Legacy / fuente | Madurez |
| --- | --- | --- |
| `/` → `/moon` | root redirect | IMPLEMENTED |
| `/moon` | Home Control Center (datos APIs) | IMPLEMENTED |
| `/moon/clients` | cartera; legacy `/tenants` | IMPLEMENTED |
| `/moon/clients/[slug]` | detalle tabs; legacy `/tenants/[slug]` | PARTIAL |
| `/moon/agents` | registries; legacy `/agents` | IMPLEMENTED |
| `/moon/tasks` | teams metrics read-model | PARTIAL |
| `/moon/queue` | resumen cola | PARTIAL |
| `/moon/approvals` | `/api/approval-decisions`; legacy `/approval-decisions` | PARTIAL |
| `/moon/automations` | config tenants + n8n catalog | PARTIAL |
| `/moon/integrations` | catálogo proveedores | PARTIAL |
| `/moon/deployments` | doc-only empty + runbooks | PARTIAL |
| `/moon/health` | system metrics + unknown services | PARTIAL |
| `/moon/usage` | `/api/metrics`; legacy `/metrics/llm` | IMPLEMENTED |
| `/moon/costs` | `/api/admin/costs`; legacy `/costs` | IMPLEMENTED |
| `/moon/billing` | empty-state (sin MRR) | IMPLEMENTED |
| `/moon/blueprints` | vertical-blueprints + academy | IMPLEMENTED |
| `/moon/modules` | `config/modules.json` | IMPLEMENTED |
| `/moon/ventures` | `config/ventures.json` only | IMPLEMENTED |
| `/moon/command` | dry-run command router | IMPLEMENTED |
| `/moon/reports` | índice enlaces métricas | IMPLEMENTED |
| `/moon/support` | redirect `/feedback` | IMPLEMENTED |
| `/moon/settings` | redirect `/settings` | IMPLEMENTED |

## Legacy relevantes (siguen vivos)

`/dashboard`, `/tenants`, `/tenants/[slug]`, `/invitations`, `/machines`, `/costs`, `/metrics/llm`, `/feedback`, `/agents`, `/mission-control*`, `/approval-decisions`, `/settings`, `/api-surface`, …

## Bloqueados

| Capacidad | Estado |
| --- | --- |
| AgentTaskEnvelopeV1 store | BLOCKED — no implementado |
| Deploy / mute queue desde UI | BLOCKED — sin contrato approval-first |
| MRR en home/billing | BLOCKED — omitido |

## Tracks

| Track | App | Prefijo |
| --- | --- | --- |
| B — Opsly Moon | `apps/admin` | `/moon/*`, legacy admin |
| A — Peskids MC | `apps/peskids` | `/admin/*` |

## Apps

| Path | Estado |
| --- | --- |
| `apps/admin` | Control plane canónico |
| `apps/mission-control` | DEPRECATED experimental |
| `apps/moon` | **No crear** |

## Enlaces

- [[OPSLY-MOON-AUDIT]]
- [[OPSLY-MOON-DATA-SOURCES]]
