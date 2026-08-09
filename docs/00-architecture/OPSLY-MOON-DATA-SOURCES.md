---
status: canon
owner: platform
last_review: 2026-08-07
type: architecture
tags:
  - opsly/moon
  - opsly/metrics
  - opsly/data-sources
---

# Opsly Moon — Fuentes de datos y etiquetado

**PR-MOON-0.** Ninguna métrica de Moon Home debe mostrarse sin fuente y etiqueta de confianza.

## Etiquetas obligatorias

| Etiqueta | Uso |
| --- | --- |
| **REAL** | Medido desde sistema de registro (DB, usage_events, health probe, factura sincronizada). |
| **ESTIMADO** | Orden de magnitud / catálogo interno / proxy; no es factura ni MRR. |
| **PROYECTADO** | Forecast o escenario; nunca como “actual”. |

Si no hay fuente → **omitir** el KPI (no rellenar con mock).

## Clientes y cartera

| Dato | Fuente | Etiqueta | Madurez |
| --- | --- | --- | --- |
| Cliente visible en Moon | `platform.tenants` + `config/tenants/<slug>.json` | REAL | IMPLEMENTED (regla) |
| Nombre / slug / plan / status | Fila tenant + config | REAL | PARTIAL (campos varían) |
| Blueprint / vertical | `config/tenants` (`vertical`, `pattern_ids`) + vertical-blueprints | REAL / ESTIMADO | PARTIAL |
| Módulos enabled (lista config) | `modules_enabled` en JSON tenant | REAL (config) | PARTIAL |
| Stack Docker en VPS | Inventario host / compose | REAL (infra) | PARTIAL — **no** implica cliente activo |
| Stack huérfano | Detectado sin fila tenant | — | Mostrar en Health/Infrastructure, **no** en cartera |

**Omitido:** clientes del mock visual; pipeline $ por tenant sin CRM agregado plataforma; “leads hoy” por tenant si implica PII o no hay agregado no-PII en API admin.

## Resumen de plataforma (Home)

| KPI propuesto (mock) | ¿Mostrar en Moon Home v1? | Fuente candidata | Etiqueta | Notas |
| --- | --- | --- | --- | --- |
| Clientes activos | Sí | Conteo `platform.tenants` status activo | REAL | |
| Tenants trial / degradados | Sí si hay campo status | `platform.tenants.status` | REAL | Mapear estados existentes |
| Leads agregados (plataforma) | Solo si existe agregado admin sin PII | APIs métricas / jobs | REAL o omitir | **No** copiar leads de Peskids a Moon |
| Automatizaciones activas | Solo si hay inventario n8n/workflows | Config / n8n API / catalog | REAL o PARTIAL | |
| Tareas de agentes | Contadores BullMQ / orchestrator | Redis queues | REAL | No AgentTaskEnvelopeV1 |
| Alertas críticas | Capacity alert + health + costs alerts | `docs/ops/ACTIVE-CAPACITY-ALERT.md`, overview, costs | REAL / ESTIMADO | |
| **MRR** | **No** | — | — | **BLOCKED** hasta billing comercial confiable |
| Costo operativo | Sí (reemplazo Home) | `GET /api/admin/costs` | ESTIMADO | Catálogo; ver [COST-DASHBOARD.md](./COST-DASHBOARD.md) |
| Uso del mes (LLM) | Sí | `usage_events` / metrics tenant | REAL | |
| Presupuestos configurados | Sí | Admin costs / budget overview | REAL / ESTIMADO | |
| Margen | No por defecto | — | — | Requiere ingresos REAL |
| Deployments recientes | Sí si hay fuente Actions/API | GHA / runbooks / logs | REAL o PARTIAL | |

## Costos, uso y billing

| Concepto | Fuente | Etiqueta | Persistencia |
| --- | --- | --- | --- |
| Líneas VPS / CF / catálogo | `apps/api/lib/admin-costs.ts` vía `/api/admin/costs` | ESTIMADO | Catálogo en código |
| Aprobaciones de gasto | POST `/api/admin/costs` | REAL (decisión) | **Memoria de proceso** — se pierde al reiniciar |
| Spend LLM por tenant | Logger gateway / metrics | REAL | |
| Factura DigitalOcean / Stripe | Paneles proveedor | REAL (fuera de app) | No volcar secretos |
| MRR / ARR | — | — | **Omitido** |
| “Pipeline $” en card cliente | — | — | **Omitido** sin agregación CRM plataforma |

UI Costs existente: ruta admin `/costs` — documentada en [COST-DASHBOARD.md](./COST-DASHBOARD.md).

## Agentes y colas

| Dato | Fuente | Etiqueta | Madurez |
| --- | --- | --- | --- |
| Workers / bridges registrados | `config/agent-services.json`, `external-agent-registry.json` | REAL (registro) | IMPLEMENTED |
| Capabilities / routing | `config/agent-capabilities.json` | REAL (config) | IMPLEMENTED |
| Heartbeat / “ejecutando” en vivo | Orchestrator / Redis / MC snapshots | REAL o unknown | PARTIAL |
| Tokens / costo por agente | usage logs si correlacionan `request_id` | REAL / ESTIMADO | PARTIAL |
| AgentTaskEnvelopeV1 tasks | — | — | **No implementado** — no listar como store |
| Jobs BullMQ | Colas orchestrator | REAL | IMPLEMENTED |

## Health e integraciones

| Componente | Fuente candidata | Etiqueta |
| --- | --- | --- |
| API /admin overview | `GET /api/admin/overview` | REAL / mock flag si aplica |
| Orchestrator / LLM Gateway | Health endpoints / MC snapshots | REAL o unknown |
| Supabase / Redis | Probes y compose | REAL o unknown |
| Twenty / n8n | Sync status por tenant / contenedores | PARTIAL |
| VPS memoria | Capacity alert + runbook | REAL (alerta) |
| WACRM / WhatsApp Cloud | — | No priorizar en Moon Home; fuera de track Meta |

Nunca mostrar secretos, tokens Doppler ni prompts sensibles.

## Blueprints y módulos

| Dato | Fuente | Notas |
| --- | --- | --- |
| Vertical blueprints | `config/vertical-blueprints/` | POC; ids reales (swim-school, …) |
| Academy pack | `config/blueprints/academy/` | provisioning gated |
| Lib modules | `config/modules.json` | No son “CRM v2.1.0” del mock |
| Tenant product modules / entitlements | PRs #881 / #882 | **No asumir merge**; UI editable BLOCKED o read-only |

## Datos explícitamente omitidos (falta de fuente)

- MRR / margen / ingresos por tenant (salvo billing REAL futuro).
- Clientes y métricas del mock de diseño.
- PII de leads, alumnos, familias, teléfonos, mensajes.
- Pipeline monetario por tenant sin agregador plataforma.
- Estados “Support Agent (Peskids) Ejecutando 62%” sin heartbeat real.
- `AgentTaskEnvelopeV1` como store de tareas.
- Conteos de automations/deploy inventados.

## Relación con Track A (Peskids)

Agregados operativos de Peskids (Kanban, atención inmediata, wa.me) viven en **apps/peskids**. Moon solo puede mostrar:

- health / status del tenant `peskids`;
- enlace “Abrir panel”;
- consumo LLM / costos etiquetados;
- módulos/config de alto nivel sin PII.

## Enlaces

- [[OPSLY-MOON-AUDIT]]
- [[OPSLY-MOON-ROUTE-MAP]]
- [[COST-DASHBOARD]]
- [[MODULE-REGISTRY]]
- [[../runbooks/VPS-MEMORY-CAPS]]
- [[../ops/ACTIVE-CAPACITY-ALERT]]
