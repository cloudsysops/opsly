---
status: active
owner: operations
last_review: 2026-09-05
type: runbook
tags:
  - opsly/infrastructure
  - opsly/worker
  - opsly/autodispatch
  - opsly/pc-gamer
---

# PC-gamer — Overnight Autodispatch

Cómo el **Mac operador** descubre que el PC-gamer **encendió** y encola
trabajo solo: no esperes a decirle a un agente en el chat.

Dos LaunchAgents (cada 5 min):

1. `com.opsly.pcgamerwatch` → `scripts/ops/pc-gamer-watch.sh`  
   Tailscale aparece → reconnect `--with-content` → rising edge → autodispatch.
2. `com.opsly.pc-gamer-autodispatch` → Doppler + `overnight-autodispatch.sh`  
   Si ya hay SSH o health, encola backlog.

**Listo ≠ heartbeat Redis.** Un heartbeat stale no dispara trabajo.
Listo = `ssh=true` **o** `health=true`.

**No es un orquestador nuevo** — reutiliza check-online, schedule, enqueue
content-video (`content-studio-enqueue.sh`) y OpenCode (`prompt-submit`).

## Flujo

```text
launchd 5 min
        │
        ├─ pc-gamer-watch.sh
        │     Tailscale offline → wait
        │     Tailscale up + SSH/health down → reconnect --with-content
        │     rising edge (apagado → listo) → overnight-autodispatch.sh
        │
        └─ overnight-autodispatch.sh (Doppler)
              SSH o health? ── no ─► exit 2
              modo gaming? ── sí ─► exit 2
              backlog:
                kind=content_video → cola content-video (Bitsitos/Splashitos)
                kind=opencode → local-agents (solo heavy; no reintenta failed)
```

Canvas Peskids (flags n8n), VPS RAM y Franchise **no** se encolan.

El encolado es **asíncrono**: si el nodo cae justo después de encolar, el job
espera en la cola persistente de Redis y lo toma el worker `local-agents` cuando
vuela. No falla Peskids ni el control plane.

## Archivos nuevos

| Path | Rol |
|------|-----|
| `scripts/ops/overnight-autodispatch.sh` | Orquestador del bucle (flags `--dry-run`/`--force`/`--mode`/`--task`/`--list`/`--reset-state`/`--force-online`) |
| `config/overnight-backlog.json` | Manifiesto de tareas ociosas (`id`, `agent`, `prompt_file`, `min_mode`) |
| `scripts/ops/ensure-overnight-autodispatch-launchd.sh` | Instalar/desinstalar LaunchAgent en el Mac (`--unload`, `--dry-run`) |
| `infra/launchd/com.opsly.pc-gamer-autodispatch.plist` | LaunchAgent: cada 5 min vía Doppler (`__OPSLY_ROOT__` placeholder) |
| `runtime/opencode-overnight/state.json` | Estado de dedupe (gitignored): `queued`/`active`/`failed`/`dry-run`/`done` por tarea |

## Instalación (Mac operador)

```bash
./scripts/ops/ensure-overnight-autodispatch-launchd.sh            # instala + load
./scripts/ops/ensure-overnight-autodispatch-launchd.sh --dry-run  # ensayar
./scripts/ops/ensure-overnight-autodispatch-launchd.sh --unload   # quitar sin borrar archivo
```

El plist corre:

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/overnight-autodispatch.sh
```

`PLATFORM_ADMIN_TOKEN` se inyecta solo por Doppler — nunca vive en el gamer ni
en este checkout.

## Verificación manual

```bash
# qué tareas ofrece el backlog
./scripts/ops/overnight-autodispatch.sh --list
# estado actual del dedupe
cat runtime/opencode-overnight/state.json
# ensayo: forzar online + modo heavy, sin encolar de verdad
PLATFORM_ADMIN_TOKEN=dummy ./scripts/ops/overnight-autodispatch.sh \
  --force-online --mode heavy --dry-run
# reset del dedupe (re-encola en el próximo ciclo)
./scripts/ops/overnight-autodispatch.sh --reset-state
# run real (requiere Doppler con el token real)
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/overnight-autodispatch.sh --force-online --mode heavy
```

### Códigos de salida

| Código | Significado | Acción esperada |
|--------|-------------|-----------------|
| `0` | done (encoló o nada elegible) | — |
| `1` | error infra / falta `PLATFORM_ADMIN_TOKEN` | revisar logs |
| `2` | diferente: offline o modo no permite opencode | **no ruido**: skip, sigue el ciclo |

## Gate de modo (resumen)

`config/overnight-backlog.json` marca cada tarea con `min_mode`: el modo del
calendario debe ser `heavy` (o superior) para encolar opencode, salvo que
`allow_enqueue` incluya `opencode` o se use `--force`. El **DRAFT de Mauro**
(`config/pc-gamer-schedule.json`) solo permite `light`/`ollama_short` por ahora;
hasta confirmarlo, el autodispatch no encolará automáticamente.

Nota operativa: el probe de online tarda **~26 s** cuando el gamer está apagado
(timeout SSH/Tailscale). Es aceptable en un ciclo de 5 min.

## Relacionado

- `docs/04-infrastructure/PC-GAMER-WORKER.md` — plano worker efímero (reglas, `.env.worker`)
- `docs/runbooks/OVERNIGHT-OPENCODE-GAMER.md` — runbook del flujo overnight
- `docs/runbooks/PC-GAMER-MAURO-SCHEDULE.md` — calendario del dueño (DRAFT)
- `docs/04-infrastructure/WORKER-FLOWS.md` — cola `local-agents` / workers
- `docs/runbooks/PRODUCTION-CHANGE-WINDOW.md` — guard de ventana operativa