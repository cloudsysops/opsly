# AI Frameworks en intcloudsysops

Este documento describe la integración base de `LangChain`, `LlamaIndex` y `Dify` en entorno local para acelerar pruebas del sistema DockWiki/pro.

## Dependencias

Instaladas en raíz del monorepo:

- `langchain`
- `@langchain/anthropic`
- `@langchain/openai`
- `llamaindex`

## Integraciones de código

Se añadieron módulos reutilizables en `apps/api/lib/ai/`:

- `langchain.ts`: fabrica modelos LangChain para Anthropic u OpenAI.
- `llamaindex.ts`: fabrica modelos LlamaIndex y aplica defaults.
- `ai.ts`: fachada unificada para crear integraciones de ambos frameworks.

## Docker Compose local con Dify

Se añadió servicio `dify` en `infra/docker-compose.local.yml`:

- Imagen: `langgenius/dify-api:1.2.0`
- Profile: `ai`
- Puerto local: `5001`
- Dependencia: `redis`

Arranque manual:

```bash
docker compose --profile ai -f infra/docker-compose.local.yml up -d redis dify
```

## Script de inicialización

Script idempotente:

```bash
./scripts/init-ai-frameworks.sh
```

Modo simulación:

```bash
./scripts/init-ai-frameworks.sh --dry-run
```

Qué valida el script:

1. Instalación de dependencias AI.
2. Resolución de imports de frameworks.
3. Sintaxis de `docker-compose.local.yml`.
4. Arranque de `redis` + `dify` (profile `ai`).
5. Reachability local de Dify (`http://127.0.0.1:5001/health`).

## Variables relevantes

- `DIFY_SECRET_KEY`
- `DIFY_DB_USERNAME`
- `DIFY_DB_PASSWORD`
- `DIFY_DB_HOST`
- `DIFY_DB_PORT`
- `DIFY_DB_DATABASE`
- `DIFY_WEAVIATE_ENDPOINT`

En local se usan defaults para bootstrap rápido. Para entorno productivo, definir valores reales en Doppler.
