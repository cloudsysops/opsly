# @intcloudsysops/prompt-guard

Detección de prompt injection, delimitación de contenido no confiable y sanitización de `implementation_prompt` para superficies LLM (feedback portal, chat Peskids, LLM Gateway `/v1/text`).

## Uso

```typescript
import {
  detectPromptInjection,
  validateFeedbackMessage,
  sanitizeImplementationPrompt,
  guardChatOutput,
  guardLlmTextPrompt,
} from '@intcloudsysops/prompt-guard';
```

## Dataset adversarial

Casos en `datasets/adversarial/prompt-injection.json` — ejecutados por Vitest en CI.

## Integración

| Superficie | Guard |
|------------|-------|
| `POST /api/feedback` | `validateFeedbackMessage`, delimitación en clarify |
| `analyzeFeedback` / `executeAutoImplement` | injection short-circuit, `sanitizeImplementationPrompt` |
| Peskids chat | `validateChatUserMessage`, system separado, `guardChatOutput` |
| LLM Gateway `/v1/text` | `guardLlmTextPrompt` |
| ACTIVE-PROMPT (MCP, ML, CursorWorker) | `guardActivePromptDocumentOrThrow` |
| CLI agents `scripts/cli-agent-service.ts` | `guardLlmTextPrompt`, bind `127.0.0.1`, token opcional |

## Blindaje local (Mac / Cursor)

Antes de ejecutar agentes o escribir `docs/ACTIVE-PROMPT.md` desde tu máquina:

```bash
export OPSLY_ACTIVE_PROMPT_WRITES_DISABLED=1   # kill-switch GitHub ACTIVE-PROMPT
export OPSLY_CLI_AGENT_DRY_RUN=1               # no ejecuta CLIs reales
export OPSLY_CLI_AGENT_TOKEN='tu-token-local'  # exige Bearer en /execute
./scripts/opsly-local-blindaje-check.sh
```

| Variable | Efecto |
|----------|--------|
| `OPSLY_ACTIVE_PROMPT_WRITES_DISABLED=1` | Bloquea `guardActivePromptDocumentOrThrow` (ML, MCP, orchestrator) |
| `OPSLY_CLI_AGENT_DRY_RUN=1` | `cli-agent-service` responde sin spawn |
| `OPSLY_CLI_AGENT_TOKEN` | Auth en `POST /execute` (localhost) |
| `OPSLY_CLI_AGENT_BIND` | Default `127.0.0.1` — no exponer a la red |
