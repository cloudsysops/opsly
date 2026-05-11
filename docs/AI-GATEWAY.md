# Opsly AI Gateway

## Propósito

El **Opsly AI Gateway** expone un endpoint interno de admin para probar proveedores LLM externos sin exponer API keys al frontend. El MVP usa **NVIDIA Build / NIM** mediante un contrato estilo OpenAI (`/chat/completions`) y deja la arquitectura lista para OpenAI, Claude, OpenRouter y Ollama.

Endpoint MVP:

```http
POST /api/ai/chat
```

Respuesta exitosa:

```json
{
  "ok": true,
  "provider": "nvidia",
  "model": "meta/llama-3.1-8b-instruct",
  "content": "..."
}
```

## Variables de entorno

```bash
AI_GATEWAY_PROVIDER=nvidia
AI_GATEWAY_TIMEOUT_MS=30000
NVIDIA_API_KEY=nvapi-...
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_DEFAULT_MODEL=meta/llama-3.1-8b-instruct
```

Las variables son **server-side**. No usar prefijo `NEXT_PUBLIC_` para API keys.

## Cómo conseguir una NVIDIA API key

1. Entrar a NVIDIA Build / NVIDIA API Catalog.
2. Elegir un modelo compatible con Chat Completions.
3. Generar una API key personal o de proyecto.
4. Guardarla en Doppler/local env como `NVIDIA_API_KEY`.
5. Confirmar el endpoint base actual y configurar `NVIDIA_BASE_URL`.

## Probar local

1. Configurar variables en `.env.local` del admin o exportarlas en shell.
2. Levantar admin:

```bash
npm run dev --workspace=@intcloudsysops/admin
```

3. Abrir:

```text
http://localhost:3001/ai-gateway
```

4. O probar por script:

```bash
AI_GATEWAY_TEST_URL=http://localhost:3001/api/ai/chat node scripts/test-ai-gateway.js
```

## Desplegar en VPS

1. Agregar variables en Doppler `ops-intcloudsysops/prd`:

```bash
doppler secrets set AI_GATEWAY_PROVIDER=nvidia AI_GATEWAY_TIMEOUT_MS=30000 NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1 NVIDIA_DEFAULT_MODEL=meta/llama-3.1-8b-instruct
# NVIDIA_API_KEY se agrega sin imprimirla en logs.
```

2. Redeploy del admin con el flujo existente de Compose/GHCR.
3. Smoke test desde red interna o navegador admin:

```bash
curl -sS -X POST https://admin.$PLATFORM_DOMAIN/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Say hello from Opsly AI Gateway."}]}'
```

## Guardrails de seguridad/costo

- API key solo server-side.
- Timeout por defecto: `30000ms`.
- `max_tokens` default: `1024`, hard cap: `4096`.
- Prompt máximo: `12000` caracteres.
- Máximo `16` mensajes por request.
- Logs sin secretos: provider, model, cantidad de mensajes y tamaño aproximado.
- Errores sanitizados: no se devuelve API key ni headers al cliente.

## Riesgos pendientes

- NVIDIA Build puede cambiar disponibilidad/modelos/free tier.
- Falta autenticación fuerte dedicada para `/api/ai/chat`; actualmente es una ruta interna del admin app.
- Falta metering persistente por tenant/request para este MVP.
- Falta rate limiting por usuario/IP.
- Falta fallback automático a OpenClaw LLM Gateway productivo.

## Próximos proveedores

- **OpenAI:** provider con `OPENAI_API_KEY` y misma interfaz.
- **Claude:** provider Anthropic con normalización al contrato `ChatResponse`.
- **OpenRouter:** provider compatible OpenAI para routing económico.
- **Ollama:** provider local para Mac/VPS sin coste variable.
