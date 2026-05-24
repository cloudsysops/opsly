---
status: canon
owner: architecture
last_review: 2026-05-09
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
- `TENANT-INCUBATION-LIFECYCLE.md`
- `OPSLY-CONTROL-PLANE.md`
- `ARCHITECTURE-DISTRIBUTED.md`
- `OPENCLAW-ARCHITECTURE.md`
- `LLM-GATEWAY.md`
- `ORCHESTRATOR.md`

---

## Enlaces relacionados

- [[00-architecture/README|00-architecture]]
- [[brain/README|Brain Central]]
