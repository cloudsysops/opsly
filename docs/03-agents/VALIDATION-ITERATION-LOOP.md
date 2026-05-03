# Validación local + bucle de reintentos (autonomía incremental)

## Componentes

| Pieza | Ubicación | Rol |
|--------|-----------|-----|
| **TestValidatorWorker** | `apps/orchestrator/src/workers/TestValidatorWorker.ts` | Cola BullMQ `openclaw`, job name `test_validation`. Ejecuta `npm run type-check` / `test` / `build` en `repo_root` (opcional `-w` workspace). Escribe `.cursor/responses/validation-<correlation>.json`. |
| **Iteration manager** | `apps/orchestrator/src/lib/iteration-manager.ts` | Genera markdown de reintento a partir del JSON de validación (máx. `MAX_AUTO_ITERATIONS` = 3). |
| **HTTP enqueue** | `POST /internal/enqueue-validation` en el health del orchestrator (mismo puerto que `/health`, p. ej. 3011) | Encola el job (Bearer `PLATFORM_ADMIN_TOKEN`). |
| **Watcher opcional** | `apps/orchestrator/scripts/iteration-watch-responses.ts` | Observa `validation-*.json`; si `ok: false`, escribe `.cursor/prompts/auto-retry-*.md` y opcionalmente re-envía a `/api/local/prompt-submit`. |

## Activación del worker

Por defecto **no** arranca en el VPS (evita `npm run type-check` pesado sin querer).

```bash
export OPSLY_TEST_VALIDATOR_WORKER_ENABLED=true
```

Luego arranca el orchestrator en modo `worker-enabled` (o full stack) con Redis.

## Encolar una validación

```bash
curl -sS -X POST "http://127.0.0.1:3011/internal/enqueue-validation" \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug": "opsly",
    "repo_root": "'"$PWD"'",
    "correlation_id": "demo-1",
    "attempt": 0,
    "steps": ["type-check"]
  }' | jq .
```

Campos opcionales: `request_id`, `npm_workspace` (ej. `@intcloudsysops/orchestrator`), `source_prompt_path`, `steps` (`type-check` \| `test` \| `build`).

## Watcher de reintentos

```bash
cd /ruta/al/repo
OPSLY_REPO_ROOT="$PWD" PLATFORM_ADMIN_TOKEN="…" \
  npx tsx apps/orchestrator/scripts/iteration-watch-responses.ts
```

- Estado: `.cursor/iteration-state.json` (conteo de prompts emitidos por `correlation_id`).
- Auto submit: `OPSLY_ITERATION_AUTO_SUBMIT=true` (requiere token; añade cabecera `x-autonomy-approved: true`).

## Relación con agentes locales

- Los prompts locales siguen yendo a la cola **`local-agents`** (`POST /api/local/prompt-submit`).
- La validación va a **`openclaw`** como job `test_validation`, ejecutado por el worker dedicado.

## Pruebas unitarias

```bash
npm run test --workspace=@intcloudsysops/orchestrator -- --run iteration-manager
```
