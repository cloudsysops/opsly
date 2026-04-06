# ADR-007 — Estructura de runbooks y documentación operativa

**Fecha:** 2026-04-06  
**Estado:** Aceptada

## Decisión

La documentación operativa vive bajo `docs/runbooks/` en Markdown, separada por audiencia: **admin** (plataforma), **dev** (local/monorepo), **managed** (operaciones por tenant), **incident** (respuesta a fallos).

## Razones

- Reduce búsqueda improvisada en chat o wikis desconectadas del repo
- Versionado junto al código y ADRs existentes en `docs/adr/`
- Encaja con gobernanza Opsly (AGENTS.md como estado, VISION como norte)

## Consecuencias

- Cambios de proceso deben reflejarse en el runbook correspondiente o en ADR si alteran arquitectura
- `docs/FAQ.md` concentra respuestas cortas y enlaces a runbooks/ADRs
