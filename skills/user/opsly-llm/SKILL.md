# Opsly LLM Gateway Skill

## Cuándo usar

Al hacer cualquier llamada a un LLM desde código del monorepo Opsly: **no** llamar Anthropic/OpenAI directamente desde features de plataforma; usar **`@intcloudsysops/llm-gateway`** (`llmCall`), salvo excepción documentada en ADR.

## Uso correcto

```typescript
import { llmCall } from "@intcloudsysops/llm-gateway";

const result = await llmCall({
  tenant_slug: "mi-tenant",
  messages: [{ role: "user", content: prompt }],
  model: "haiku",
  temperature: 0,
  cache: true,
});
```

## Selección de modelo (orientativo)

| Tarea | Modelo | Notas |
|-------|--------|--------|
| Clasificar, extraer, formatear | `haiku` | Barato / rápido |
| RAG moderado | `haiku` | Subir a `sonnet` si falla calidad |
| Arquitectura / código complejo | `sonnet` | Coste mayor |
| Feedback en tiempo real | `haiku`, `cache: false` | Respuestas frescas |

Detalle de proveedores, health daemon y batching: `docs/LLM-GATEWAY.md`.

## Caché

- `temperature: 0` + `cache: true` → uso intensivo de caché Redis (TTL configurable).
- `temperature > 0` o `cache: false` → menos o nada de caché.
- Feedback / clasificaciones que deben ser únicas → `cache: false` explícito.

## Infra

- Health daemon y circuit breaker están en `apps/llm-gateway` (ver documentación del repo).
- Variables: `docs/DOPPLER-VARS.md` y `AGENTS.md`.
