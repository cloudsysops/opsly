# ADR-014: NotebookLM Agent como servicio premium

## Estado

EXPERIMENTAL · **2026-04-08**

## Contexto

Cliente LocalRank (marketing digital) necesita generar contenido automáticamente desde reportes. [notebooklm-py](https://github.com/teng-lin/notebooklm-py) ofrece acceso programático a Google NotebookLM (no oficial), incluyendo podcasts, slides y quizzes.

## Decisión

Integrar un agente experimental en `apps/agents/notebooklm/`: cliente Python + wrapper TypeScript, workflows auxiliares, Docker opcional, tool MCP `notebooklm` con scope `agents:write`.

Uso dirigido a planes **business** y **enterprise**; el flag `NOTEBOOKLM_ENABLED` en Doppler debe estar activo antes de ejecutar.

## Riesgos

- API no documentada por Google: puede romperse sin aviso.
- Autenticación Google por instancia (`NotebookLMClient.from_storage()`).
- Imagen Docker con Playwright/Chromium añade tamaño y superficie de ataque.

## Mitigación

- `NOTEBOOKLM_ENABLED=true` solo cuando haya credenciales válidas.
- Circuit breaker / desactivación manual si hay fallos repetidos (operación).
- Degradación clara al usuario si el agente responde `success: false`.

## Consecuencias

- Paquete workspace: `@intcloudsysops/notebooklm-agent`.
- Scope MCP nuevo: `agents:write` (OAuth `claude-ai` y metadata well-known).
- Coste marginal: uso de la cuenta Google del tenant/instancia.
