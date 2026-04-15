# Hermes — capa de orquestación de agentes (Opsly)

## Qué es

**Hermes** es una capa **dentro de `apps/orchestrator`** que coordina el ciclo de vida de tareas (`platform.hermes_state`) y las enruta a agentes lógicos (Cursor, Claude, **Ollama/LLM local** vía cola `ollama`, GitHub Actions, Notion) **reutilizando**:

- Colas **BullMQ** existentes (`openclaw`, `hermes-orchestration`)
- **Redis** (heartbeat `hermes:heartbeat` vía cliente de medición cuando existe `REDIS_URL`)
- **Supabase** (`platform.hermes_*`)
- Notificaciones **Discord** (mismo webhook que el resto del orchestrator)
- Encolado opcional de jobs `cursor` y `ollama` en `openclaw` si `HERMES_DISPATCH_OPENCLAW=true` (ver `HERMES_LOCAL_LLM_FIRST` y [HERMES-LOCAL-AGENTS-STACK.md](./HERMES-LOCAL-AGENTS-STACK.md))

No se añade un workspace nuevo ni un segundo gateway LLM.

## Activación

| Variable | Efecto |
|----------|--------|
| `HERMES_ENABLED=true` | Arranca `HermesOrchestrationWorker` y registra un job repetible `hermes-tick` cada 5 minutos (cron `*/5 * * * *`). |
| `HERMES_SPRINT` | Número de sprint para filas en `hermes_metrics` (default `1`). |
| `HERMES_DISPATCH_OPENCLAW` | Si `true`, en rutas `cursor` encola un job BullMQ `cursor` con metadata Hermes; en rutas `ollama` encola job `ollama` (LLM local vía gateway). |
| `HERMES_LOCAL_LLM_FIRST` | Si `true`, tareas tipo `decision` con esfuerzo `S` se enrutan a `ollama` en lugar de `claude` (ADR-024). Requiere `HERMES_DISPATCH_OPENCLAW=true`, worker Ollama y `OLLAMA_URL` / gateway alineados. |
| `HERMES_DISCORD_NOTIFY` | Si `true`, envía avisos Discord al avanzar tareas. |

Requiere `SUPABASE_URL` (o `NEXT_PUBLIC_SUPABASE_URL`) y `SUPABASE_SERVICE_ROLE_KEY` para persistencia.

## Ciclo de vida de tarea

Estados: `PENDING` → `ROUTED` → `EXECUTING` → `COMPLETED` | `FAILED` (también `BLOCKED` para dependencias futuras).

El tick (`HermesOrchestrator.runTick`) lista tareas `PENDING`, aplica `DecisionEngine`, actualiza estado y opcionalmente encola trabajo en `openclaw`.

## API

- `GET /api/hermes/metrics` — agregados (requiere auth admin; mismo patrón que otras rutas `/api/metrics/*`).

## CLI

```bash
npm run hermes:status --workspace=@intcloudsysops/orchestrator
npm run hermes:tick
```

## Migración SQL

Aplicar `supabase/migrations/0028_hermes_tables.sql` (`npx supabase db push` en el entorno correspondiente).

## Pruebas

```bash
npm run test --workspace=@intcloudsysops/orchestrator -- hermes
```

## Troubleshooting

- **Sin tareas procesadas:** no hay filas en `hermes_state` con `state = PENDING`; insertar tareas de prueba con `task_id` único.
- **Tick no corre:** comprobar `HERMES_ENABLED`, rol del orchestrator (workers + control plane), y Redis/BullMQ accesibles.
- **Métricas vacías en API:** verificar migración aplicada y credenciales service role.
