---
status: canon
owner: architecture
last_review: 2026-05-25
---

# Architecture MOC

Arquitectura estable de Opsly: control plane, data plane, OpenClaw, LLM Gateway, Redis, billing diagrams y contratos técnicos.

## Qué va aquí

- Diagramas y diseño de sistemas.
- Contratos técnicos transversales.
- Documentos que explican decisiones ya adoptadas junto a ADRs.

## Qué no va aquí

- Planes de sprint o ejecución diaria; usar `../01-development/`.
- Procedimientos paso a paso; usar `../runbooks/`.
- Reportes puntuales; usar `../reports/` o `../audits/`.

## Documentos clave

- `openapi-opsly-api.yaml` — contrato HTTP subset (portal, health, feedback); CI `npm run validate-openapi`.
- `ARCHITECTURE.md`
- `TENANT-INCUBATION-LIFECYCLE.md` — contrato multi-tenant: core primero, `tenant_slug` como frontera, extracción a VPS propio
- `TENANT-ANALYTICS-IMPLEMENTATION-GUIDE.md` — batch BI con Python/pandas, snapshot contract y ruta reusable por tenant
- `../adr/ADR-044-core-first-tenant-slug-extraction.md` — decisión formal: core-first, `tenant_slug` activation, clean extraction
- `../adr/ADR-045-tenant-analytics-batch-python-pandas-arrow.md` — decisión formal: Python/pandas batch, Arrow interchange, Superset opcional
- `OPSLY-CONTROL-PLANE.md`
- `OPSLY-MOON-AUDIT.md` — auditoría Opsly Moon (evolución de `apps/admin`; PR-MOON-0)
- `OPSLY-MOON-DATA-SOURCES.md` — métricas REAL/ESTIMADO/PROYECTADO; omisiones
- `OPSLY-MOON-ROUTE-MAP.md` — rutas legacy ↔ aliases `/moon`
- `ARCHITECTURE-DISTRIBUTED.md`
- `OPENCLAW-ARCHITECTURE.md`
- `LLM-GATEWAY.md`
- `ORCHESTRATOR.md`

---

## Enlaces relacionados

- [[00-architecture/README|00-architecture]]
- [[brain/README|Brain Central]]
