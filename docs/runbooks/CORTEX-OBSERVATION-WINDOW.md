---
status: draft
owner: operations
last_review: 2026-05-24
type: runbook
tags:
  - opsly/runbook
---

# Runbook — Ventana de observación Cortex (24–48 h)

**Objetivo:** validar estabilidad del orquestador y calidad de intents tras activar **Cortex en modo seguro**, sin ampliar superficie de riesgo.

## Activación en producción (VPS + Doppler)

1. **Doppler** (`ops-intcloudsysops` / `prd`): definir al menos:
   - `OPSLY_CORTEX_ENABLED=true` (arranque real) o empezar con `OPSLY_CORTEX_DRY_RUN=true` unas horas sin encolar jobs.
   - `OPSLY_CORTEX_INTERVAL_MINUTES` y `OPSLY_CORTEX_MIN_INTERVAL_MINUTES` ≥ **15** (recomendado).
   - `OPSLY_CORTEX_MAX_ENQUEUES_PER_HOUR` acotado (p. ej. `8`).
   - Opcional: `OPSLY_ROOT=/opt/opsly` (o la ruta del clon en el host) para que Cortex lea/escriba `runtime/context/system_state.json` montado o coherente con el repo.
   - Para consumir jobs `sandbox_execution` en la cola `openclaw`: `OPSLY_SANDBOX_WORKER_ENABLED=true` (requiere Docker y `scripts/run-in-sandbox.sh` en el cwd del proceso).
2. **VPS:** regenerar `.env` desde Doppler (p. ej. `./scripts/vps-bootstrap.sh` según runbook del repo) y comprobar que las claves anteriores aparecen en `/opt/opsly/.env` **sin pegar valores en chat ni en tickets públicos**.
3. **Rol orchestrator:** el contenedor de control plane debe ejecutar con rol que incluya control plane (por defecto en VPS: sin forzar solo `worker`; ver `OPSLY_ORCHESTRATOR_ROLE` / `OPSLY_ORCHESTRATOR_MODE` en tu `.env`).
4. **Despliegue:** recrear el servicio para cargar env nuevo, p. ej. desde `infra/` con el mismo `--env-file` que usáis en deploy:
   - `docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml up -d --no-deps --force-recreate orchestrator`
5. **Verificación:** logs del contenedor `opsly_orchestrator` deben mostrar algo como `OpslyCortex enabled interval_min=…` cuando `OPSLY_CORTEX_ENABLED=true`; health `http://127.0.0.1:3011/health` (o vía Traefik) **200**.

**Rollback:** en Doppler poner `OPSLY_CORTEX_ENABLED=false` o `OPSLY_CORTEX_DRY_RUN=true`, volver a bootstrap/recreate del orchestrator.

## Pre-requisitos

- Control plane con `shouldRunControlPlane` y Redis/BullMQ sanos (`./scripts/autonomy-redis-smoke.sh`).
- `ORCHESTRATOR_LLM_GATEWAY_URL` apuntando a llm-gateway alcanzable (en compose plataforma suele ser `http://llm-gateway:3010` dentro de la red Docker).
- Variables recomendadas (ver `apps/orchestrator/.env.example`):
  - `OPSLY_CORTEX_ENABLED=true`
  - `OPSLY_CORTEX_INTERVAL_MINUTES` y `OPSLY_CORTEX_MIN_INTERVAL_MINUTES` ≥ **15**
  - `OPSLY_CORTEX_MAX_ENQUEUES_PER_HOUR` acotado (p. ej. 8)
  - Primera subida: `OPSLY_CORTEX_DRY_RUN=true` durante 2–4 h, luego revisar logs y desactivar dry-run solo si no hay loops ni ruido.

## Checklist hora 0

- [ ] Snapshot de `runtime/context/system_state.json` (`autonomy_kpis`).
- [ ] `docker compose` / health orchestrator + llm-gateway **200**.
- [ ] Trazas JSON de `job_enqueue` / Cortex en logs sin errores repetidos.

## Durante 24–48 h (muestreo cada 8–12 h)

| Comprobar | Criterio OK |
|-----------|-------------|
| Proceso orchestrator | Sin reinicios inesperados; CPU estable |
| Intents / jobs | Cada intent tiene `tenant_slug` + `request_id` trazable |
| Cola BullMQ | Sin backlog anómalo en colas críticas |
| LLM gateway | Sin 5xx sostenidos; degradado search explícito si aplica |
| Loops | No más de N encolados/hora según `OPSLY_CORTEX_MAX_ENQUEUES_PER_HOUR` |
| Goal → backlog | Al menos un evento `goal_backlog_sync_*` coherente por día estratégico |

## Cierre ventana

- Actualizar `autonomy_kpis` en `runtime/context/system_state.json` (`cortex_observation_last_at`, nota breve).
- Registrar en `AGENTS.md` (bloque 🔄) resultado y bloqueantes.
- Pasar checklist [`docs/plans/AUTONOMY-GO-NO-GO-WEEKLY.md`](../plans/AUTONOMY-GO-NO-GO-WEEKLY.md) antes de ampliar autonomía.

## Rollback rápido

```bash
# En .env del orchestrator
OPSLY_CORTEX_ENABLED=false
# o solo congelar efectos:
OPSLY_CORTEX_DRY_RUN=true
```

Recrear contenedor / reiniciar proceso orchestrator tras cambiar env.

---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[brain/README|Brain Central]]
