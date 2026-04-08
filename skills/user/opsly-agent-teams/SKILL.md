# Opsly Agent Teams Skill

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
await teamManager.assignToTeam("deploy", {
  tenant_slug: "slug",
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
