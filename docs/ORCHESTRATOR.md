# Orchestrator — OpenClaw

Servicio Node (`apps/orchestrator`) que consume la cola BullMQ **`openclaw`** en Redis y ejecuta workers especializados.

## Arquitectura event-driven

- **Entrada:** `processIntent()` en `engine.ts` traduce intenciones (`notify`, `execute_code`, `trigger_workflow`, `sync_drive`, `full_pipeline`, etc.) en uno o más jobs y los encola.
- **Cola:** `apps/orchestrator/src/queue.ts` — `Queue("openclaw")`, reintentos con backoff exponencial.
- **Estado:** `state/store.ts` persiste estado de jobs en Redis (TTL) para inspección.
- **Workers:** BullMQ `Worker` por tipo de job; cada uno escucha el nombre de job acorde a `OrchestratorJob.type`.

El contenedor expone **GET `/health`** en `ORCHESTRATOR_HEALTH_PORT` (por defecto `3011`).

## Jobs disponibles

| Nombre job (BullMQ) | Worker | Rol |
|---------------------|--------|-----|
| `cursor` | `CursorWorker` | Escribe `docs/ACTIVE-PROMPT.md` en GitHub (requiere `GITHUB_TOKEN_N8N`). |
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
