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

**Estado del documento:** canon de auditoría · **PR:** PR-MOON-0 · **Runtime:** no modificado.

Opsly Moon es el **Mission Control global** de IntCloudSysOps: clientes, tenants, blueprints, módulos, agentes, automatizaciones, health, costos, soporte y ventures. **No** es el panel operativo de un tenant (p. ej. Peskids Mission Control).

## Leyenda de madurez

| Etiqueta | Significado |
| --- | --- |
| **IMPLEMENTED** | Existe en `main` y es usable (con matices documentados). |
| **PARTIAL** | Existe de forma incompleta o experimental. |
| **PROPOSED** | Diseño aprobado; aún no en código. |
| **DEPRECATED** | No usar como segundo control plane; plan de retiro/absorción pendiente. |
| **BLOCKED** | Bloqueado por dependencia, capacidad o decisión explícita. |

## Decisiones canónicas (aprobadas 2026-08-07)

1. **IMPLEMENTED (decisión) / PROPOSED (código):** Moon = **rebrand y evolución incremental** de `apps/admin`, no `apps/moon`.
2. **DEPRECATED como app activa:** `apps/mission-control` permanece experimental/archivo ([ADR-031](../adr/ADR-031-experimental-consolidation.md)). No reactivarlo como segundo control plane.
3. **PROPOSED:** aliases graduales `/moon/*` sobre los mismos layouts; rutas legacy se conservan.
4. **IMPLEMENTED (regla de datos):** cliente visible = tenant en `platform.tenants` + `config/tenants/*`. Stacks VPS = señal de infraestructura, no cartera automática.
5. **BLOCKED (MRR global):** ocultar MRR hasta fuente comercial confiable. Costos/uso/proyectos con etiqueta **REAL | ESTIMADO | PROYECTADO**.
6. **PROPOSED:** PR-MOON-1/2 **no** dependen de PRs #881 / #882. Modules/Entitlements editables esperan merge o quedan read-only con fuente explícita.
7. **IMPLEMENTED (gobernanza de tracks):** Track A = Peskids Mission Control (tenant). Track B = Opsly Moon (plataforma). Worktrees, ramas y responsabilidades separados. Moon **no** importa UI de negocio Peskids; Peskids **no** importa shell administrativo Moon salvo design system/`lib` compartido.
8. **BLOCKED (ops):** alerta de memoria VPS ~4 GiB **activa** — no segunda app, no builds pesados concurrentes, no deploy en este track. Ver [VPS-MEMORY-CAPS](../runbooks/VPS-MEMORY-CAPS.md) y [ACTIVE-CAPACITY-ALERT](../ops/ACTIVE-CAPACITY-ALERT.md).

## Separación Moon vs panel tenant

```text
Opsly Moon (apps/admin → Control Center)
├── Peskids          → “Abrir panel” → apps/peskids /admin (tenant MC)
├── smiletripcare
├── legalvial
├── …
└── futuros tenants registrados

Panel del tenant
└── leads, ventas, agenda, alumnos/familias, operación diaria, PII de clientes finales
```

| Capacidad | Moon | Panel tenant (ej. Peskids) |
| --- | --- | --- |
| Lista de clientes / health agregado | Sí | No |
| Leads, alumnos, familias, WhatsApp operativo | **No** (sin PII detallada) | Sí |
| Embudo comercial del tenant | Enlace “abrir panel” | Kanban / CRM operativo |
| Agents fleet / costs / deploy plataforma | Sí | No (salvo resumen local) |
| Blueprints / entitlements plataforma | Sí | Consumo vía flags |

Mockups de producto (p. ej. “12 clientes”, “MRR $48k”, tenants inventados) son **referencia visual**, no fuente de datos.

## Estado actual del Admin (`apps/admin`)

| Área | Madurez | Notas |
| --- | --- | --- |
| Auth sesión / login | IMPLEMENTED | Superficie admin |
| Dashboard | PARTIAL | Métricas mixtas; no branding Moon |
| Tenants list + detail | PARTIAL | Tabla/detalle; sin cards Moon |
| Invitations / machines | IMPLEMENTED / PARTIAL | |
| Costs | PARTIAL | Catálogo orientativo; approvals en memoria de proceso |
| LLM metrics / feedback | IMPLEMENTED / PARTIAL | |
| Mission Control UI (`/mission-control*`) | PARTIAL | Office, foundation, incubation, chat |
| Agent Teams / OpenClaw governance | PARTIAL | |
| Approval Gate | PARTIAL | `/approval-decisions` |
| Rutas `/moon` | PROPOSED | Alias en MOON-1+ |
| AgentTaskEnvelopeV1 | **BLOCKED / no implementado** | No declarar como existente |
| Venture Studio UI | PROPOSED | |
| Command Center dry-run | PARTIAL / PROPOSED | Chat MC experimental ≠ contrato Envelope |

Detalle de métricas y omisiones: [OPSLY-MOON-DATA-SOURCES.md](./OPSLY-MOON-DATA-SOURCES.md).
Mapa de rutas: [OPSLY-MOON-ROUTE-MAP.md](./OPSLY-MOON-ROUTE-MAP.md).

## Inventario de tenants (config)

Registrados bajo `config/tenants/` (excl. template/schema): `peskids`, `smiletripcare`, `legalvial`, `local-services`, `panini-lab`, `intcloudsysops`.

Cualquier nombre que solo aparezca en mockups (p. ej. “Salud Journey Colombia”, “Eco Parque La Piara”, “Fit & Balance Center”) es **omitido** hasta existir fila autorizada en `platform.tenants` + config.

## Registries y contratos (no duplicar)

| Registry / contrato | Madurez | Uso Moon |
| --- | --- | --- |
| `config/modules.json` (libs `@intcloudsysops/*`) | IMPLEMENTED | Base; no confundir con módulos producto CRM/Agenda del mock |
| Canonical module adapter / catálogos tenant | PARTIAL / PROPOSED | Ver [MODULE-REGISTRY.md](./MODULE-REGISTRY.md); #881/#882 no asumir mergeados |
| `config/vertical-blueprints/*` | PARTIAL (POC) | Listado blueprints |
| `config/blueprints/academy/*` | PARTIAL | Academy pack; generador #875 no asumir mergeado |
| `config/agent-services.json`, `agent-capabilities.json`, `external-agent-registry.json` | IMPLEMENTED / PARTIAL | Fleet solo con entradas reales |
| BullMQ / Redis jobs | IMPLEMENTED | Tasks/queue Moon = mapear jobs; Envelope futuro |
| Entitlements API | PARTIAL / BLOCKED editable | Esperar #882 o read-only |

## Secuencia de PRs (ajustada)

| PR | Objetivo | Notas |
| --- | --- | --- |
| **PR-MOON-0** | Esta auditoría (docs only) | Este documento |
| **PR-MOON-1** | Shell visual + navegación `apps/admin` | Sin métricas inventadas |
| **PR-MOON-2** | Home + client cards | Solo tenants reales; sin MRR |
| **PR-MOON-3** | Detalle tenant | Tabs; Modules editable post-#881/#882 |
| **PR-MOON-4+** | Fleet, queue, approvals, blueprints, deploy, usage, ventures, command | Sin big-bang; sin Envelope fingido |

## Restricción de memoria VPS

**BLOCKED para deploy/builds concurrentes en este track:**

- No crear segunda app de control plane.
- No builds pesados concurrentes ni varios agents locales durante builds.
- No desplegar desde PR-MOON-*.
- Smoke secuencial; workflows con `concurrency`; caps Docker.

Runbook: [VPS-MEMORY-CAPS.md](../runbooks/VPS-MEMORY-CAPS.md).

## Riesgos abiertos hacia MOON-1

1. Confundir branding Moon con pantallas Mission Control parciales existentes.
2. Introducir `/moon` sin redirects/bookmarks claros (mitigar: aliases + legacy vivos).
3. Filtrar PII de tenant en cards (leads hoy agregados solo si hay agregación no-PII; si no, omitir).
4. Mezcla accidental con Track A (Peskids MC).
5. Asumir merge de #881/#882/#875.

## Qué no hace PR-MOON-0

- No modifica runtime, APIs, estilos ni configs.
- No crea `apps/moon`.
- No merge / no deploy.
- No inicia agentes reales.

## Enlaces relacionados

- [[OPSLY-MOON-DATA-SOURCES]]
- [[OPSLY-MOON-ROUTE-MAP]]
- [[COST-DASHBOARD]]
- [[MODULE-REGISTRY]]
- [[../runbooks/VPS-MEMORY-CAPS]]
- [[../adr/ADR-031-experimental-consolidation]]
- [[../audits/OPSLY-VENTURE-STUDIO-FOUNDATION-AUDIT]]
