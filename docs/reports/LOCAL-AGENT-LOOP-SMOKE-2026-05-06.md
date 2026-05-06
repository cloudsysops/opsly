# Local Agent Loop Smoke — 2026-05-06

## Objetivo

Validar el estado real del flujo local-agent descrito en `AGENTS.md`: prompt local -> OpenClaw -> cola `local-agents` -> worker local -> respuesta -> validacion/iteracion.

## Resultado

Estado actual: **MVP avanzado, no arquitectura autonoma completa end-to-end**.

### Verificado en codigo

- `POST /api/local/prompt-submit` encola en `local-agents` mediante `enqueueLocalAgentJob`.
- `POST /internal/enqueue-sandbox` sigue en `openclaw` mediante `enqueueJob`.
- `local_cursor`, `local_claude`, `local_copilot` y `local_opencode` se atienden desde un worker BullMQ unificado.
- `TestValidatorWorker` ejecuta validaciones `type-check`, `test` y `build`, y escribe reportes `validation-*.json`.
- `iteration-watch-responses.ts` puede generar prompts de reintento desde validaciones fallidas.
- `local-git-auto-commit.ts` puede commitear respuestas locales y hacer push si se ejecuta con `--auto-push`.

### Gaps confirmados

- No existe un componente llamado `ValidationOrchestrator`; el sistema real se compone de `TestValidatorWorker`, `iteration-manager` y watchers opcionales.
- `cursor-agent-service.ts` abre Cursor con `open -a Cursor`; eso requiere host macOS con Cursor instalado y no prueba por si solo que el IDE aplique cambios sin intervencion.
- La decision `commit / iterate / escalate` no esta integrada en un unico orquestador central; hoy depende de scripts separados y flags (`OPSLY_ITERATION_AUTO_SUBMIT`, `--auto-push`).
- No hay evidencia de un push hardcodeado a `claude/opsly-defense-platform-sC0qH`; el auto-push usa la rama actual.

## Validacion ejecutada

Entorno Cloud preparado durante la sesion:

```text
node v20.20.2
npm 10.8.2
```

Comandos:

```bash
npm install
npm run build --workspace=@intcloudsysops/llm-gateway
npm run test --workspace=@intcloudsysops/orchestrator -- --run health-server-local-prompt-queue iteration-manager
npm run type-check --workspace=@intcloudsysops/orchestrator
```

Resultado:

```text
Test Files  2 passed (2)
Tests       7 passed (7)
orchestrator type-check: PASS
```

## Cambio aplicado

`apps/orchestrator/__tests__/health-server-local-prompt-queue.test.ts` ahora mockea:

- `../src/queue.js` completo, para no abrir conexiones Redis reales durante el test de routing HTTP.
- `../src/workers/WebhookWorker.js`, para evitar inicializar una cola BullMQ no relacionada.
- `@intcloudsysops/llm-gateway`, para aislar el test del build `dist` del gateway.

Tambien se sincronizo `package-lock.json` con `package.json` porque `npm ci` fallaba por lockfile desactualizado (`@types/cors`, `uuid`).

## Smoke runtime recomendado en host local

Ejecutar en el host que tenga Redis, Cursor IDE y variables locales:

```bash
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
export PLATFORM_ADMIN_TOKEN="<token-local>"
export OPSLY_TEST_VALIDATOR_WORKER_ENABLED=true

npm run dev --workspace=@intcloudsysops/orchestrator
```

En terminales separadas:

```bash
npx tsx scripts/cursor-agent-service.ts
npx tsx scripts/local-agent-watcher.ts --token "$PLATFORM_ADMIN_TOKEN" --tenant-slug opsly
npm run iteration-watch --workspace=@intcloudsysops/orchestrator
npx tsx scripts/local-git-auto-commit.ts
```

Crear prompt:

```bash
mkdir -p .cursor/prompts
printf '%s\n' \
  '---' \
  'agent: cursor' \
  'agent_role: executor' \
  'max_steps: 3' \
  '---' \
  '' \
  'Haz un cambio minimo de prueba y deja notas en la respuesta.' \
  > .cursor/prompts/my-task.md
```

Validar:

```bash
curl -sS -X POST http://127.0.0.1:3011/internal/enqueue-validation \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-autonomy-approved: true" \
  -d '{
    "tenant_slug": "opsly",
    "repo_root": "'"$PWD"'",
    "correlation_id": "local-agent-smoke",
    "attempt": 0,
    "steps": ["type-check"],
    "source_prompt_path": ".cursor/prompts/my-task.md"
  }'
```

## Siguiente paso

Integrar una decision explicita post-validacion:

1. `ok: true` -> permitir commit controlado.
2. `ok: false` y `attempt < 3` -> generar reintento y reencolar.
3. `ok: false` y `attempt >= 3` -> escalar con reporte.

Hasta que eso exista como flujo unico, evitar declarar "Architecture Now Complete" para este sistema.
