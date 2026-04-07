# LLM Gateway — Opsly

Punto único para llamadas a modelos Anthropic desde `apps/ml`, `apps/context-builder` y cualquier workspace que importe `@intcloudsysops/llm-gateway`.

## Qué hace

- Expone `llmCall()` con selección de modelo (Sonnet / Haiku), estimación de coste y registro de uso.
- Usa Redis para **deduplicar** prompts equivalentes (cache por hash del mensaje + modelo + tenant).
- Puede persistir eventos de uso en Supabase (`platform.usage_events`) vía el módulo `logger`.

En **contenedor** (`Dockerfile`), el proceso escucha **GET `/health`** en el puerto configurado por `LLM_GATEWAY_PORT` (por defecto `3010`) para liveness.

## Flujo de cache

1. Se calcula un hash estable del prompt normalizado (`hashPrompt`).
2. Si existe entrada en Redis para `(tenant_slug, hash)` y no expiró, se devuelve la respuesta cacheada sin llamar a la API.
3. Si no hay cache, se llama a Anthropic, se guarda en Redis con TTL y se registra uso (tokens / coste) según configuración.

## Modelos disponibles (Sonnet / Haiku)

Definidos en `apps/llm-gateway/src/router.ts`:

| Alias   | ID API (referencia)     | Uso típico        |
|--------|---------------------------|-------------------|
| sonnet | `claude-sonnet-4-20250514` | Calidad / razonamiento |
| haiku  | `claude-haiku-4-5-20251001` | Velocidad / fallback |

`selectModel(preference, fallback)` elige Haiku cuando `fallback === true`.

## Cómo usar desde otro servicio

```typescript
import { llmCall } from "@intcloudsysops/llm-gateway";

const out = await llmCall({
  tenant_slug: "acme",
  messages: [{ role: "user", content: "Hola" }],
  model_preference: "haiku",
});
```

Asegura dependencia en `package.json` del workspace (`"@intcloudsysops/llm-gateway": "^1.0.0"`) y que el monorepo resuelva el workspace vía `npm ci` en la raíz.

## Variables de entorno requeridas

| Variable | Rol |
|----------|-----|
| `ANTHROPIC_API_KEY` | Llamadas reales a Anthropic (sin ella, operación limitada / errores en runtime). |
| `REDIS_URL` | URL de Redis (Compose suele inyectar `redis://:password@redis:6379/0`). |
| `REDIS_PASSWORD` | Coherente con la URL si el cliente lo exige por separado. |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Opcional: registro de `usage_events` en Postgres. |
| `LLM_GATEWAY_PORT` | Solo proceso HTTP de health (default `3010`). |

## Cómo agregar un modelo nuevo

1. Añadir entrada en `MODEL_CONFIG` en `router.ts` (id oficial Anthropic, `cost_per_1k_input` / `cost_per_1k_output`).
2. Extender el tipo de `preference` en `types.ts` y en `selectModel` si aplica.
3. Ajustar tests en `apps/llm-gateway/__tests__/` y documentar el alias aquí.
