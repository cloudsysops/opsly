# Runbook — Incidente: fallo de agente autónomo

**Cuándo usar:** jobs BullMQ con `autonomy_risk` en **medium**/**high**, Cortex / Hive, o workers que ejecutan acciones sin interacción humana directa muestran fallos repetidos, coste inesperado o efectos en tenants.

## Clasificación rápida

| Síntoma | Prioridad inicial |
|---------|-------------------|
| Cola atascada, Redis caído, orchestrator unhealthy | **P1** |
| Bucle de reintentos, un solo tenant afectado | **P2** |
| Solo degradación de modelo / latencia | **P3** |

## Contención (primeros 15 min)

1. **Identificar correlación:** `tenant_slug`, `request_id`, `jobId`, tipo de job (`OrchestratorJob.type`).
2. **Pausar amplificación:** desactivar workers opcionales si aplica (`OPSLY_*_WORKER_ENABLED=false` en Doppler + redeploy) o reducir concurrencia.
3. **Cortex / ticks:** si el origen es `hermes-tick` o Cortex, considerar `OPSLY_CORTEX_DRY_RUN=true` o aumentar `OPSLY_CORTEX_MIN_INTERVAL_MINUTES` (solo con cambio acotado en env; ver `docs/03-agents/AGENT-GUARDRAILS.md`).
4. **Presupuesto LLM:** verificar `DAILY_BUDGET_*` y dashboards de costo; activar bloqueo esperado antes de culpar al modelo.

## Diagnóstico

1. Logs JSON del worker afectado (`worker_fail`, mensaje, stack si existe).
2. Redis: estado de cola BullMQ (profundidad, jobs fallidos).
3. LLM Gateway: 402 presupuesto, 429 proveedor, health `llama_local`.
4. Supabase: filas `platform.*` relevantes (Hermes, feedback) si el job las toca.

## Recuperación

1. Corregir causa raíz (código, config, secreto, cuota).
2. Reprocesar con job idempotente si existe `idempotency_key`.
3. **Rollback de despliegue** si el incidente sigue a un release: imagen GHCR anterior + `docker compose` (ver `docs/runbooks/DEPLOY-GITHUB-ACTIONS.md`).

## Comunicación

- Notificar canal operativo (Discord) con: severidad, tenant(s), mitigación, ETA.
- Post-mortem breve si P1 o repetición en 7 días.

## Referencias

- Políticas por job: [`AUTONOMY-JOB-POLICY-MAP.md`](./AUTONOMY-JOB-POLICY-MAP.md)
- Checklist go-live: [`AUTONOMOUS-PRODUCTION-GO-LIVE-CHECKLIST.md`](./AUTONOMOUS-PRODUCTION-GO-LIVE-CHECKLIST.md)
- Autonomía en workers: [`AGENTS-AUTONOMOUS-RUNBOOK.md`](../03-agents/AGENTS-AUTONOMOUS-RUNBOOK.md)
