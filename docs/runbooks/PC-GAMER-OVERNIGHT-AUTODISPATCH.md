---
status: active
owner: operations
last_review: 2026-08-16
type: runbook
tags:
  - opsly/infrastructure
  - opsly/worker
  - opsly/autodispatch
  - opsly/pc-gamer
---

# PC-gamer — Overnight Autodispatch

Cómo el **Mac operador** descubre que el PC-gamer está online y encola
automáticamente trabajo del backlog ocioso (cola BullMQ `local-agents` del VPS),
respetando el **calendario de Mauro** (`config/pc-gamer-schedule.json`: `day` de lunes a viernes, `heavy` de noche, `gaming` al atardecer).

**No es un orquestador nuevo** — reutiliza:

- `check-pc-gamer-online.sh` (detección online: Tailscale + `/health` + heartbeat)
- `pc-gamer-schedule.sh` (modo gaming/light/heavy + allow/deny)
- `enqueue-overnight-opencode.sh` (POST `/api/local/prompt-submit` → VPS Redis)
- Worker BullMQ `local-agents` del nodo (`unified-local-agent-worker.ts`)

## Flujo

```text
launchd cada 5 min (Mac)          (o cron / VPS)
        │
        ▼
./scripts/ops/overnight-autodispatch.sh -- [doppler run]
        │
        ├─ schedule: ¿modo permite opencode?  ── no ─► exit 2 (semaforizado)
        │                                              notify Discord warn
        ├─ online: ¿pc-gamer health OK / heartbeat?  ── no ─► exit 2 (difiere)
        │
        ▼
revisa config/overnight-backlog.json (tareas ociosas, min_mode)
        ▼  por tarea elegible
dedupe vs runtime/opencode-overnight/state.json
        ▼  pasa el gate
enqueue-overnight-opencode.sh  →  cola local-agents (VPS Redis)
        ▼
mark "active" + notify Discord success        (el worker la consume cuando corre)
```

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

`config/overnight-backlog.json` marca cada tarea con `min_mode`. Modo `day` o `heavy`
permite OpenCode. `gaming` no. Lun–vie diurno usa `day`.

Nota operativa: el probe de online tarda **~26 s** cuando el gamer está apagado
(timeout SSH/Tailscale). Es aceptable en un ciclo de 5 min.

## Relacionado

- `docs/04-infrastructure/PC-GAMER-WORKER.md` — plano worker efímero (reglas, `.env.worker`)
- `docs/runbooks/OVERNIGHT-OPENCODE-GAMER.md` — runbook del flujo overnight
- `docs/runbooks/PC-GAMER-MAURO-SCHEDULE.md` — calendario del dueño (DRAFT)
- `docs/04-infrastructure/WORKER-FLOWS.md` — cola `local-agents` / workers
- `docs/runbooks/PRODUCTION-CHANGE-WINDOW.md` — guard de ventana operativa