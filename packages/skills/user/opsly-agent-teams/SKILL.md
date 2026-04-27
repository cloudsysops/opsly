# Opsly Agent Teams Skill

> **Triggers:** `bullmq`, `queue`, `job`, `worker`, `team`, `parallel`, `orchestration`
> **Priority:** MEDIUM
> **Skills relacionados:** `opsly-quantum`, `opsly-api`, `opsly-llm`

## Cuándo usar

Al encolar trabajo paralelo por especialización (BullMQ) o al extender `TeamManager`.

## Implementación actual

- `apps/orchestrator/src/teams/TeamManager.ts`
- Colas `team:<nombre>`; configs: frontend, backend, ml, infra.
- `assignToTeam(taskType, payload)` elige team por `handles` del tipo de tarea.
- `infra-team` con `max_parallel: 1` (serial).
- Eventos: publicación en bus Redis (`publishEvent`); `index.ts` asigna `deploy` en `tenant.onboarded`.

## Asignación (patrón)

```typescript
await teamManager.assignToTeam('deploy', {
  tenant_slug: 'slug',
  /* payload mínimo */
});
```

Task types de ejemplo: `ui_fix`, `api_fix`, `deploy`, `model_update`, etc. (ver `TEAM_CONFIGS` en el archivo).

## Reglas

- Infra: no paralelizar cambios destructivos sin diseño explícito.
- UI: paralelizar fixes independientes con límite del team.
- ML: desacoplar de backend para no bloquear API crítica.

## Métricas admin

- `GET /api/metrics/teams` — configuración estática / estado (ver implementación actual en `apps/api`).

## Errores comunes

| Error         | Causa                      | Solución                      |
| ------------- | -------------------------- | ----------------------------- |
| Queue full    | Límite paralelos alcanzado | Esperar o ajustar team config |
| Job stuck     | Worker no responde         | Revisar logs worker           |
| Redis timeout | Cola lenta                 | Monitor Redis connection      |

## Testing

```bash
# Ver jobs en cola
redis-cli LLEN bullmq:team:backend

# Ver job status
redis-cli HGETALL bullmq:job:job_xxx

# Test metrics
curl -sf http://localhost:3000/api/metrics/teams
```
