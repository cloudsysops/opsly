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
