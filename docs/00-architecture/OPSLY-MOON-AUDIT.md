---
status: canon
owner: platform
last_review: 2026-08-07
type: architecture
tags:
  - opsly/moon
  - opsly/control-plane
  - opsly/admin
---

# Opsly Moon — Auditoría del control plane (PR-MOON-0)

**Estado:** post-merge [#922](https://github.com/cloudsysops/opsly/pull/922) + night-shift hardening (`feat/opsly-moon-night-shift`).  
**Runtime base:** `apps/admin` · **No** `apps/moon` · **No** segundo control plane vía `apps/mission-control`.

Opsly Moon es el **Mission Control global** de IntCloudSysOps. **No** es el panel operativo de un tenant (Peskids Mission Control).

## Leyenda de madurez

| Etiqueta | Significado |
| --- | --- |
| **IMPLEMENTED** | Existe en `main` y es usable (con matices). |
| **PARTIAL** | Existe incompleto o experimental. |
| **PROPOSED** | Diseño aprobado; no en código. |
| **DEPRECATED** | No usar como segundo control plane. |
| **BLOCKED** | Bloqueado por dependencia, capacidad o decisión. |

## Decisiones canónicas

1. Moon = evolución incremental de `apps/admin` — **IMPLEMENTED**.
2. `apps/mission-control` experimental — **DEPRECATED** como segundo control plane ([ADR-031](../adr/ADR-031-experimental-consolidation.md)).
3. Aliases `/moon/*` + rutas legacy vivas — **IMPLEMENTED**.
4. Cliente visible = `platform.tenants` + `config/tenants/*` — **IMPLEMENTED** (regla + UI).
5. MRR global oculto — **BLOCKED** hasta billing comercial. Costos/uso con **REAL | ESTIMADO | PROYECTADO**.
6. Modules/entitlements editables — **PARTIAL / read-only**; no asumir merge #881/#882.
7. Track A (Peskids MC) ≠ Track B (Moon) — **IMPLEMENTED** (gobernanza).
8. VPS ~4 GiB alerta activa — **BLOCKED** para deploy/builds pesados desde este track. [VPS-MEMORY-CAPS](../runbooks/VPS-MEMORY-CAPS.md).

## Separación Moon vs panel tenant

```text
Opsly Moon (apps/admin)
├── cartera tenants reales → cards / detalle / abrir panel
└── agents / queue / costs / health / blueprints (plataforma)

Panel tenant (ej. apps/peskids)
└── leads, familias, clases, WhatsApp operativo, PII
```

| Capacidad | Moon | Panel tenant |
| --- | --- | --- |
| Lista clientes / health agregado | Sí | No |
| Leads / alumnos / familias | **No** | Sí |
| Agents fleet / costs / deploy plataforma | Sí | No (salvo resumen local) |
| Blueprints / módulos lib | Sí (read-only) | Consumo vía flags |

## Estado por superficie (post-#922)

| Área | Madurez | Notas |
| --- | --- | --- |
| Auth / layout / MoonShell | IMPLEMENTED | Root layout usa MoonShell |
| `/moon` home + KPIs etiquetados | IMPLEMENTED | Sin MRR ficticio |
| `/moon/clients` + cards | IMPLEMENTED | Sanitiza sin `owner_email` |
| `/moon/clients/[slug]` tabs | PARTIAL | overview/modules/usage wired; resto placeholders honestos |
| `/moon/agents` fleet | IMPLEMENTED | registries config; heartbeat = Unknown |
| `/moon/tasks` + `/moon/queue` | PARTIAL | read-model desde `/api/metrics/teams`; sin Envelope |
| `/moon/approvals` | PARTIAL | lista `/api/approval-decisions`; mutación legacy |
| `/moon/blueprints` + `/moon/modules` | IMPLEMENTED | vertical-blueprints + `modules.json` + academy index |
| `/moon/automations` + `/moon/integrations` | PARTIAL | inventario read-only; sin activación |
| `/moon/deployments` | PARTIAL | UI explícitamente no-deploy |
| `/moon/health` | PARTIAL | host REAL/ESTIMADO; servicios unknown hasta probe |
| `/moon/usage` + `/moon/costs` + `/moon/billing` | IMPLEMENTED / PARTIAL | billing empty-state honesto |
| `/moon/ventures` | IMPLEMENTED | solo `config/ventures.json` |
| `/moon/command` + CommandBar | IMPLEMENTED | dry-run router local; sin LLM |
| `/moon/support` `/moon/settings` | IMPLEMENTED | redirect legacy |
| `/moon/reports` | IMPLEMENTED | índice métricas / sin inventar reportes |
| AgentTaskEnvelopeV1 | **BLOCKED** | no existe — no fingir |
| Deploy desde UI | **BLOCKED** | approval + rollback + ventana prod |
| MRR | **BLOCKED** | omitido |

Detalle: [OPSLY-MOON-DATA-SOURCES.md](./OPSLY-MOON-DATA-SOURCES.md) · [OPSLY-MOON-ROUTE-MAP.md](./OPSLY-MOON-ROUTE-MAP.md).

## Inventario tenants (config)

Bajo `config/tenants/` (excl. template/schema): p. ej. `peskids`, `smiletripcare`, `legalvial`, `local-services`, `panini-lab`, `intcloudsysops`.  
Nombres solo de mockups (“Salud Journey…”) = **omitidos**.

## Registries (no duplicar)

| Registry | Madurez | Uso Moon |
| --- | --- | --- |
| `config/modules.json` | IMPLEMENTED | `/moon/modules` |
| `config/vertical-blueprints/*` | PARTIAL | `/moon/blueprints` |
| `config/blueprints/academy/*` | PARTIAL | listado academy en blueprints |
| `agent-services` / `agent-capabilities` / `external-agent-registry` | IMPLEMENTED | fleet |
| BullMQ vía metrics teams | PARTIAL | tasks/queue |
| Entitlements mutables | BLOCKED editable | read-only |

## Memoria VPS

**BLOCKED** para este track: no segunda app, no builds concurrentes, no deploy Moon→prod, smoke secuencial.

## Riesgos abiertos

1. Confundir `/mission-control*` parcial con Moon shell.
2. Tabs cliente aún placeholders → no declarar “completo”.
3. Aprobaciones de costos en memoria de proceso API.
4. Asumir merge #881/#882/#875.
5. Mezcla accidental Track A / Track B.

## Qué no hace Moon night-shift

- Merge a `main` / deploy / migraciones prod / secretos / DNS.
- Agentes LLM de pago / bypass Gateway.
- Inventar tenants, MRR o heartbeats.

## Enlaces

- [[OPSLY-MOON]]
- [[OPSLY-MOON-DATA-SOURCES]]
- [[OPSLY-MOON-ROUTE-MAP]]
- [[../runbooks/OPSLY-MOON-OPERATIONS]]
- [[../runbooks/VPS-MEMORY-CAPS]]
