---
status: draft
owner: operations
last_review: 2026-08-14
type: runbook
tags:
  - opsly/infrastructure
  - opsly/worker
---

# Horario PC-gamer (Mauro)

Fuente de datos: [`config/pc-gamer-schedule.json`](../../config/pc-gamer-schedule.json).

**Día laboral (desde 2026-09-03):** lun–jue 08:00–18:00 y vie 08:00–17:00 = modo `day` (OpenCode + Ollama corto, concurrency 1). Noches de Mauro siguen `gaming` (no OpenCode). Overnight 23:30–08:00 sigue `heavy`.

El LaunchAgent `com.opsly.pc-gamer-autodispatch` encola `overnight-backlog-triage` en `day` o `heavy`. `overnight-content-studio` sigue siendo solo `heavy`. No encolar a mano en `gaming` salvo `--force` y OK de Mauro.

```bash
./scripts/ops/pc-gamer-schedule.sh --json
./scripts/ops/pc-gamer-schedule.sh --at 02:00 --day mon --json
```

Fail-safe: si no hay bloque, el resolver usa `gaming` (no OpenCode pesado).
Para encolar igual: `enqueue-overnight-opencode.sh --force`.
