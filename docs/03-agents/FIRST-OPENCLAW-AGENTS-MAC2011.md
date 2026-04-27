# Primeros agentes OpenClaw en el worker Mac 2011

Guía corta para dejar **consumiendo la cola `openclaw`** al orchestrator en el hardware Ubuntu del Mac 2011. Detalle amplio: [`WORKER-SETUP-MAC2011.md`](WORKER-SETUP-MAC2011.md), [`ARCHITECTURE-DISTRIBUTED.md`](ARCHITECTURE-DISTRIBUTED.md), [`ORCHESTRATOR.md`](ORCHESTRATOR.md).

## Qué significa «agente» aquí

En OpenClaw/Opsly, en el **modo worker** (`OPSLY_ORCHESTRATOR_MODE=worker-enabled`) el proceso arranca los **workers BullMQ** que ejecutan jobs: `cursor`, `n8n`, `notify`, `drive`, `ollama`, etc. ([`apps/orchestrator/src/index.ts`](../apps/orchestrator/src/index.ts)).

Los **cuatro equipos** del `TeamManager` (frontend/backend/ml/infra) solo se crean en el **control plane** (VPS con `control` / `queue-only`). En el Mac 2011 **no** verás esas colas `team-*`; es normal.

## Nombre SSH: `opsly-mac2011` vs `opsly-worker`

En la wiki usamos **`opsly-worker`** + MagicDNS ([`TAILSCALE-NOMENCLATURA.md`](TAILSCALE-NOMENCLATURA.md)). Si en tu `~/.ssh/config` el host se llama **`opsly-mac2011`**, es el mismo equipo: sustituye el nombre en los comandos.

Usuario Linux típico: **`opslyquantum`**. IP de referencia Tailscale: **`100.80.41.29`**.

## Checklist previo

| Paso      | Comando / acción                                                                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tailscale | `tailscale status` — debe verse el worker                                                                                                           |
| Repo      | `~/opsly` o `~/proyectos/intcloudsysops` con `git pull --ff-only` y `npm ci`                                                                        |
| Node      | Alineado al monorepo (ver `.nvmrc` / `docs/WORKER-SETUP-MAC2011.md`)                                                                                |
| Redis     | Misma **`REDIS_URL`** que Doppler `ops-intcloudsysops` / `prd` (el worker debe alcanzar Redis del VPS por red/Tailscale; no pegues la URL en chats) |
| VPS       | Con **`OPSLY_ORCHESTRATOR_MODE=queue-only`** (o `OPSLY_ORCHESTRATOR_ROLE=control`) para no duplicar workers en el mismo Redis                       |

## 1. Variables en el worker

Crea o fusiona en el clon del worker (archivos **gitignored**):

- Copia [`worker-env.local.example`](worker-env.local.example) → `~/opsly/.env.local`, **o** usa **`.env.worker`** cargado por [`scripts/start-workers-mac2011.sh`](../scripts/start-workers-mac2011.sh).

Mínimo:

- `REDIS_URL` — obligatorio para BullMQ.
- `OPSLY_ORCHESTRATOR_MODE=worker-enabled`
- `LLM_GATEWAY_URL` — URL del gateway alcanzable desde el worker (p. ej. `http://100.120.151.91:3010` si el puerto está accesible por Tailscale; ajusta según tu red).

Opcional según qué workers uses: claves API, `DISCORD_WEBHOOK_URL`, tokens GitHub para jobs `cursor`, etc.

## 2. Ollama (tareas locales / `llama_local`)

Modelo por defecto del gateway: **`nemotron-3-nano:4b`** (ver `OLLAMA_MODEL` en Doppler y [`download-ollama-models.sh`](../scripts/download-ollama-models.sh)).

En el worker:

```bash
ollama pull nemotron-3-nano:4b
# o, si Ollama va en Docker:
# docker exec <contenedor-ollama> ollama pull nemotron-3-nano:4b
```

## 3. Arrancar los workers

Desde la raíz del repo en el **Mac 2011**:

```bash
cd ~/opsly
./scripts/start-workers-mac2011.sh --dry-run   # solo imprime qué haría
./scripts/start-workers-mac2011.sh
```

Para dejar el proceso en segundo plano: [`keep-worker-in-tmux.sh`](../scripts/keep-worker-in-tmux.sh) o systemd ([`WORKER-SERVICE-MAC2011.md`](WORKER-SERVICE-MAC2011.md)).

## 4. Comprobar salud del orchestrator

Por defecto el health escucha en **`ORCHESTRATOR_HEALTH_PORT`** (3011 si no cambias nada):

```bash
curl -sf "http://127.0.0.1:3011/health"
```

Debe reflejar rol/modo worker (ver [`ORCHESTRATOR.md`](ORCHESTRATOR.md)).

## 5. Primera prueba end-to-end (desde la Mac principal o CI)

Con **Doppler** y un tenant real (p. ej. `smiletripcare`):

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/test-worker-e2e.sh smiletripcare --notify
```

`--notify` encola un job **`notify`**, suele completar aunque Discord no esté configurado (comportamiento documentado en [`enqueue-test-job.ts`](../scripts/enqueue-test-job.ts)). Sin `--notify` el job es tipo **`cursor`** y requiere tokens GitHub en el entorno del worker.

Observa logs del proceso orchestrator en el Mac 2011: debería aparecer actividad del worker correspondiente.

## 6. Ajuste de perfil IA (opcional)

[`scripts/apply-ai-profile-all.sh`](../scripts/apply-ai-profile-all.sh) referencia el host SSH **`opsly-mac2011`**. Si tu `Host` en `~/.ssh/config` es **`opsly-worker`**, unifica nombres o pasa el host que uses al automatizar.

## 7. Squad local Ollama (produccion)

Para llevar el worker a modo productivo, encola un squad completo:

```bash
PLATFORM_ADMIN_TOKEN=... ./scripts/create-ollama-local-agents.sh \
  --tenant smiletripcare \
  --goal "Subir throughput y bajar costo por tenant" \
  --profile production
```

Perfiles disponibles:

- `core`: `planner`, `executor`, `notifier`
- `production`: `core` + `reviewer`, `sre_guard`, `cost_optimizer`, `growth_operator`

Tip: usa `--dry-run` para revisar payloads antes de encolar.

## Referencias rápidas

| Tema                               | Doc                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| Redis + roles control/worker       | [`ARCHITECTURE-DISTRIBUTED.md`](ARCHITECTURE-DISTRIBUTED.md)                               |
| Cola, jobs, prioridades            | [`ORCHESTRATOR.md`](ORCHESTRATOR.md)                                                       |
| MCP / tools (otro frente OpenClaw) | [`QUICKSTART-AGENTS.md`](QUICKSTART-AGENTS.md)                                             |
| ADR Ollama worker                  | [`adr/ADR-024-ollama-local-worker-primary.md`](adr/ADR-024-ollama-local-worker-primary.md) |
