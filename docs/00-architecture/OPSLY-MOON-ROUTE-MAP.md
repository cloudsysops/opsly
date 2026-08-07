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

# Opsly Moon — Mapa de rutas (legacy → aliases)

**PR-MOON-0.** Decisión: evolucionar `apps/admin`. Conservar rutas legacy. Introducir `/moon/*` como **aliases graduales** (mismos layouts y datos). Redirects canónicos = PR posterior tras validar bookmarks.

## Principios

1. No big-bang de URLs.
2. Legacy permanece funcional en MOON-1/2.
3. Alias `/moon` no implica app nueva.
4. Panel tenant (Peskids) **fuera** de este mapa (`apps/peskids` `/admin/*`).

## Rutas legacy actuales (`apps/admin`)

| Ruta legacy | Madurez | Rol en Moon |
| --- | --- | --- |
| `/` → dashboard | PARTIAL | Home plataforma |
| `/dashboard` | PARTIAL | Home |
| `/tenants` | PARTIAL | Cartera clientes |
| `/tenants/[slug]` | PARTIAL | Detalle cliente |
| `/tenants/[slug]/graph` | PARTIAL | Vista grafo |
| `/v1`, `/v1/[tenantRef]` | PARTIAL | Superficie v1 / compat |
| `/invitations` | IMPLEMENTED | Onboarding |
| `/machines` | PARTIAL | Infra / hosts |
| `/costs` | PARTIAL | Usage/costos (etiqueta ESTIMADO) |
| `/metrics/llm`, `/metrics/ollama` | PARTIAL | Uso modelos |
| `/feedback` | IMPLEMENTED | Soporte plataforma |
| `/agents`, `/agents-team` | PARTIAL | Fleet / config |
| `/mission-control` | PARTIAL | MC parcial |
| `/mission-control/office` | PARTIAL | Office canvas |
| `/mission-control/foundation` | PARTIAL | Foundation snapshot |
| `/mission-control/incubation` | PARTIAL | Incubation |
| `/mission-control/local-runtime` | PARTIAL | Local agents |
| `/mission-control/chat` | PARTIAL | Chat experimental |
| `/openclaw/ide`, `/openclaw-governance` | PARTIAL | OpenClaw |
| `/approval-decisions` | PARTIAL | Approvals |
| `/settings` | IMPLEMENTED | Sistema |
| `/api-surface`, `/insights`, `/notebooklm`, … | PARTIAL | Observabilidad / tools |
| `/defense-platform`, `/icso-catalog`, … | PARTIAL | Productos satélite |

**Fuera de Moon (otro track):** cualquier ruta bajo el tenant app Peskids (`/admin`, `/admin/pipeline`, `/admin/interesados/...`).

## Aliases Moon propuestos (graduales)

| Alias Moon (PROPOSED) | Apunta inicialmente a | Notas |
| --- | --- | --- |
| `/moon` | `/dashboard` (mismo layout rebrand) | Home Control Center |
| `/moon/clients` | `/tenants` | |
| `/moon/clients/[tenantSlug]` | `/tenants/[slug]` | Tabs Moon en PRs posteriores |
| `/moon/agents` | `/agents` o consolidado agents-team | Solo registros reales |
| `/moon/approvals` | `/approval-decisions` | |
| `/moon/usage` | `/metrics/llm` (+ costs usage) | |
| `/moon/billing` | `/costs` | Sin MRR; etiquetas ESTIMADO |
| `/moon/health` | overview / machines / monitoring | Componer en MOON-9 |
| `/moon/deployments` | PROPOSED | Sin UI completa hoy |
| `/moon/automations` | PROPOSED | Inventario n8n |
| `/moon/integrations` | PROPOSED | |
| `/moon/blueprints` | PROPOSED | `config/vertical-blueprints` |
| `/moon/modules` | PROPOSED | Read-only hasta #881/#882 |
| `/moon/ventures` | PROPOSED | Venture Studio |
| `/moon/tasks`, `/moon/queue` | PROPOSED | Mapear BullMQ; **no** Envelope |
| `/moon/support` | `/feedback` (+ futuras colas) | |
| `/moon/settings` | `/settings` | |

Mission Control parcial (`/mission-control*`) puede vivir como sección “Agentes / Runtime” bajo Moon nav hasta absorber UX; **no** promover `apps/mission-control` como app.

## Rutas Moon del brief vs realidad

| Brief | Estado |
| --- | --- |
| `/moon` … lista completa | PROPOSED aliases |
| Tasks vía AgentTaskEnvelopeV1 | **BLOCKED** — contrato no implementado |
| Deploy desde UI | BLOCKED sin permissions + approval + rollback |
| MRR en Home | **Omitido** |

## Navegación objetivo (MOON-1)

Agrupación UX (sin romper deep links):

```text
PLATAFORMA
  Inicio (/moon → /dashboard)
  Clientes (/moon/clients → /tenants)
  Playbooks/Blueprints (PROPOSED)
  Agentes
  Automatizaciones (PROPOSED)
  Integraciones (PROPOSED)
  Despliegues (PROPOSED)

ANÁLISIS
  Reportes / métricas LLM
  Costos / uso

SISTEMA
  Approvals
  Settings
  Health
```

Items ocultos por rol (PROPOSED roles: Owner, Operator, Tenant Support, Sales, Finance, Read-only).

## Separación de tracks (rutas)

| Track | App | Prefijo típico |
| --- | --- | --- |
| B — Opsly Moon | `apps/admin` | `/dashboard`, `/tenants`, `/moon/*` |
| A — Peskids MC | `apps/peskids` | `/admin`, `/admin/interesados/*` |

Prohibido: importar componentes de embudo Peskids en Moon; prohibido embeber Kanban de leads en `apps/admin`.

## Plan de migración URL (post MOON-1)

1. **MOON-1:** shell + nav; aliases opcionales sin deprecar legacy.
2. Validar bookmarks, enlaces Discord/docs, RoleSwitcher externos.
3. PR de redirects 301/308 legacy→canónico **solo** tras OK humano.
4. Actualizar docs/runbooks que citen URLs admin.

## Apps no-ruta

| Path repo | Estado respecto a Moon |
| --- | --- |
| `apps/admin` | **Control plane canónico** |
| `apps/mission-control` | DEPRECATED/experimental — no segundo Moon |
| `apps/moon` | **No crear** |
| `apps/peskids` | Tenant panel — Track A |

## Enlaces

- [[OPSLY-MOON-AUDIT]]
- [[OPSLY-MOON-DATA-SOURCES]]
- [[../adr/ADR-031-experimental-consolidation]]
- [[../runbooks/VPS-MEMORY-CAPS]]
