# Opsly LLM Gateway Skill

> **Triggers:** `llm`, `anthropic`, `openai`, `modelo`, `cache`, `ai`, `llmcall`, `gemini`, `sonnet`, `haiku`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-feedback-ml`, `opsly-quantum`, `opsly-agent-teams`

## Cuándo usar

Al hacer cualquier llamada a un LLM desde código del monorepo Opsly: **no** llamar Anthropic/OpenAI directamente desde features de plataforma; usar **`@intcloudsysops/llm-gateway`** (`llmCall`), salvo excepción documentada en ADR.

## Uso correcto

```typescript
import { llmCall } from '@intcloudsysops/llm-gateway';

const result = await llmCall({
  tenant_slug: 'mi-tenant',
  messages: [{ role: 'user', content: prompt }],
  model: 'haiku',
  temperature: 0,
  cache: true,
});
```

## Selección de modelo (orientativo)

| Tarea                          | Modelo                  | Notas                             |
| ------------------------------ | ----------------------- | --------------------------------- |
| Clasificar, extraer, formatear | `haiku`                 | Barato / rápido                   |
| RAG moderado                   | `haiku`                 | Subir a `sonnet` si falla calidad |
| Arquitectura / código complejo | `sonnet`                | Coste mayor                       |
| Feedback en tiempo real        | `haiku`, `cache: false` | Respuestas frescas                |

Detalle de proveedores, health daemon y batching: `docs/LLM-GATEWAY.md`.

## Caché

- `temperature: 0` + `cache: true` → uso intensivo de caché Redis (TTL configurable).
- `temperature > 0` o `cache: false` → menos o nada de caché.
- Feedback / clasificaciones que deben ser únicas → `cache: false` explícito.

## Infra

- Health daemon y circuit breaker están en `apps/llm-gateway` (ver documentación del repo).
- Variables: `docs/DOPPLER-VARS.md` y `AGENTS.md`.

## Errores comunes

| Error          | Causa               | Solución                           |
| -------------- | ------------------- | ---------------------------------- |
| 429 rate limit | Demasiadas requests | Implementar backoff exponencial    |
| cache miss     | temperature > 0     | Usar `temperature: 0` para caching |
| invalid model  | Nombre incorrecto   | Usar `haiku`, `sonnet` o `gemini`  |

## Testing

```bash
# Test LLM Gateway health
curl -sf http://localhost:3005/health

# Test llmCall directo
node -e "const {llmCall} = require('./apps/llm-gateway'); llmCall({tenant_slug:'test',messages:[{role:'user',content:'ping'}]}).then(console.log)"
```
