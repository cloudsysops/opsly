# ADR-015: Hermes como servicio Docker separado

## Estado

Aceptado (infra Sprint 0+)

## Contexto

El orquestador OpenClaw (`apps/orchestrator`) ejecuta múltiples workers BullMQ. **Hermes** añade un flujo multi-agente (NotebookLM, decisiones, métricas) sobre la cola `hermes-orchestration` (`HermesOrchestrationWorker`).

Ejecutar Hermes en el **mismo proceso** que el resto de workers es válido en entornos pequeños, pero separar **imagen y contenedor** aporta:

- Aislamiento de fallos y límites de recursos (Python / Playwright / Chromium).
- Imagen versionada (`intcloudsysops-hermes`) con despliegue y rollback independientes.
- Escalado horizontal futuro (N réplicas del worker Hermes).

## Decisión

1. **Imagen** `ghcr.io/cloudsysops/intcloudsysops-hermes` construida desde **`Dockerfile.hermes`** en la raíz del monorepo.
2. **Runtime**: no se ejecuta `apps/orchestrator/dist/index.js` en este contenedor (evitar duplicar cursor, n8n, etc.). En su lugar:
   - `infra/hermes/hermes-register-repeat.cjs` registra el job repetible BullMQ `hermes-tick` (equivalente a la lógica de `index.ts` cuando `HERMES_ENABLED=true` y control plane).
   - `infra/hermes/hermes-worker-standalone.cjs` arranca el health HTTP existente (`startOrchestratorHealthServer`) y **solo** `startHermesOrchestrationWorker` (scripts CommonJS porque el `tsc` del orquestador emite CJS).
3. **Puerto HTTP**: el health server usa la variable **`ORCHESTRATOR_HEALTH_PORT`**. Valor por defecto en imagen: **3020** (el servicio interno `context-builder` ya usa **3012** en la red Docker; evitar colisión de puertos entre contenedores).
4. **Mapeo host**: `127.0.0.1:${HERMES_HOST_PORT:-3012}:3020` — smoke y comprobaciones locales pueden usar **`http://127.0.0.1:3012/health`** en el VPS con valores por defecto.
5. **Orquestador principal**: con el servicio `hermes` activo, configurar **`HERMES_ENABLED=false`** en el servicio `orchestrator` (Doppler / `.env`) para no registrar **dos** workers `HermesOrchestrationWorker` en el mismo host. El registro del repeat lo hace el contenedor Hermes al iniciar.

## Consecuencias

- **CI/CD**: `deploy.yml` construye y publica la imagen Hermes junto al resto; los jobs SSH hacen `pull`/`up` de `hermes`.
- **Variables**: mismas bases que el orquestador (Redis, Supabase, LLM Gateway, etc.) vía `env_file` y `environment` en `infra/docker-compose.platform.yml`.
- **NotebookLM**: la imagen incluye Python + `notebooklm-py` + Playwright Chromium para alinear con ADR-014; tamaño de imagen mayor que el orquestador base.
- **Override local**: `infra/docker-compose.hermes.yml` añade `build` para `docker compose -f docker-compose.platform.yml -f docker-compose.hermes.yml`.

## Relacionado

- ADR-014 (NotebookLM / notebooklm-py)
- `docs/HERMES-SPRINT-PLAN.md` (si existe en rama)
- `Dockerfile.hermes`, `infra/hermes/*.cjs`, `scripts/hermes-smoke-test.sh`

---

## Related Documents
[[MASTER-PLAN]] | [[ARCHITECTURE]] | [[HERMES-SPRINT-PLAN]] | [[NOTEBOOKLM-INTEGRATION]]
