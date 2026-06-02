---
status: canonical
owner: founder
last_review: 2026-06-02
tenant_slug: peskids
role: live-case-study
priority: CRITICAL
---

# Peskids — Live Case Study for Founder Mode (2026-06-02+)

**Peskids is the PRIMARY SUCCESS METRIC for Opsly.**

This is **not an experiment** or **incubation**. It is the **live, revenue-generating case** that validates:
1. Opsly can run a real product (not just multi-tenant infrastructure)
2. Blueprint extraction is possible (repeatable, not one-off)
3. Agency replication model works (blueprint → new client → revenue)

**Opsly's role:** Incubator + control plane for Peskids MVP. Stack: n8n + Uptime Kuma + future Supabase product layer.  
**Success criteria:** Go-live by [DATE], uptime 99%+, revenue flowing, extraction plan validated.  
**Failure mode:** If Peskids doesn't go live, Founder Mode fails.

## Estado actual (snapshot repo)

| Área | Estado | Notas |
|------|--------|--------|
| Registro plataforma | Activo | `config/opsly.config.json`: slug `peskids`, owner `sierrasantiago90@gmail.com`, plan `startup`, `createdAt` 2026-04-07 |
| Config tenant | Plantilla | `config/tenants/peskids.json` — `workflows_count: 0`, sin dominio portal propio documentado |
| Brain Obsidian | Candidato | `docs/brain/tenants/peskids.md` — incompleto; ver hub canónico **aquí** |
| VPS (documentado) | Stack esperado | Proyecto Compose `tenant_peskids`; contenedores `n8n_peskids` + Uptime Kuma |
| CRM n8n (documentado) | Probable en VPS | AGENTS (2026-04-30): 4 workflows `Opsly CRM` en `n8n_peskids` — **no verificado en esta sesión** |
| Producto / MVP | No definido en repo | Sin Supabase de producto, sin dashboard Peskids, sin dominio cliente final |
| Extracción | Planificado | Ver [EXTRACTION-PLAN.md](./EXTRACTION-PLAN.md) |

**Fuente de verdad operativa:** Supabase `platform.tenants` + estado en VPS. El JSON de config y `system_state.json` pueden ir por detrás de la DB.

## Qué existe hoy

- Tenant slug **`peskids`** en inventario de producción ([`../production/TENANT-PRODUCTION-BASELINE.md`](../production/TENANT-PRODUCTION-BASELINE.md)).
- URLs convención Opsly (staging `op-sly.com`):
  - `https://n8n-peskids.op-sly.com`
  - `https://uptime-peskids.op-sly.com`
- Perfil LLM plataforma: **`hybrid`** (`apps/llm-gateway/src/config/budgets.ts`).
- Catálogo marketplace n8n: **CRM Starter Pack** aplicable a tenants `startup` ([`config/n8n-workflows/catalog.json`](../../../config/n8n-workflows/catalog.json)).
- Instalador referencia: `scripts/install-crm-workflows.sh` (no ejecutar desde doc sin aprobación).

## Qué falta (incubación)

- Contexto comercial y alcance MVP acordado con el owner.
- `config/tenants/peskids.json` alineado a realidad (workflows, dominio, notas de producto).
- Modelo de datos de producto (Supabase futuro) y dashboards padres/estudiantes/docentes.
- Workflows Peskids **específicos** (más allá del CRM genérico Opsly).
- Política AI y métricas del primer dashboard.
- Decisión de dominio, WhatsApp (Jelou) y redes — **futuro**, no en MVP infra.
- Eventos hacia/desde Opsly para extracción ([EXTRACTION-PLAN.md](./EXTRACTION-PLAN.md)).

## Primer MVP (resumen)

Ver detalle en [MVP-PLAN.md](./MVP-PLAN.md). En una línea: **visibilidad + captura de leads + feedback de padres + seguimiento con aprobación humana + reporte semanal**, sin mensajería autónoma.

## Mapa de documentación

| Documento | Propósito |
|-----------|-----------|
| [MVP-PLAN.md](./MVP-PLAN.md) | Alcance MVP y criterios de aceptación |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Vista actual y futura (Opsly ↔ Peskids) |
| [DATA-MODEL.md](./DATA-MODEL.md) | Entidades de producto (borrador) |
| [WORKFLOWS.md](./WORKFLOWS.md) | Flujos n8n/operativos |
| [AI-APPROVAL-POLICY.md](./AI-APPROVAL-POLICY.md) | Límites de IA (approval-first) |
| [OPS-RUNBOOK.md](./OPS-RUNBOOK.md) | Comandos seguros de lectura |
| [EXTRACTION-PLAN.md](./EXTRACTION-PLAN.md) | Salida a repo independiente |
| [CLIENT-PITCH.md](./CLIENT-PITCH.md) | Explicación para cliente (español) |
| [INCUBATION-CHECKLIST.md](./INCUBATION-CHECKLIST.md) | Checklist de incubación |
| [FUTURE-REPO-SEED.md](./FUTURE-REPO-SEED.md) | Semilla `cloudsysops/peskids-platform` |

## Config review (Phase 2 — propuesta, no aplicada)

`config/tenants/peskids.json` sigue siendo plantilla. **No se ha modificado** en esta incubación.

Propuesta de patch (aplicar solo tras validación con owner y Supabase):

```json
{
  "tenant_name": "Peskids",
  "tenant_slug": "peskids",
  "schema_name": "peskids",
  "platform_domain": "op-sly.com",
  "portal_domain": null,
  "workflows_count": 4,
  "pricing_per_unit": 0,
  "currency": "USD",
  "incubation_status": "active_pilot",
  "product_repo_planned": "cloudsysops/peskids-platform",
  "notes": "Incubado en Opsly. CRM Starter Pack (4 workflows) documentado en VPS 2026-04-30. MVP y extracción: docs/tenants/peskids/. Sin parent_tenant_slug (tenant directo, no subcliente)."
}
```

Campos nuevos (`portal_domain`, `incubation_status`, `product_repo_planned`) requieren acuerdo de esquema JSON del tenant; si el validador no los admite, mantener solo `notes` ampliado y `workflows_count: 4`.

## Relación con otros tenants

- **No es subcliente** (contraste: LegalVial bajo LocalRank con `parent_tenant_slug`).
- Mismo patrón técnico que smiletripcare/localrank: **1 slug = 1 stack Compose** en VPS.

## Enlaces Opsly

- Inventario prod: [`../production/TENANT-PRODUCTION-BASELINE.md`](../production/TENANT-PRODUCTION-BASELINE.md)
- Hub tenants: [`../README.md`](../README.md)
- Brain (candidato): [`../../brain/tenants/peskids.md`](../../brain/tenants/peskids.md)

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
