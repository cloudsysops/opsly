# Agent training (sandbox)

## Fuente de verdad (no editar en VPS con heredocs)

- **Migraciones:** `supabase/migrations/0023_sandbox_agent_training.sql` + `0024_sandbox_classifier_columns.sql`
- **Clasificador:** `apps/ml/agents/classifier/` (`train.py`, `infer.py`, CSV)
- **Inferencia TS:** `classifyTaskCategory` en `@intcloudsysops/ml`
- **Cola BullMQ:** `agent-classifier` (distinta de `openclaw`), worker opcional

### Evitar (anti-patrones del “prompt full auto”)

1. **No** crear `schema sandbox` con `psql` en SSH: usar `npx supabase db push` desde el entorno enlazado.
2. **No** `git commit` / `cat >>` en `/opt/opsly`: commit en el clon local, `git pull` en el VPS (o Deploy).
3. **No** `curl` manual a Discord: usar `./scripts/notify-discord.sh` (respeta `DISCORD_WEBHOOK_URL`).
4. **No** clasificador mock aleatorio en producción: el worker usa `classifyTaskCategory` (Python + `model.pkl`).

## Worker orchestrator (opcional)

- `OPSLY_AGENT_CLASSIFIER_WORKER_ENABLED=true` — arranca el worker de la cola `agent-classifier`.
- `OPSLY_CLASSIFIER_ALLOWED_TENANTS=intcloudsysops` — restricción de tenant (recomendado en prod).
- La imagen Docker del orchestrator debe incluir **Python 3 + dependencias** del clasificador y el **modelo entrenado**, o el worker fallará al inferir.

Predicciones recientes se guardan en Redis hash `opsly:sandbox:classifier:predictions` (namespace `opsly:sandbox:*`).

Cola exportada en código: `agentClassifierQueue` (`apps/orchestrator/src/queue.ts`).

## Scripts

| Script | Descripción |
|--------|-------------|
| `full-auto.sh` | `type-check` + tests ML + train Python + verify + opcional SSH + Discord |
| `verify-sandbox.sh` | Requiere `DATABASE_URL` o `SUPABASE_DB_URL` + `psql` |
| `rollback-sandbox.sh --confirm` | `DROP SCHEMA sandbox CASCADE` |

## Ejecución típica

```bash
./scripts/agent-training/full-auto.sh --skip-ssh

doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/agent-training/full-auto.sh --skip-ssh
```

## Encolar un job de prueba (requiere worker activo)

Desde Node/TS (o script interno), añadir a la cola `agent-classifier` un job con cuerpo:

```json
{ "taskDescription": "Renew SSL for n8n", "tenantSlug": "intcloudsysops", "request_id": "uuid" }
```
