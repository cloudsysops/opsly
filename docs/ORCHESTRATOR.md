# Orchestrator — OpenClaw

Servicio Node (`apps/orchestrator`) que consume la cola BullMQ **`openclaw`** en Redis y ejecuta workers especializados.

## Arquitectura event-driven

- **Entrada:** `processIntent()` en `engine.ts` traduce intenciones (`notify`, `execute_code`, `trigger_workflow`, `sync_drive`, `full_pipeline`, `remote_plan`, etc.) en uno o más jobs y los encola.
- **Cola:** `apps/orchestrator/src/queue.ts` — `Queue("openclaw")`, reintentos con backoff exponencial.
- **Estado:** `state/store.ts` persiste estado de jobs en Redis (TTL) para inspección.
- **Workers:** BullMQ `Worker` por tipo de job; cada uno escucha el nombre de job acorde a `OrchestratorJob.type`.

El contenedor expone **GET `/health`** en `ORCHESTRATOR_HEALTH_PORT` (por defecto `3011`).

## Rol del proceso (`OPSLY_ORCHESTRATOR_ROLE`)

| Valor | Dónde | Qué arranca |
|--------|--------|-------------|
| *(omitido)* / `full` | Por defecto | TeamManager + suscripción a eventos + **todos** los workers (comportamiento histórico). |
| `control` | VPS (control plane) | TeamManager + eventos + health; **sin** workers BullMQ (consumo en otro host). |
| `worker` | Mac 2011 / nodo remoto | Solo workers + health; **sin** TeamManager. |

Misma imagen Docker / mismo `node dist/index.js`; ver `apps/orchestrator/src/orchestrator-role.ts` y `docs/ARCHITECTURE-DISTRIBUTED.md`.

## Jobs disponibles

| Nombre job (BullMQ) | Worker | Rol |
|---------------------|--------|-----|
| `cursor` | `CursorWorker` | Escribe `docs/ACTIVE-PROMPT.md` en GitHub vía API (requiere `GITHUB_TOKEN` o `GITHUB_TOKEN_N8N` legado; ver `docs/GITHUB-TOKEN.md`). |
| `n8n` | `N8nWorker` | Disparar flujos / integraciones n8n según payload. |
| `notify` | `NotifyWorker` | Notificaciones Discord u otros canales. |
| `drive` | `DriveWorker` | Sincronización con Drive (cuando token configurado). |

## Cómo agregar un worker nuevo

1. Definir tipo en `types.ts` (`OrchestratorJob`) y rama en `engine.ts` si hay nueva intención.
2. Crear `workers/MiWorker.ts` con `new Worker("openclaw", handler, { connection, concurrency })` filtrando por `job.name`.
3. Registrar `startMiWorker(connection)` en `index.ts`.
4. Tests con cola/redis mockeados (ver patrones en `__tests__/`).

## Estados de job

Tras encolar, `setJobState` guarda objetos con `id`, `type`, `status`, `tenant_slug`, `tenant_id`, `plan`, `request_id`, `idempotency_key`, `cost_budget_usd`, `agent_role`, `started_at`, etc. (ver `state/store.ts`). TTL sin cambios.

## Metadata de jobs e idempotencia

- **`IntentRequest`** puede incluir opcionales: `tenant_id`, `plan`, `idempotency_key`, `request_id`, `cost_budget_usd`, `agent_role` (`planner` \| `executor` \| `tool` \| `notifier`).
- **`request_id`:** correlación entre jobs del mismo `processIntent`; si no se envía, se genera UUID.
- **`idempotency_key`:** por intent con varios jobs se sufija por tipo e índice (`<key>::<type>::<n>`). BullMQ recibe `jobId` derivado en `queue-opts.ts` (`idem:<type>:...`) para deduplicar reintentos.
- **Log estructurado:** cada encolado escribe una línea JSON en stdout (`observability/job-log.ts`) con `tenant_slug`, `request_id`, `job_type`, etc.
- **Workers:** inicio, éxito y fallo por job escriben líneas JSON (`observability/worker-log.ts`) con `event` `worker_start` \| `worker_complete` \| `worker_fail`, `worker` (`cursor` \| `n8n` \| `notify` \| `drive`), `bullmq_job_id` y `duration_ms` cuando aplica.

## Concurrency por plan

La priorización por plan (Startup / Business / Enterprise) está alineada con `VISION.md` y `docs/OPENCLAW-ARCHITECTURE.md`: los workers pueden leer el plan del tenant desde Supabase/API y ajustar `concurrency` o rechazar trabajo; hoy los workers usan valores fijos (p. ej. `concurrency: 3` en `CursorWorker`). Evolución: leer política por `tenant_slug` antes de ejecutar side-effects costosos.

### Prioridad en la cola BullMQ (`queue-opts.ts`)

Cada job lleva `priority` en las opciones de `Queue.add` (BullMQ: **0 = máxima prioridad**, valores mayores se procesan después). `planToQueuePriority` asigna: **enterprise → 0**, **business → 10_000**, **startup** o sin plan → **50_000**. El log JSON `job_enqueue` incluye `queue_priority` para correlación.

## Remote Planner (Chat.z / Fase 4)

- **Intención:** `remote_plan` (o cualquier intent con `agent_role: "planner"`, que se normaliza a `remote_plan`).
- **Flujo principal:** el orchestrator usa `executeRemotePlanner` en `apps/orchestrator/src/planner-client.ts` → **`POST /v1/chat/completions`** en **llm-gateway** (mensajes `system` + `user` con contexto y lista de herramientas). Compatibilidad: `callRemotePlanner` en `llm-gateway-client.ts` delega en el mismo cliente. **`POST /v1/planner`** sigue disponible (mismo `llmCall` + JSON planner). No hay llamadas directas a Anthropic/OpenAI desde el orchestrator.
- **Hermes:** el gateway ejecuta `llmCall()` y registra uso (tokens/costo) con `request_id` y `tenant_slug` en el flujo estándar del gateway.
- **Respuesta:** JSON `{ reasoning, actions: [{ tool, params }] }`.

**Estado del Planner (2026-04-10):** el flujo `remote_plan` está en **modo producción**.

1. El orchestrator recibe un `IntentRequest` (exige `tenant_slug` para aislamiento Hermes).
2. Llama a `executeRemotePlanner` → **LLM Gateway** (`POST /v1/chat/completions` o equivalente interno).
3. El JSON devuelto se valida; cada acción se mapea con `planner-map.ts` a un `OrchestratorJob` y se encola en BullMQ vía `enqueueJob` (cola `openclaw`, tipos `cursor` \| `n8n` \| `notify` \| `drive` según herramienta). Los `params` del planner pasan por `sanitizePlannerParams` (no pueden sobrescribir `tenant_slug`, `request_id` ni `tenant_id`).
4. **Límites de seguridad:** máximo **5** acciones por plan (`MAX_PLANNER_ACTIONS`); si se supera → error *Plan demasiado complejo*. Herramientas desconocidas → log `planner_unknown_tool` y se omiten (fail-safe).
5. **Observabilidad:** línea JSON `planner_response` en stdout; por cada job encolado, `planner_action_enqueued` (`observability/planner-log.ts`); estado inicial en Redis con `setJobState`.

*Nota histórica:* el código legacy de solo simulación (`console.log` sin encolar) fue sustituido por encolado real (`enqueueJob` / `queue.add` con opciones de `queue-opts.ts`).

- **Red Docker:** definir `ORCHESTRATOR_LLM_GATEWAY_URL=http://llm-gateway:3010` (ya en `infra/docker-compose.platform.yml`).

### Prueba manual del planner HTTP

Con el gateway levantado:

```bash
curl -sS -X POST "http://127.0.0.1:3010/v1/planner" \
  -H "Content-Type: application/json" \
  -H "x-tenant-slug: localrank" \
  -H "x-request-id: $(uuidgen)" \
  -d '{"tenant_slug":"localrank","context":{"note":"smoke"},"available_tools":["get_health","notify"]}'
```

Chat/completions (mismo cuerpo de respuesta `planner` + `llm`):

```bash
curl -sS -X POST "http://127.0.0.1:3010/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "x-tenant-slug: localrank" \
  -H "x-request-id: $(uuidgen)" \
  -d '{"tenant_slug":"localrank","messages":[{"role":"system","content":"Eres un orquestador experto. Devuelve SOLO JSON: reasoning + actions."},{"role":"user","content":"contexto: smoke"}]}'
```
