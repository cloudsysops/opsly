# Guía de implementación — Capa IA (Opsly monorepo)

> Para Cursor: implementar por **semanas** alineadas a [`ROADMAP.md`](../ROADMAP.md).  
> **Stack:** TypeScript (Node 20), sin `any`. Bash: `set -euo pipefail`.

## 1. Nomenclatura (evitar confusiones)

| Nombre                              | Qué es en Opsly                                                                                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hermes**                          | **Metering y billing IA** unificado (`usage_events`, costos por `tenant_slug` / `request_id`). Ver [`VISION.md`](../VISION.md) (_Sistema de Metering — Hermes_).       |
| **“Agente Hermes” tipo Nous / pip** | **No** está adoptado: el monorepo no añade `hermes-agent` en Python al orchestrator. La “inteligencia” de routing vive en **LLM Gateway + orchestrator** (TypeScript). |
| **NotebookLM**                      | Agente/herramienta **experimental**; planes Business+ y flags.                                                                                                         |

## 2. Dónde tocar código (mapa)

| Capacidad                                            | Ubicación                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Routing multi-proveedor, fallback, costes declarados | `apps/llm-gateway/src/providers.ts`, `llm-direct.ts`, `routing-hints.ts` |
| Llamada HTTP unificada                               | `apps/llm-gateway/src/gateway.ts`                                        |
| Planner remoto (orchestrator → gateway)              | `apps/orchestrator/src/planner-client.ts`                                |
| Respuesta planner JSON                               | `apps/llm-gateway/src/planner-route.ts`                                  |
| Cola BullMQ, jobs, workers                           | `apps/orchestrator/src/engine.ts`, `workers/`                            |
| MCP, tools                                           | `apps/mcp/`                                                              |
| Contexto / continuidad                               | `apps/context-builder/`                                                  |
| Feedback portal                                      | `apps/api` (`/api/feedback`), Zero-Trust                                 |
| NotebookLM                                           | `apps/agents/notebooklm/`, MCP                                           |

## 3. Semana 1 — Checklist técnico (sin nuevos repos)

1. **Confirmar** que las llamadas LLM del producto pasan por `llm-gateway` (no Anthropic/OpenAI directos fuera del gateway).
2. **Revisar** `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_URL` en el entorno del gateway (Doppler `prd` / staging).
3. **Añadir o endurecer tests** en `apps/llm-gateway` para la cadena de fallback (mock de fetch / health).
4. **Documentar** en el PR el comportamiento por `routing_bias` y `resolveRoutingPreference` (ver `providers.ts`).

## 4. Semana 2 — NotebookLM (límites)

1. Verificar `NOTEBOOKLM_ENABLED` y plan tenant antes de encolar herramientas NotebookLM.
2. No exponer endpoints nuevos sin revisión en `docs/SECURITY_CHECKLIST.md`.

## 5. Semana 3 — Context Builder

1. Reutilizar el **cliente HTTP** al servicio `context-builder` existente; no duplicar un segundo “context engine” embebido en orchestrator sin ADR (ver `AGENTS.md` Fase 4).

## 6. Semana 4 — Costos admin

1. Extender solo lo necesario sobre `GET /api/admin/costs` y datos ya definidos en `admin-costs` / métricas — evitar duplicar fuentes de verdad.

## 7. Semana 5 — Feedback

1. Cualquier uso de ratings para “ajustar routing” debe respetar privacidad y **no** filtrar datos de un tenant a otro.

## 8. Comandos útiles

```bash
npm run type-check
npm run test --workspace=@intcloudsysops/llm-gateway
npm run test --workspace=@intcloudsysops/orchestrator
```

## 9. Lo que este documento reemplaza

Los borradores con **código Python** (`TenantHermesAgent`, `pip install hermes-agent`) son **patrones de referencia conceptual**. La implementación oficial en este repositorio es **TypeScript** en las rutas anteriores.
