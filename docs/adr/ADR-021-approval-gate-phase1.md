# ADR-021: Approval Gate — Fase 1 (MVP)

## Estado

Aceptado — 2026-04-12

## Contexto

El pipeline sandbox/QA necesita una decisión trazable (APPROVE / REJECT / NEEDS_INFO) sobre métricas de tests, sin embeddings, sin fast path ML ni learning agent.

## Decisión

- **llm-gateway** expone `POST /v1/approval-analyze` (HTTP `node:http`, mismo proceso que health): validación Zod, `analyzeComplexity` sobre el prompt, llamada **solo vía** `llmCallDirect` con preferencia Sonnet (`model: "sonnet"`).
- **orchestrator**: cola BullMQ `approval-gate`, `ApprovalGateWorker` persiste en `platform.approval_gate_decisions` con **service_role**.
- **admin**: página read-only que consume **API route** con sesión; la API usa **service_role** para leer (como otros listados admin).

## Fuera de alcance (Fase 1)

Embeddings, pgvector adicional, reglas ML, auto-thresholds, fast path que omita al LLM.

## Consecuencias

- Coste LLM por job de approval; tabla crece con cada ejecución.
- No hay `tenant_id` obligatorio: el alcance es **plataforma / sandbox run**; opcional `deployment_id` para correlación CI.
