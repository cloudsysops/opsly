# Hermes + agentes (Cursor, Claude, Copilot) y LLM local

Este documento alinea **roles** y **cómo encajan** con Opsly: no añade un bus nuevo ni duplica el LLM Gateway.

## Roles

| Actor                  | Qué es                          | Cómo se conecta                                                                                                                                     |
| ---------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cursor**             | IDE + agente de código          | Jobs BullMQ `cursor` (OpenClaw) cuando Hermes enruta `feature` → `cursor` y `HERMES_DISPATCH_OPENCLAW=true`.                                        |
| **Claude**             | Modelo en la nube               | Vía **LLM Gateway** (`/v1/text`, `/v1/chat/completions`, etc.); Hermes enruta `decision` (sin modo local-first) y `adr` → agente lógico `claude`.   |
| **GitHub Copilot**     | Asistente en el IDE (Microsoft) | **No** hay backend Copilot en este repo: es cliente del editor. Las tareas que requieran CI van a **GitHub Actions** (`agentType: github_actions`). |
| **LLM local (Ollama)** | Inferencia on-prem / worker     | Cola BullMQ `ollama` → `OllamaWorker` → `POST` al **LLM Gateway** (`llama_local` / `OLLAMA_*`). Ver ADR-024.                                        |

## Activar decisiones rápidas con modelo local

1. **Gateway**: `OLLAMA_URL` y `OLLAMA_MODEL` (o el modelo configurado para `llama_local` en el gateway) apuntando al servicio Ollama alcanzable desde el orquestador/worker.
2. **Hermes**:
   - `HERMES_ENABLED=true`
   - `HERMES_DISPATCH_OPENCLAW=true`
   - `HERMES_LOCAL_LLM_FIRST=true` → tareas **`decision`** con esfuerzo **`S`** → `agentType: ollama` (encolado `ollama` con prompt construido desde la tarea + enriquecimiento).
3. **Tenant**: el worker `ollama` exige `tenant_slug` en el job; Hermes usa `resolveHermesTenantContext` o `HERMES_FALLBACK_TENANT_SLUG` (default `platform`).

## Qué no hace este modo

- No sustituye a Cursor ni a Copilot en el IDE.
- No fuerza a Claude Code: el enrutado **Hermes → claude** sigue siendo vía gateway cuando no aplicas `HERMES_LOCAL_LLM_FIRST` para esa combinación tipo/esfuerzo.

## Referencias

- [HERMES-INTEGRATION.md](./HERMES-INTEGRATION.md)
- [ADR-024: Ollama local worker](adr/ADR-024-ollama-local-worker-primary.md)
- `apps/orchestrator/src/hermes/DecisionEngine.ts`, `HermesOrchestrator.ts`, `workers/OllamaWorker.ts`
