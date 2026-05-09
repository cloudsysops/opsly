# Runbook — Ventana de observación Cortex (24–48 h)

**Objetivo:** validar estabilidad del orquestador y calidad de intents tras activar **Cortex en modo seguro**, sin ampliar superficie de riesgo.

## Pre-requisitos

- Control plane con `shouldRunControlPlane` y Redis/BullMQ sanos (`./scripts/autonomy-redis-smoke.sh`).
- `ORCHESTRATOR_LLM_GATEWAY_URL` apuntando a llm-gateway alcanzable.
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
