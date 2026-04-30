---
status: canon
owner: operations
last_review: 2026-04-29
---

# Opsly + OpenClaw Startup Runbook

Runbook para poner en marcha Opsly/OpenClaw sin introducir infraestructura paralela ni sobrescribir CI existente.

## Principios

- La fuente de verdad sigue siendo `AGENTS.md`, `VISION.md`, `ROADMAP.md` y `docs/IMPLEMENTATION-IA-LAYER.md`.
- El control plane corre en Docker Compose + Traefik; no Kubernetes, no Swarm, no Airflow por defecto.
- Todo LLM pasa por `apps/llm-gateway`; no integrar SDKs de proveedores directo en servicios consumidores.
- No activar servicios con coste recurrente sin aprobacion explicita.
- En VPS, SSH solo por Tailscale `100.120.151.91`.

## No aplicar tal cual

La guia generica de repositorios/workflows contiene ideas reutilizables, pero estos puntos no deben ejecutarse literalmente en Opsly:

| Propuesta generica | Decision Opsly |
| --- | --- |
| Copiar `actions/starter-workflows` encima de `.github/workflows/ci.yml` | No sobrescribir workflows existentes. Extender `.github/workflows/ci.yml`, `deploy.yml` y `validate-context.yml` con cambios acotados. |
| Integrar `github/super-linter` como lint universal | No requerido ahora. El repo ya usa Turbo, ESLint 9, Vitest, Playwright y validaciones especificas (`validate-openapi`, `validate-skills`, `validate-structure`). |
| Clonar workflows externos de n8n en masa | Usar `docs/n8n-workflows/` como catalogo local curado. Importar uno por uno si hay caso de uso. |
| Agregar Airflow DAGs | Fuera de arquitectura actual. BullMQ + orchestrator es el motor de jobs. Airflow requeriria ADR. |
| Crear `config/vertex-ai-config.json` con credenciales locales | Usar Doppler y `docs/04-infrastructure/VERTEX-AI-SETUP.md`; no guardar credenciales en repo. |
| Instalar `@deepseek/sdk` en consumidores | Si DeepSeek se usa, hacerlo via LLM Gateway y variables Doppler (`DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`). |
| Ejecutar `apps/orchestrator/dist/hive/queen-bee.js` y bots como procesos sueltos | Hive vive integrado en orchestrator. Usar endpoints internos o `npm run hive-run --workspace=@intcloudsysops/orchestrator` para pruebas locales. |
| Llamar `/openclaw/intent` o dashboard `/openclaw-governance` | No son contratos actuales. Usar endpoints internos existentes en `apps/orchestrator/src/health-server.ts`. |
| Usar `docker-compose` | Preferir `docker compose`. |

## Preparacion local

```bash
git pull --ff-only
npm ci
npm run validate-structure
npm run validate-skills
npm run validate-openapi
npm run type-check
```

Si se trabaja contra secretos reales:

```bash
doppler setup --project ops-intcloudsysops --config prd
```

## Arranque local rapido

Topologia local validada en `mac2011`:

```bash
# Redis local/tunel ya ocupa 127.0.0.1:6379.
redis-cli -u redis://127.0.0.1:6379/0 ping

# LLM Gateway
REDIS_URL=redis://127.0.0.1:6379/0 \
LLM_GATEWAY_PORT=3010 \
npm run dev --workspace=@intcloudsysops/llm-gateway

# Orchestrator local como control plane: no duplicar workers de opsly-mac2011.
npm run build --workspace=@intcloudsysops/orchestrator
REDIS_URL=redis://127.0.0.1:6379/0 \
ORCHESTRATOR_LLM_GATEWAY_URL=http://127.0.0.1:3010 \
LLM_GATEWAY_URL=http://127.0.0.1:3010 \
ORCHESTRATOR_HEALTH_PORT=3011 \
OPSLY_ORCHESTRATOR_MODE=queue-only \
node apps/orchestrator/dist/index.js

# Context Builder HTTP. El script dev ya apunta al entrypoint servidor.
REDIS_URL=redis://127.0.0.1:6379/0 \
CONTEXT_BUILDER_PORT=3012 \
KNOWLEDGE_INDEX_PATH="$PWD/config/knowledge-index.json" \
OPS_REPO_ROOT="$PWD" \
npm run dev --workspace=@intcloudsysops/context-builder

# MCP si no esta ya corriendo en 3003.
npm run dev --workspace=@intcloudsysops/mcp
```

Control plane web local:

```bash
PORT=3000 \
REDIS_URL=redis://127.0.0.1:6379/0 \
ORCHESTRATOR_INTERNAL_URL=http://127.0.0.1:3011 \
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000 \
PLATFORM_DOMAIN=localhost \
npm run dev --workspace=@intcloudsysops/api

PORT=3001 \
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000 \
NEXT_PUBLIC_PLATFORM_DOMAIN=localhost \
ADMIN_PUBLIC_DEMO_READ=true \
NEXT_PUBLIC_ADMIN_PUBLIC_DEMO=true \
npm run dev --workspace=@intcloudsysops/admin

PORT=3002 \
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000 \
NEXT_PUBLIC_PLATFORM_DOMAIN=localhost \
NEXT_PUBLIC_PORTAL_URL=http://127.0.0.1:3002 \
npm run dev --workspace=@intcloudsysops/portal
```

Health local esperado:

```bash
curl -sf http://127.0.0.1:3000/api/health
curl -sf http://127.0.0.1:3001/dashboard -o /tmp/opsly-admin-home.html
curl -sf http://127.0.0.1:3002/login -o /tmp/opsly-portal-login.html
curl -sf http://127.0.0.1:3003/health
curl -sf http://127.0.0.1:3010/health
curl -sf http://127.0.0.1:3011/health
curl -sf http://127.0.0.1:3012/health
```

Notas:

- `apps/api` puede reportar `supabase: error` en local si no se cargaron secretos Doppler; `redis: ok` es suficiente para smoke basico.
- `npm run dev --workspace=@intcloudsysops/orchestrator` puede chocar con resolucion `tsx`/watch en algunos entornos; el camino estable validado es `npm run build` + `node apps/orchestrator/dist/index.js`.
- Si `curl` hace timeout en el primer intento contra Next.js, esperar a que compile la ruta y reintentar.

Para levantar el stack OpenClaw de laboratorio con imagenes GHCR:

```bash
docker compose -f infra/docker-compose.openclaw-orchestrator.yml up -d redis llm-gateway orchestrator mcp
docker compose -f infra/docker-compose.openclaw-orchestrator.yml ps
```

Nota: ese compose puede fallar con `unauthorized` si no hay login GHCR para paquetes privados. Ademas incluye servicios pesados opcionales como Ollama, Prometheus y Grafana. En un VPS de 48 GB, revisar primero `docs/01-development/HEAVY-SERVICES-DECISION.md`.

## Arranque plataforma VPS

En el VPS:

```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && git pull --ff-only"
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && docker compose -f infra/docker-compose.platform.yml up -d --pull always"
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && docker compose -f infra/docker-compose.platform.yml ps"
```

Verificaciones:

```bash
curl -sf https://api.ops.smiletripcare.com/api/health
ssh vps-dragon@100.120.151.91 \
  "docker inspect --format '{{.Name}} {{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' opsly_orchestrator opsly_llm_gateway opsly_mcp infra-redis-1 traefik"
```

Los puertos `3010`, `3011` y `3003` del VPS no tienen por que estar publicados en `127.0.0.1` del host; validar via Docker health o dentro de la red Compose.

## Worker / Ollama

Alias funcional validado:

```bash
ssh opsly-mac2011 "hostname && docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'opsly|openclaw|redis|ollama|worker'"
ssh opsly-mac2011 "curl -sf http://127.0.0.1:11434/api/tags | head -c 500"
```

`opsly-worker` puede fallar si MagicDNS `opsly-worker.taile4fe40.ts.net` no resuelve. Usar `opsly-mac2011` (`100.80.41.29`) hasta corregir Tailscale DNS o `~/.ssh/config`.

## LLM Gateway

Health local:

```bash
curl -sf http://127.0.0.1:3010/health
```

Busqueda web via gateway, solo si esta habilitada:

```bash
curl -X POST http://127.0.0.1:3010/v1/search \
  -H "Content-Type: application/json" \
  -d '{"tenant_slug":"platform","query":"test connection","max_results":3}'
```

Flags requeridos:

```bash
LLM_GATEWAY_SEARCH_ENABLED=true
TAVILY_API_KEY=<secret in Doppler>
```

DeepSeek, si se activa, debe quedar detras del gateway:

```bash
doppler secrets set DEEPSEEK_API_KEY --project ops-intcloudsysops --config prd
doppler secrets set DEEPSEEK_BASE_URL "https://api.deepseek.com/v1" --project ops-intcloudsysops --config prd
doppler secrets set DEEPSEEK_MODEL "deepseek-v4-flash" --project ops-intcloudsysops --config prd
```

## OpenClaw / Orchestrator

Health:

```bash
curl -sf http://127.0.0.1:3011/health
```

Encolar job Ollama de prueba:

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/test-worker-e2e.sh smiletripcare --notify
```

Sandbox dry-run:

```bash
./scripts/run-in-sandbox.sh --dry-run --cmd "echo Hello Opsly"
```

Hive local:

```bash
npm run hive-run --workspace=@intcloudsysops/orchestrator
```

Hive por API interna:

```bash
curl -X POST http://127.0.0.1:3011/internal/hive/objective \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"objective":"improve README clarity","tenant_slug":"platform","request_id":"manual-hive-smoke"}'
```

Sin token, el endpoint responde `401 unauthorized`. Para smoke sin mutacion:

```bash
curl -sf http://127.0.0.1:3011/internal/hive/init -X POST
curl -sf http://127.0.0.1:3011/internal/hive/stats
curl -sf http://127.0.0.1:3011/internal/hive/bots
```

## Skills y conocimiento

```bash
npm run skills:bootstrap
npm run validate-skills
npm run index-knowledge
```

Tras `git pull` en VPS o cambios grandes en docs:

```bash
OPSLY_ROOT=/opt/opsly ./scripts/index-knowledge.sh
```

## CI/CD

Workflows externos utiles como referencia:

- `actions/starter-workflows`: ejemplos, no fuente de verdad.
- `actions/cache`, `actions/upload-artifact`, `actions/dependency-review-action`: usar solo si hay PR concreto.
- `github/super-linter`: evaluar antes de instalar; puede duplicar reglas y alargar CI.

Checks actuales antes de PR:

```bash
npm run type-check
npm run test --workspace=@intcloudsysops/orchestrator
npm run test --workspace=@intcloudsysops/llm-gateway
npm run validate-openapi
npm run validate-skills
```

## Troubleshooting

Redis:

```bash
docker ps | grep redis
docker compose -f infra/docker-compose.platform.yml logs --tail=80 redis
```

LLM Gateway:

```bash
docker compose -f infra/docker-compose.platform.yml logs --tail=80 llm-gateway
curl -sf http://127.0.0.1:3010/health
```

Orchestrator:

```bash
docker compose -f infra/docker-compose.platform.yml logs --tail=80 orchestrator
curl -sf http://127.0.0.1:3011/health
```

Disco VPS:

```bash
ssh vps-dragon@100.120.151.91 "df -h / && docker system df"
```

Si el disco supera 90%, seguir `docs/01-development/HEAVY-SERVICES-DECISION.md` y `scripts/vps-cleanup-robust.sh` antes de activar servicios pesados.
