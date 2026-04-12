# Testing worker y BullMQ (cola `openclaw`)

Scripts para encolar jobs de prueba en la misma cola Redis que usa `apps/orchestrator` y monitorear el VPS.

## Requisitos

- `REDIS_URL` (y `REDIS_PASSWORD` si aplica) vía Doppler `ops-intcloudsysops` / `prd` o `.env` en la raíz del repo.
- Acceso SSH al VPS (`vps-dragon@100.120.151.91`, Tailscale) para scripts de monitoreo.
- Contenedor Redis en el VPS: por defecto `infra-redis-1` (override: `REDIS_CONTAINER`).

## Quick start

```bash
npm install
chmod +x scripts/enqueue-test-job.sh scripts/monitor-redis-jobs.sh scripts/monitor-worker-logs.sh scripts/test-worker-e2e.sh

doppler run --project ops-intcloudsysops --config prd -- ./scripts/test-worker-e2e.sh smiletripcare --notify
```

`--notify` encola un job `notify` (suele completar sin GitHub). Sin `--notify`, el job es `cursor` (acción lógica `execute_prompt`) y el worker Cursor requiere un PAT en el orchestrator: **`GITHUB_TOKEN`** (recomendado) o **`GITHUB_TOKEN_N8N`** (legado). Ver `docs/GITHUB-TOKEN.md`.

## Scripts

| Script | Descripción |
|--------|-------------|
| `scripts/enqueue-test-job.ts` | Encola en BullMQ `openclaw`, espera hasta 60s, poll cada 2s. |
| `scripts/enqueue-test-job.sh` | Wrapper con Doppler. |
| `scripts/monitor-redis-jobs.sh` | SSH + `redis-cli` en el VPS: conteos waiting/active/completed/failed. |
| `scripts/monitor-worker-logs.sh` | SSH + `docker logs` del contenedor `opsly_orchestrator` (filtrado). |
| `scripts/test-worker-e2e.sh` | Ejecuta encolado + espera en un solo proceso. |

### Encolar manualmente

```bash
npm run enqueue-test-job -- smiletripcare --notify
# o
doppler run --project ops-intcloudsysops --config prd -- npx tsx --tsconfig scripts/tsconfig.enqueue.json scripts/enqueue-test-job.ts smiletripcare
```

### Monitorear Redis (otra terminal)

```bash
doppler run --project ops-intcloudsysops --config prd -- ./scripts/monitor-redis-jobs.sh openclaw
```

### Monitorear logs del orchestrator

```bash
./scripts/monitor-worker-logs.sh
```

## Estructura del job de prueba

- **Cola BullMQ:** `openclaw` (misma que `apps/orchestrator/src/queue.ts`).
- **Nombre del job (BullMQ):** `cursor` o `notify` (coincide con `OrchestratorJob.type`).
- **execute_prompt (planner):** se materializa como job `cursor` con `payload.planner_tool = "execute_prompt"`.

## Códigos de salida (`enqueue-test-job.ts`)

| Código | Significado |
|--------|-------------|
| 0 | Job `completed` |
| 1 | Error de configuración, fallo al encolar o job `failed` |
| 124 | Timeout 60s sin estado terminal |

## Troubleshooting

### `REDIS_URL not found`

```bash
doppler secrets get REDIS_URL --project ops-intcloudsysops --config prd --plain | wc -c
```

### Redis en VPS

```bash
ssh vps-dragon@100.120.151.91 "docker ps --format '{{.Names}}' | grep -i redis"
```

### Worker no consume (waiting crece)

Comprobar orchestrator: `docker ps | grep orchestrator`, logs `opsly_orchestrator`, y variable `OPSLY_ORCHESTRATOR_ROLE` en el VPS.

### Job `cursor` falla

Configurar `GITHUB_TOKEN` (o `GITHUB_TOKEN_N8N`) en el servicio orchestrator o usar `--notify` para pruebas sin API GitHub.
