# LLM Gateway — Opsly (v2 Beast Mode)

Punto único para llamadas a modelos desde `apps/ml`, `apps/context-builder` y cualquier workspace que importe `@intcloudsysops/llm-gateway`.

## Qué hace

- **`llmCall()`** (público): analiza complejidad (niveles 1–3), opcionalmente **descompone** tareas grandes (Haiku → subtareas → merge), **agrupa** peticiones en ventanas por nivel (batch), y enruta a **varios proveedores** con fallback.
- **`llmCallDirect()`**: una sola ejecución sin batch ni descomposición (uso interno y pruebas avanzadas).
- **Redis**: cache agresivo por hash de mensajes + tenant (`LLM_CACHE_TTL_SECONDS`, default 7200s) y **estado de salud** por API (`provider:*` keys).
- **Health daemon** (proceso `server.ts`): ping cada 30s, circuit breaker (3 fallos → `down`), reintento a proveedores `down` cada 60s, alertas **Discord** en transiciones.
- Supabase opcional: `platform.usage_events` vía `logger`.

En **contenedor** (`Dockerfile`), el proceso escucha **GET `/health`** en `LLM_GATEWAY_PORT` (default `3010`).

## Endpoint de búsqueda web (`/v1/search`)

Para investigación técnica automatizada (Sprint 1 de autonomía), el gateway expone:

- **`POST /v1/search`**
- Body mínimo:
  - `tenant_slug` (string)
  - `query` (string)
- Opcionales:
  - `max_results` (1..10, default 5)
  - `include_raw` (boolean, default false)

Respuesta:

- `query`
- `answer` (si lo devuelve Tavily)
- `results[]` con `title`, `url`, `content`, `score` (y `raw_content` si `include_raw=true`)

Flags requeridos:

- `LLM_GATEWAY_SEARCH_ENABLED=true`
- `TAVILY_API_KEY=<secret>`

Si falta configuración, responde `503 search_disabled` o `500 search_misconfigured`.

## Proveedores y niveles (resumen)

Definidos en `apps/llm-gateway/src/providers.ts` y costes en `router.ts` / `estimateCost`.

| Proveedor               | Nivel típico | Coste orientativo / 1k tokens | Uso                                                                          |
| ----------------------- | ------------ | ----------------------------- | ---------------------------------------------------------------------------- |
| Llama local             | 1            | $0                            | Clasificación, extracción, tareas baratas (`model: "cheap"` o complejidad 1) |
| Claude Haiku            | 2            | ~$0.00025 in / $0.00125 out   | Moderado, RAG simple                                                         |
| OpenRouter (Mistral 7B) | 2            | ~$0.00002 in / $0.00006 out   | Fallback económico                                                           |
| GPT-4o mini             | 2            | ~$0.00015 in / $0.0006 out    | Fallback OpenAI                                                              |
| Claude Sonnet           | 3            | ~$0.003 in / $0.015 out       | Arquitectura, código complejo                                                |
| GPT-4o                  | 3            | ~$0.005 in / $0.015 out       | Fallback si Sonnet no disponible                                             |
| **DeepSeek** (`deepseek_chat`) | 2       | Bajo (API compatible OpenAI) | Cadena cloud vía `llmCallDirect`: primero con `routing_bias=cost` o `provider_hint=deepseek` si hay `DEEPSEEK_API_KEY` |

Salud en Redis se agrupa por **API**: `anthropic`, `llama_local`, `openrouter`, `openai`, y **`deepseek`** si la clave está configurada.

### DeepSeek (OpenAI-compatible)

- **Variables:** `DEEPSEEK_API_KEY` (obligatoria para activar el proveedor), `DEEPSEEK_BASE_URL` (default `https://api.deepseek.com/v1`), `DEEPSEEK_MODEL` (default `deepseek-v4-flash`; usar `deepseek-v4-pro` para mayor calidad). DeepSeek V4 mantiene el base URL y cambia solo el `model`.
- **Id de proveedor interno:** `deepseek_chat` (definido en `apps/llm-gateway/src/providers.ts`).
- **Orden en cadena cloud** (`apps/llm-gateway/src/cloud-chain.ts`):
  - `routing_bias=cost` **o** `provider_hint=deepseek` → DeepSeek primero (si hay clave).
  - `balanced` → Haiku, DeepSeek, GPT-4o mini, OpenRouter cheap.
  - `quality` → Haiku, mini, OpenRouter, DeepSeek al final.
- **HTTP:** `POST /v1/chat/completions` y `POST /v1/text` aceptan `routing_bias` y `provider_hint: "deepseek"` en el JSON.
- **OpenClaw:** el rol **`skeptic`** fija `provider_hint=deepseek` en la decisión de control (`control-layer.ts`) para priorizar DeepSeek en planner y OAR vía gateway, sin hardcodear secretos.

## Flujo

1. Hash del prompt → cache hit devuelve respuesta sin llamar APIs.
2. Si no hay cache: cadena de proveedores según preferencia (`sonnet` / `haiku` / `cheap`) y **disponibilidad** en Redis.
3. `llmCall` aplica batch por nivel de complejidad (ventanas 50–200ms, tamaños 10/5/3) salvo descomposición.

## Uso desde otro servicio

```typescript
import { llmCall } from '@intcloudsysops/llm-gateway';

const out = await llmCall({
  tenant_slug: 'acme',
  messages: [{ role: 'user', content: 'Hola' }],
  model: 'haiku',
  temperature: 0,
});
```

`model` admite al menos `sonnet`, `haiku`, `cheap` (prioriza Ollama). Otros valores se tratan como hint de string.

### Routing opcional (Fase 4 — sesgo + HTTP)

- **`routing_bias`** en `LLMRequest` (`cost` \| `balanced` \| `quality`): ajusta la preferencia inferida por **complejidad** cuando **`model` no está fijado**. `cost` tiende a cadenas más baratas; `quality` a más capaces; `balanced` equivale al comportamiento histórico. La lógica está en `routing-hints.ts` (`applyRoutingBias`), aplicada en `llmCallDirect` → `buildChain`.
- **Query (Route Handlers):** `parseLlmGatewayRoutingParams(searchParams)` — claves `llm_model` o `model`; `llm_routing` o `routing_bias`.
- **Cabeceras:** `parseLlmGatewayRoutingHeaders(headers)` — `x-llm-model`, `x-llm-routing`.

Ejemplo:

```typescript
import { llmCall, parseLlmGatewayRoutingParams } from '@intcloudsysops/llm-gateway';

const hints = parseLlmGatewayRoutingParams(request.nextUrl.searchParams);
await llmCall({
  tenant_slug: 'acme',
  messages: [{ role: 'user', content: '…' }],
  ...hints,
});
```

## Variables de entorno

Ver **`docs/DOPPLER-VARS.md`** (sección LLM Gateway). Mínimo habitual: `ANTHROPIC_API_KEY`, `REDIS_URL`, opcionales `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `OLLAMA_URL`, `DISCORD_WEBHOOK_URL`, `SUPABASE_*`, `LLM_GATEWAY_PORT`, `LLM_CACHE_TTL_SECONDS`.

## Tests

```bash
cd apps/llm-gateway && npm test
```

Variable `LLM_BATCH_WINDOW_SCALE=0` en el script `test` del paquete para ventanas de batch instantáneas en CI.
