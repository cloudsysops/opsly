# Variables Doppler / secretos — referencia

Proyecto típico en Doppler: `ops-intcloudsysops`, config `prd` (producción) o `dev`.

## LLM Gateway (Beast Mode v2)

| Variable | Uso |
|----------|-----|
| `ANTHROPIC_API_KEY` | Anthropic (Haiku / Sonnet). |
| `REDIS_URL` | Cache de respuestas + estado de salud de proveedores. |
| `REDIS_PASSWORD` | Si el cliente Redis lo requiere aparte de la URL. |
| `LLM_GATEWAY_PORT` | Puerto del HTTP `/health` del proceso gateway (default `3010`). |
| `LLM_CACHE_TTL_SECONDS` | TTL del cache Redis de prompts (default `7200`). |
| `OLLAMA_URL` | Base URL de Ollama (default `http://localhost:11434`). |
| `OLLAMA_MODEL` | Modelo Ollama por defecto (default `llama3.2`). |
| `OPENROUTER_API_KEY` | OpenRouter (fallback económico). |
| `OPENAI_API_KEY` | OpenAI (`gpt-4o`, `gpt-4o-mini`) como fallback. |
| `OPENROUTER_HTTP_REFERER` | Opcional: cabecera HTTP-Referer para OpenRouter. |
| `DISCORD_WEBHOOK_URL` | Alertas cuando un proveedor pasa a `down` o se recupera. |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Opcional: `usage_events`. |

## Plataforma (otros)

Ver también `scripts/check-tokens.sh` para la lista de variables validadas contra Doppler `prd`.
