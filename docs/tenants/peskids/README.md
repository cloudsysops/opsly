---
status: draft
owner: product
last_review: 2026-05-19
tenant_slug: peskids
---

# Peskids — tenant incubado en Opsly

Peskids es un **tenant activo** en Opsly (plan **startup**) y el **primer piloto** del [Opsly Operational Blueprint v0.1](../../blueprints/opsly-operational-blueprint/README.md). Opsly actúa como **incubadora**: stack n8n + monitoreo, CRM base y capa de producto. Objetivo: **extraer** `peskids-platform` sin depender del runtime de orquestación de Opsly.

**Fase actual:** MVP runtime en Opsly — [SPRINT-02-RUN.md](./SPRINT-02-RUN.md). **Deploy API prod:** [DEPLOYMENT-2026-05-21.md](./DEPLOYMENT-2026-05-21.md). Diseño: [SPRINT-01.md](./SPRINT-01.md), pack Napkin: [DESIGN-PACK-REFERENCE.md](./DESIGN-PACK-REFERENCE.md).

## Estado actual (snapshot repo)

| Área | Estado | Notas |
|------|--------|--------|
| Registro plataforma | Activo | `config/opsly.config.json`: slug `peskids`, owner `sierrasantiago90@gmail.com`, plan `startup` |
| Config tenant | Plantilla | `config/tenants/peskids.json` — ver propuesta abajo |
| VPS (documentado) | Stack esperado | `tenant_peskids`; `n8n_peskids` + Uptime Kuma |
| CRM n8n | Documentado | 4 workflows `Opsly CRM` (AGENTS 2026-04-30) — verificar en VPS |
| Producto / MVP | **En prod API** | Smoke PASS 2026-05-21; imagen VPS `intcloudsysops-api:peskids-latest` — ver [DEPLOYMENT-2026-05-21.md](./DEPLOYMENT-2026-05-21.md) |
| Blueprint | Alineado | [BLUEPRINT-MAPPING.md](./BLUEPRINT-MAPPING.md) |

**Fuente de verdad operativa:** Supabase `platform.tenants` + VPS.

## Por qué Peskids (piloto)

1. **Alcance operativo realista** — historias acotables por sprint
2. **Approval-first claro** — sin auto-envío ni automatismos sin owner
3. **Encaja en multi-tenant Opsly** — leads, feedback, follow-ups aislados por tenant
4. **Demuestra extracción** — camino a plataforma independiente
5. **Riesgo infra bajo** — Supabase + stack existente

## Fases

| Fase | Enfoque | Doc |
|------|---------|-----|
| Sprint 01 | Diseño y validación owner | [SPRINT-01.md](./SPRINT-01.md) |
| Sprint 02 | MVP que corre (API + forms) | [SPRINT-02-RUN.md](./SPRINT-02-RUN.md) |
| Sprint 03+ | UI portal, follow-ups, reportes | [MVP-BACKLOG.md](./MVP-BACKLOG.md) |
| Extracción | Repo `peskids-platform` | [FUTURE-REPO-SEED.md](./FUTURE-REPO-SEED.md) |

## Qué existe hoy

- Inventario: [`../production/TENANT-PRODUCTION-BASELINE.md`](../production/TENANT-PRODUCTION-BASELINE.md)
- URLs: `https://n8n-peskids.op-sly.com`, `https://uptime-peskids.op-sly.com`
- CRM Starter Pack: [`config/n8n-workflows/catalog.json`](../../../config/n8n-workflows/catalog.json)

## Primer MVP (resumen)

**Visibilidad + leads + feedback + follow-up con aprobación humana** — sin mensajería autónoma. Detalle: [MVP-PLAN.md](./MVP-PLAN.md).

## Mapa de documentación

### Incubación y operación (ES)

| Documento | Propósito |
|-----------|-----------|
| [MVP-PLAN.md](./MVP-PLAN.md) | Alcance MVP y principios blueprint |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Vista Opsly ↔ Peskids |
| [DATA-MODEL.md](./DATA-MODEL.md) | Entidades de producto |
| [WORKFLOWS.md](./WORKFLOWS.md) | Flujos n8n |
| [WHATSAPP-CHANNEL.md](./WHATSAPP-CHANNEL.md) | Plan WhatsApp (manual → API approval-first) |
| [AI-APPROVAL-POLICY.md](./AI-APPROVAL-POLICY.md) | IA approval-first |
| [OPS-RUNBOOK.md](./OPS-RUNBOOK.md) | Comandos lectura |
| [BLUEPRINT-MAPPING.md](./BLUEPRINT-MAPPING.md) | Validación blueprint |
| [EXTRACTION-PLAN.md](./EXTRACTION-PLAN.md) | Extracción a repo propio |
| [CLIENT-PITCH.md](./CLIENT-PITCH.md) | Explicación cliente |
| [INCUBATION-CHECKLIST.md](./INCUBATION-CHECKLIST.md) | Checklist incubación |
| [FUTURE-REPO-SEED.md](./FUTURE-REPO-SEED.md) | Semilla `peskids-platform` |

### Sprint 01–02

| Documento | Propósito |
|-----------|-----------|
| [MVP-BACKLOG.md](./MVP-BACKLOG.md) | Épicas y prioridades |
| [SPRINT-01.md](./SPRINT-01.md) | Plan 7 días diseño |
| [SPRINT-02-RUN.md](./SPRINT-02-RUN.md) | Deploy y smoke MVP |
| [DEPLOYMENT-2026-05-21.md](./DEPLOYMENT-2026-05-21.md) | Registro deploy prod API (smoke PASS) |
| [DASHBOARD-SPEC.md](./DASHBOARD-SPEC.md) | 5 tarjetas admin |
| [FORMS-SPEC.md](./FORMS-SPEC.md) | 4 formularios + eventos |
| [EVENT-CONTRACT.md](./EVENT-CONTRACT.md) | 9 eventos Opsly |
| [DEMO-SCRIPT.md](./DEMO-SCRIPT.md) | Demo 10 min owner |

## Quick start

**Owner:** BLUEPRINT-MAPPING → DEMO-SCRIPT → MVP-PLAN.

**Equipo:** SPRINT-02-RUN (deploy) → MVP-BACKLOG (siguiente UI).

## Blueprint alignment

- Blueprint en **draft v0.1**; Peskids lo **valida**, no lo canoniza.
- Ciclo: incubar → validar → extraer ([EXTRACTION-PLAN.md](./EXTRACTION-PLAN.md)).
- Hub blueprint: [`../../blueprints/opsly-operational-blueprint/`](../../blueprints/opsly-operational-blueprint/)

## Config review (propuesta, no aplicada)

```json
{
  "tenant_name": "Peskids",
  "tenant_slug": "peskids",
  "workflows_count": 4,
  "incubation_status": "active_pilot",
  "product_repo_planned": "cloudsysops/peskids-platform",
  "notes": "Incubado Opsly. CRM 4 workflows VPS 2026-04-30. Tenant directo."
}
```

Aplicar solo tras validación owner + `./scripts/validate-subclient-config.sh`.

## Métricas de éxito (orientativas)

- **Sprint 01:** Owner dice «sí, construyan esto» tras demo
- **Sprint 02:** POST lead → 201 en prod; owner ve summary en portal
- **Post-MVP:** 20+ leads, uso diario del dashboard

## Enlaces

- Hub tenants: [`../README.md`](../README.md)
- Blueprint: [`../../blueprints/opsly-operational-blueprint/README.md`](../../blueprints/opsly-operational-blueprint/README.md)
- Brain: [`../../brain/tenants/peskids.md`](../../brain/tenants/peskids.md)
