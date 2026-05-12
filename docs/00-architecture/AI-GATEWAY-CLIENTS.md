# Opsly AI Gateway — clientes (OpenCode, Codex, Claude Code)

Los IDEs **no** deben elegir proveedor final (NVIDIA, OpenRouter, OpenAI, Ollama): llaman al **Opsly AI Gateway** en la API (`apps/api`). El servidor resuelve alias `opsly:*` → variables `AI_ROUTE_*`, aplica cadena `AI_GATEWAY_PROVIDER_CHAIN`, reintenta una vez en **429** con backoff corto y hace fallback sin exponer claves.

## URLs y auth

| Uso | Método | Ruta | Auth |
|-----|--------|------|------|
| JSON Opsly (admin/UI) | `POST` | `/api/ai/chat` | `Authorization: Bearer` (`AI_GATEWAY_API_KEY` **o** token admin / sesión super-admin) |
| OpenAI-compatible | `POST` | `/api/ai/v1/chat/completions` | Igual |
| Anthropic Messages (Claude Code) | `POST` | `/api/ai/anthropic/v1/messages` | Igual (sin `stream`; tool/image blocks no soportados) |
| Catálogo / rutas (solo env, sin secretos) | `GET` | `/api/ai/models` | Igual |

`baseURL` típico para SDKs OpenAI-compat: `https://api.<PLATFORM_DOMAIN>/api/ai/v1` (termina en `/v1`; el cliente añade `/chat/completions`).

`ANTHROPIC_BASE_URL` para Claude Code: `https://api.<PLATFORM_DOMAIN>/api/ai/anthropic` (el cliente añade `/v1/messages`). Los modelos `claude-*` se enrutan internamente a `opsly:architect`; `opsly:*` se respetan tal cual.

Variables Doppler (ejemplos, sin valores reales): `AI_GATEWAY_API_KEY`, `AI_GATEWAY_PROVIDER_CHAIN`, `NVIDIA_*`, `OPENROUTER_*`, `OPENAI_*`, `OLLAMA_*`, `AI_ROUTE_*`. Ver `.env.example`.

## Modelos `opsly:*`

| `model` | Resolución |
|---------|------------|
| `opsly:fast` | `AI_ROUTE_FAST` |
| `opsly:coding` | `AI_ROUTE_CODING` |
| `opsly:architect` | `AI_ROUTE_ARCHITECT` |
| `opsly:security` | `AI_ROUTE_SECURITY` |
| `opsly:auto` | Heurística simple sobre el último mensaje `user` o `metadata.opsly_route` (`fast` \| `coding` \| `architect` \| `security`) |

Cualquier otro string se envía tal cual al primer proveedor de la cadena (modo passthrough).

## OpenCode

`~/.config/opencode/opencode.json` (o `opencode.json` del proyecto), `baseURL` apuntando al gateway:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "opsly": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Opsly Gateway",
      "options": {
        "baseURL": "https://api.example.com/api/ai/v1",
        "apiKey": "{env:AI_GATEWAY_API_KEY}"
      },
      "models": {
        "opsly:coding": { "name": "Opsly Coding" },
        "opsly:fast": { "name": "Opsly Fast" },
        "opsly:architect": { "name": "Opsly Architect" },
        "opsly:security": { "name": "Opsly Security" }
      }
    }
  },
  "model": "opsly/opsly:coding"
}
```

Sustituir `example.com` por tu `PLATFORM_DOMAIN` real. Exportar `AI_GATEWAY_API_KEY` en el entorno del IDE.

## Codex

Opción A — MCP (recomendado si ya expones herramientas Opsly).

Opción B — proveedor OpenAI-compatible en `~/.codex/config.toml`:

```toml
model = "opsly:coding"

[model_provider.opsly]
name = "Opsly Gateway"
base_url = "https://api.example.com/api/ai/v1"
env_key = "AI_GATEWAY_API_KEY"
wire_api = "chat"
```

## Claude Code

- **Anthropic API URL:** `ANTHROPIC_BASE_URL=https://api.<PLATFORM_DOMAIN>/api/ai/anthropic` y `ANTHROPIC_API_KEY=<AI_GATEWAY_API_KEY>` (misma clave que el gateway OpenAI-compat).
- **Modelos:** `claude-*` → gateway usa `opsly:architect`. Usa `opsly:fast`, `opsly:coding`, etc. en el CLI si quieres alias explícitos.
- **Límites del proxy:** no `stream: true`; mensajes solo texto (bloques `type: text`); sin `tool_use` / imágenes.
- **Alternativa:** cliente OpenAI apuntando a `.../api/ai/v1` con `opsly:*` como `model`.

## Hermes (API interna)

`POST /api/agents/hermes/run` sigue con auth admin; Hermes usa por defecto `opsly:fast`, `opsly:coding` en `plan`, y `opsly:security` en modo `security` (`hermes-client.ts`).

## Seguridad

- No enviar `NVIDIA_API_KEY` / `OPENROUTER_API_KEY` a los IDEs: solo `AI_GATEWAY_API_KEY` (rotación independiente).
- Los logs de 429 registran `provider`, `model`, `status`, `phase` en JSON (sin cabeceras ni cuerpos con secretos).
