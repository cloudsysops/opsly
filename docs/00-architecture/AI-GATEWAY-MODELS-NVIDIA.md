# NVIDIA API Catalog — referencia de modelos (Opsly AI Gateway)

Los **id de modelo** deben coincidir con los que expone [NVIDIA Build](https://build.nvidia.com/) / API Catalog para `POST …/v1/chat/completions`. Los renombran con frecuencia: **valida en el panel** antes de fijar producción.

## Hermes: cómo se elige el modelo

Orden (solo servidor, `apps/api/lib/agents/hermes/hermes-client.ts`):

1. `model` en el body de `POST /api/agents/hermes/run` (si viene y no está vacío).
2. Según `mode`:
   - `review` → `AI_ROUTE_FAST`
   - `plan` → `AI_ROUTE_ARCHITECT`
   - `debug` → `AI_ROUTE_CODING`
   - `security` → `AI_ROUTE_SECURITY`, si vacío → `SECURITY_MODEL`
   - `research` → `AI_ROUTE_REASONING`
3. `HERMES_MODEL`
4. En el gateway: `NVIDIA_DEFAULT_MODEL` → `NVIDIA_MODEL_ID` → valor por defecto en código.

## Catálogo de ejemplo (referencia)

| Uso sugerido | Id ejemplo (Catalog) |
|--------------|----------------------|
| Rápido / barato | `meta/llama-3.1-8b-instruct` |
| Equilibrado 70B | `meta/llama-3.1-70b-instruct` |
| Meta 3.3 70B | `meta/llama-3.3-70b-instruct` |
| Razonamiento | `deepseek-ai/deepseek-r1` |
| General DeepSeek | `deepseek-ai/deepseek-v3` |
| Código Qwen | `qwen/qwen2.5-coder-32b-instruct` |
| Qwen 72B instruct | `qwen/qwen2.5-72b-instruct` |
| Nemotron instruct | `nvidia/llama-3.1-nemotron-70b-instruct` |
| Mistral 7B | `mistralai/mistral-7b-instruct-v0.3` |
| Mixtral | `mistralai/mixtral-8x7b-instruct-v0.1` |
| Codestral | `mistralai/codestral-22b` |
| Phi-4 | `microsoft/phi-4` |
| Gemma 2 | `google/gemma-2-27b-it` |
| Embeddings | `nvidia/nv-embed-v1` |

## Variables relacionadas (`.env.example`)

- **Gateway global:** `AI_GATEWAY_PROVIDER`, `AI_GATEWAY_TIMEOUT_MS`, `AI_GATEWAY_MAX_PROMPT_CHARS`, `AI_GATEWAY_DEFAULT_MAX_TOKENS`
- **NVIDIA:** `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `NVIDIA_DEFAULT_MODEL`, `NVIDIA_MODEL_ID`
- **Rutas Hermes:** `AI_ROUTE_*`, `HERMES_MODEL`, `SECURITY_MODEL`
- **Otros agentes (reservado):** `ARCHITECT_MODEL`, `DEV_MODEL`, `QA_MODEL`

`AI_FALLBACK_*`, OpenAI, Anthropic, OpenRouter y Ollama en `.env.example` están **documentados** para Doppler; el `lib/ai-gateway` actual solo implementa el proveedor `nvidia` hasta que se añadan ramas en `gateway.ts`.

## Riesgos

- Modelos **más grandes** = más coste y latencia.
- Algunos ids requieren **acceso** o **cuota** específica en la cuenta NVIDIA.
- `nvidia/nv-embed-v1` es para **embeddings**, no sustituye chat completions en Hermes.

Ver también: [`docs/HERMES-NVIDIA.md`](HERMES-NVIDIA.md).
