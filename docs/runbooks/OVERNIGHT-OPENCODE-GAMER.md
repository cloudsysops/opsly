---
status: active
owner: operations
last_review: 2026-08-14
type: runbook
tags:
  - opsly/infrastructure
  - opsly/worker
  - opsly/agents
---

# Overnight OpenCode + Cursor en cola local-agents

Cómo disparar trabajo de agentes sin una sesión de chat viva.

## Piezas

| Pieza | Dónde | Cómo |
| --- | --- | --- |
| Encolar | Mac | `POST /api/local/prompt-submit` en orchestrator VPS `:3011` (Tailscale) |

El orchestrator vive en la red Compose `internal` (`internal: true`), que **bloquea docker-proxy**. Para que `ORCHESTRATOR_EXPORT_BIND` publique `:3011` hay que unirlo también a `redis_edge` (igual que `llm-gateway`). Health esperado:

```bash
curl -sf http://100.120.151.91:3011/health
# {"status":"ok","service":"orchestrator","role":"control","mode":"queue-only"}
```
| Cursor bridge | Mac launchd `com.opsly.cursor-agent-service` | `:5001` |
| Worker local-agents | Mac (esta máquina) | `scripts/ops/start-mac-local-agents-worker.sh` |
| OpenCode overnight | PC-gamer WSL | `scripts/ops/pc-gamer-opencode-plane.sh --up --install-autostart` |
| Horario Mauro | `config/pc-gamer-schedule.json` | `pc-gamer-schedule.sh` (DRAFT) |

## Encolar (Mac)

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/enqueue-overnight-opencode.sh \
  --agent cursor \
  --prompt-file scripts/ops/prompts/overnight-backlog-triage.md \
  --force
```

Sin `--force`, el script respeta el modo `gaming`/`light`/`heavy`. Viernes noche suele ser `gaming` → hay que `--force`.

## Bootstrap PC-gamer (WSL)

```bash
cd ~/opsly
git pull --ff-only origin feat/pc-gamer-agent-plane
./scripts/ops/pc-gamer-docker-plane.sh --up --use-host-ollama --install-autostart
./scripts/ops/pc-gamer-opencode-plane.sh --up --install-autostart
```

`--use-host-ollama` evita el driver NVIDIA en Docker (fallo típico en WSL).

## Watcher Mac

`com.opsly.pcgamerwatch` cada 5 min llama `pc-gamer-reconnect.sh --use-host-ollama --with-opencode`.
Si queda en SKIP: `echo 0 > ~/Library/Logs/opsly/pc-gamer-watch.state`.

## Worker Mac (esta máquina)

Doppler `REDIS_URL` usa el hostname Docker `redis`. El script lo reescribe a `100.120.151.91`.

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/start-mac-local-agents-worker.sh
```

Allowlist `local-agents` only. Health local en `:3018` (el VPS ya tiene `:3011`).

## Smoke (2026-08-14)

1. `GET http://100.120.151.91:3011/health` → `queue-only`
2. `POST /api/local/prompt-submit` agent `cursor` → **202** `job_type=local_cursor`
3. Worker Mac tomó el job e invocó `http://127.0.0.1:5001/execute`
4. El bridge escribe `.cursor/prompts/pending/prompt-<job>.md` y responde **202 accepted** (sin `content`). El worker **sigue activo** hasta `./scripts/ops/complete-cursor-job.sh --job-id <uuid> --content "…"` o `POST :5001/complete`.
5. Mac consume solo `OPSLY_LOCAL_AGENT_KINDS=local_cursor`. PC-gamer OpenCode solo `local_opencode`.

El orchestrator en Compose debe estar en `redis_edge` (no solo `internal: true`) y montar `/opt/opsly/config` (registry + runtime-governor). Sin eso, `:3011` no publica o `POST` responde 500.
