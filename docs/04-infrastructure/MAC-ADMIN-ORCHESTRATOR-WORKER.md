# Mac principal (opsly-admin) — Worker del orquestador + herramientas locales (autopilot)

Objetivo: que el **control plane** siga en el **VPS** y tu **Mac** consuma colas BullMQ de forma segura, ejecutando jobs que invocan **Cursor** (HTTP local) u otros endpoints configurados en `config/agent-services.json`.

> Contrasta con **`docs/04-infrastructure/WORKER-SETUP-MAC2011.md`** (worker Ubuntu). Aquí el SO es **macOS** en la misma máquina donde usas Cursor.

## Principios de seguridad

1. **Redis (BullMQ):** misma `REDIS_URL` que en Doppler `prd` / la que use el VPS. Tráfico solo por **Tailscale** o red privada; nunca exponer Redis a Internet público.
2. **Secretos:** `doppler run` (ver `docs/LOCAL-MAC-IMPROVEMENT-PLAN.md` y alias `claude-dop` / `opsly-doppler-run`).
3. **Cursor Agent HTTP:** escucha en **`127.0.0.1`** por defecto (`CURSOR_AGENT_BIND_HOST` para anular solo si entiendes el riesgo).
4. **LLM Gateway:** desde la Mac, apunta `LLM_GATEWAY_URL` al gateway alcanzable (p. ej. IP Tailscale del VPS y puerto `3010`), no hardcodear en el repo.

## Topología mínima

| Componente | Dónde | Rol |
|------------|-------|-----|
| Redis + control plane | VPS | Encolado, TeamManager, API |
| `OPSLY_ORCHESTRATOR_MODE=worker-enabled` | Mac opsly-admin | Workers BullMQ + cola `local-agents` |
| `scripts/cursor-agent-service.ts` | Mac | `POST /execute` → Cursor + `.cursor/responses/` |
| `./scripts/agents-autopilot.sh` | Mac (o VPS según runbook) | Ticks Hermes / smoke / encolados |

## Paso 1 — Red y Doppler

- `tailscale status`: Mac y VPS en el mismo tailnet.
- `doppler login` y proyecto `ops-intcloudsysops` configurado.
- Comprueba que `REDIS_URL` en `prd` es alcanzable desde la Mac (firewall del VPS permitiendo solo Tailscale si aplica).
- Comprueba que `LLM_GATEWAY_URL` u `ORCHESTRATOR_LLM_GATEWAY_URL` apunte a un gateway alcanzable desde la Mac; no uses `http://llm-gateway:3010` fuera de la red Docker del VPS.

## Paso 2 — Comprobación rápida

Desde la raíz del repo:

```bash
./scripts/mac-admin-orchestrator-worker.sh check
```

Debe pasar sin errores críticos (valida `REDIS_URL` vía Doppler y, si existe `redis-cli`, hace `PING`; también prueba `/health` del LLM Gateway configurado).

## Paso 3 — Servicio Cursor (herramientas locales)

Terminal dedicada:

```bash
cd /ruta/al/repo
./scripts/mac-admin-orchestrator-worker.sh cursor-service
```

Por defecto: `http://127.0.0.1:5001` (alineado con `config/agent-services.json`).

## Paso 4 — Worker del orchestrator

Otra terminal:

```bash
cd /ruta/al/repo
./scripts/mac-admin-orchestrator-worker.sh worker
```

Esto ejecuta `run-orchestrator-worker.sh` bajo `doppler run` con `OPSLY_ORCHESTRATOR_MODE=worker-enabled`.

Health local (si el health server está activo en el proceso):

```bash
curl -sS http://127.0.0.1:3011/health | head -c 400
```

## Paso 5 — Autopilot (opcional)

El script ya usa Doppler cuando `USE_DOPPLER=true`:

```bash
cd /ruta/al/repo
./scripts/mac-admin-orchestrator-worker.sh autopilot
```

O directamente: `./scripts/agents-autopilot.sh` (equivale si ya tienes env cargado).

**Orden recomendado al arrancar:** (1) Cursor service → (2) worker → (3) autopilot si lo usas en esta máquina.

## Variables útiles (Doppler / `.env` local gitignored)

- `REDIS_URL` — obligatorio para workers.
- `LLM_GATEWAY_URL` / `ORCHESTRATOR_LLM_GATEWAY_URL` — gateway alcanzable desde el worker (p. ej. `http://100.x.x.x:3010` si está expuesto por Tailscale).
- Concurrencia: `ORCHESTRATOR_CURSOR_CONCURRENCY`, etc. (ver `WORKER-SETUP-MAC2011.md`).

## Referencias

- ADR-020: `docs/adr/ADR-020-orchestrator-worker-separation.md`
- Plan worker/VPS: `docs/04-infrastructure/PLAN-ORCHESTRATOR-WORKER.md`
- Local agents: `AGENTS.md` (Local Agent Execution System)
