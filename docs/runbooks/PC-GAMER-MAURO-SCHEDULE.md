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

Fuente de datos: [`config/pc-gamer-schedule.json`](../../config/pc-gamer-schedule.json) — **DRAFT** hasta confirmar horas con Mauro.

```bash
./scripts/ops/pc-gamer-schedule.sh --json
./scripts/ops/pc-gamer-schedule.sh --at 02:00 --day mon --json
```

Fail-safe: si no hay bloque, el resolver usa `gaming` (no OpenCode pesado).
Para encolar igual: `enqueue-overnight-opencode.sh --force`.
