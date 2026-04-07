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

Tras encolar, `setJobState` guarda objetos con campos como `id`, `type`, `status` (`pending`, etc.), `tenant_slug`, `started_at`. Consulta el store en `state/store.ts` para el esquema exacto y TTL.

## Concurrency por plan

La priorización por plan (Startup / Business / Enterprise) está alineada con `VISION.md` y `docs/OPENCLAW-ARCHITECTURE.md`: los workers pueden leer el plan del tenant desde Supabase/API y ajustar `concurrency` o rechazar trabajo; hoy los workers usan valores fijos (p. ej. `concurrency: 3` en `CursorWorker`). Evolución: leer política por `tenant_slug` antes de ejecutar side-effects costosos.
