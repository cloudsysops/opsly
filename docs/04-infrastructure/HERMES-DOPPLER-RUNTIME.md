# Hermes + AI Gateway — Doppler como fuente de verdad

**No** uses el repo `.env` para secretos. **Doppler** (`ops-intcloudsysops` / `prd` o `stg`) es la fuente de verdad; el VPS recibe variables vía `vps-bootstrap` → `/opt/opsly/.env` o inyección en runtime.

## 1. Variables mínimas en Doppler (API / `app`)

| Variable | Rol |
|----------|-----|
| `AI_GATEWAY_PROVIDER_CHAIN` | Orden de fallback del gateway (`nvidia,openrouter,ollama,openai` por defecto). |
| `AI_GATEWAY_API_KEY` | Bearer opcional para OpenCode/Codex/SDKs; rotación separada de tokens admin. |
| `NVIDIA_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY` | Secretos; solo Doppler / proceso del contenedor. |
| `NVIDIA_BASE_URL` | `https://integrate.api.nvidia.com/v1` |
| `NVIDIA_DEFAULT_MODEL` | Fallback del gateway si no mandas `model` en el body. |
| `HERMES_MODEL` | Modelo opcional para llamadas explícitas; por defecto Hermes usa alias `opsly:*`. |
| `AI_ROUTE_FAST`, `AI_ROUTE_CODING`, `AI_ROUTE_SECURITY`, `AI_ROUTE_ARCHITECT` | Model ids por alias Opsly. |
| `AI_GATEWAY_TIMEOUT_MS`, `AI_GATEWAY_MAX_PROMPT_CHARS`, `AI_GATEWAY_DEFAULT_MAX_TOKENS` | Opcionales; ver `.env.example`. |

**Free tier / rate limits:** evita 70B/120B como modelo único para todo; usa **8b** para Hermes “cheap” y sube a Nemotron/70B solo en rutas que lo necesiten (`ARCHITECT_MODEL`, `AI_ROUTE_ARCHITECT`, etc.).

## 2. Local (MacBook)

```bash
doppler run --project ops-intcloudsysops --config prd -- npm run dev --workspace=@intcloudsysops/api
```

Scripts de prueba:

```bash
doppler run --project ops-intcloudsysops --config prd -- npm run test:hermes-nvidia
```

## 3. Docker Compose

El `infra/docker-compose.platform.yml` usa `env_file: ../.env` (en el VPS suele ser el `.env` generado desde Doppler). **Mejor** en desarrollo:

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d app
```

Así no duplicas claves en un `.env` git-tracked.

## 4. Hermes (código Opsly API)

- **No** lee claves de proveedor en el módulo Hermes: las claves solo las usan `lib/ai-gateway/providers/*` en servidor.
- Hermes llama `runAiGatewayChat` con alias `opsly:*`; el gateway resuelve `AI_ROUTE_*`, reintenta una vez en 429 y aplica `AI_GATEWAY_PROVIDER_CHAIN`.

Endpoint NVIDIA: `POST https://integrate.api.nvidia.com/v1/chat/completions` (el código usa `NVIDIA_BASE_URL` + `/chat/completions`).

## 5. Comprobar env sin volcar secretos

```bash
doppler run --project ops-intcloudsysops --config prd -- printenv | grep -E '^(NVIDIA_|HERMES_|AI_GATEWAY_)' | sed 's/API_KEY=.*/API_KEY=[set]/'
```

## 6. Probar NVIDIA directo (opcional, con Doppler)

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  curl -sS "https://integrate.api.nvidia.com/v1/chat/completions" \
  -H "Authorization: Bearer $NVIDIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"meta/llama-3.1-8b-instruct","messages":[{"role":"user","content":"Reply: Hermes path OK"}]}'
```

## 7. OpenRouter / fallback en Hermes API

El **LLM Gateway** del monorepo (`apps/llm-gateway`) sigue existiendo para otros módulos. Hermes API usa el gateway interno de `apps/api`; si ves `provider=openrouter`, normalmente significa que NVIDIA devolvió 429/503/502/504/408 o no estaba configurado y el fallback funcionó.

Ver también: [`docs/HERMES-NVIDIA.md`](HERMES-NVIDIA.md), [`docs/AI-GATEWAY-MODELS-NVIDIA.md`](AI-GATEWAY-MODELS-NVIDIA.md).
