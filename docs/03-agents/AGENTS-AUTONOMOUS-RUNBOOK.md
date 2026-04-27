# Runbook: agentes OpenClaw en modo autónomo

**Autónomo** aquí significa: **cola BullMQ `openclaw` siempre consumida** por el orchestrator en modo **worker** (`OPSLY_ORCHESTRATOR_MODE=worker-enabled`), con **Redis** del VPS y **LLM Gateway** alcanzable (Ollama u otros proveedores según `OLLAMA_URL`).

No implica “IA sin supervisión”: los jobs siguen entrando por API, Hermes, n8n, MCP o scripts (`enqueue-ollama-squad.ts`). Este documento deja **el motor** encendido y verificable.

---

## 1. Topología mínima

| Rol                  | Dónde                               | Qué hace                                                              |
| -------------------- | ----------------------------------- | --------------------------------------------------------------------- |
| **Control plane**    | VPS `/opt/opsly`                    | Redis, API, Traefik, opc. orchestrator `queue-only` / TeamManager     |
| **Worker plane**     | Mac 2011 / `opslyquantum` `~/opsly` | Proceso orchestrator con **workers** (cursor, ollama, n8n, notify, …) |
| **Inferencia local** | Mismo worker o Docker               | Ollama `:11434`; el gateway usa `OLLAMA_URL`                          |

Detalle: [`ARCHITECTURE-DISTRIBUTED.md`](ARCHITECTURE-DISTRIBUTED.md), [`ORCHESTRATOR.md`](ORCHESTRATOR.md).

---

## 2. Variables del worker (gitignored)

Plantilla: [`worker-env.local.example`](worker-env.local.example) → copiar a `~/opsly/.env.local` o usar **`.env.worker`** con [`start-workers-mac2011.sh`](../scripts/start-workers-mac2011.sh).

Obligatorio:

- `REDIS_URL` — misma lógica que Doppler `prd` (VPS Redis).
- `OPSLY_ORCHESTRATOR_MODE=worker-enabled`
- `LLM_GATEWAY_URL` — URL del gateway alcanzable desde el worker (p. ej. `http://100.120.151.91:3010` vía Tailscale).

Opcional pero recomendable:

- `ORCHESTRATOR_OLLAMA_CONCURRENCY=1` (o más si el hardware aguanta)
- En el **servidor del gateway** (VPS): `OLLAMA_URL` apuntando al Ollama del worker si usáis routing `cheap` → `llama_local` ([ADR-024](adr/ADR-024-ollama-local-worker-primary.md))

---

## 3. Arranque persistente (recomendado: systemd)

En el worker Linux:

```bash
cd ~/opsly
./scripts/git-sync-repo.sh "$HOME/opsly" main
chmod +x scripts/install-opsly-worker-systemd.sh scripts/manage-worker.sh
sudo ./scripts/install-opsly-worker-systemd.sh
sudo systemctl enable --now opsly-worker
```

Gestión: [`WORKER-SERVICE-MAC2011.md`](WORKER-SERVICE-MAC2011.md), [`manage-worker.sh`](../scripts/manage-worker.sh).

**Sin systemd:** [`keep-worker-in-tmux.sh`](../scripts/keep-worker-in-tmux.sh) o `./scripts/start-workers-mac2011.sh`.

---

## 4. Ollama (Docker o binario)

- Compose opcional: [`infra/docker-compose.opslyquantum.yml`](../infra/docker-compose.opslyquantum.yml) servicio `ollama`.
- Modelo por defecto del gateway: `nemotron-3-nano:4b` (ver `OLLAMA_MODEL` / [`download-ollama-models.sh`](../scripts/download-ollama-models.sh)).

---

## 5. Verificación rápida

En el **worker** (proceso orchestrator escuchando en `3011` por defecto):

```bash
curl -sf http://127.0.0.1:3011/health
```

Debe incluir `"role":"worker"` y `"mode":"worker-enabled"`.

Si `systemctl is-active opsly-worker` muestra `activating`, espera unos segundos o revisa `journalctl -u opsly-worker -n 50`.

Stack distribuido (VPS + worker): [`verify-distributed-stack.sh`](../scripts/verify-distributed-stack.sh) — ajusta `WORKER_SSH` si tu host no es `opsly-mac2011`:

```bash
WORKER_SSH=opslyquantum@100.80.41.29 ./scripts/verify-distributed-stack.sh
```

---

## 6. Meter trabajo en la cola (los “agentes” trabajan cuando hay jobs)

| Origen            | Notas                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| **Smoke**         | `doppler run ... ./scripts/test-worker-e2e.sh <tenant> --notify` (job `notify`)               |
| **Squad Ollama**  | `npx tsx scripts/enqueue-ollama-squad.ts --tenant <slug> --goal "..."` (varios jobs `ollama`) |
| **Hermes / cron** | Tareas que encolan a OpenClaw cuando corresponde (ver `HermesOrchestrator`)                   |
| **MCP / API**     | Según rutas y tokens de plataforma                                                            |

Configuración declarativa del equipo (roles, presupuestos, herramientas): [`config/agents-team.json`](../config/agents-team.json) y **Admin** `/agents-team`; **API** `GET /api/agents/team` (solo sesión admin).

---

## 6.1 Autopilot continuo (Hermes + Ollama squad + smoke)

Para dejar agentes trabajando en bucle sin intervención manual:

```bash
# Arranca en background (nohup + pid file en logs/)
TENANT_SLUG=smiletripcare \
GOAL="Mantener plataforma multi-agente estable y eficiente" \
PLAN=business \
INTERVAL_SECONDS=300 \
./scripts/start-agents-autopilot.sh

# Estado
./scripts/status-agents-autopilot.sh

# Stop limpio
./scripts/stop-agents-autopilot.sh
```

El loop (`scripts/agents-autopilot.sh`) ejecuta por ciclo:

1. `npm run hermes:tick --workspace=@intcloudsysops/orchestrator`
2. `npx tsx scripts/enqueue-ollama-squad.ts ...`
3. `./scripts/test-worker-e2e.sh <tenant> --notify` (si `ENABLE_WORKER_SMOKE=true`)

Por defecto usa `doppler run --project ops-intcloudsysops --config prd` si la CLI está disponible.

---

## 7. Tras cada `git pull` en el worker

```bash
cd ~/opsly && git pull --ff-only origin main && npm ci
sudo systemctl restart opsly-worker   # si usas systemd
```

---

## Referencias

- Primera puesta en marcha agentes: [`FIRST-OPENCLAW-AGENTS-MAC2011.md`](FIRST-OPENCLAW-AGENTS-MAC2011.md)
- Plan Ollama worker: [`PLAN-OLLAMA-WORKER-2026-04-14.md`](PLAN-OLLAMA-WORKER-2026-04-14.md)
- Git sync en todos los clones: [`SESSION-GIT-SYNC.md`](SESSION-GIT-SYNC.md), [`git-sync-repo.sh`](../scripts/git-sync-repo.sh)
