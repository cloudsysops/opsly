---
status: active
owner: operations
last_review: 2026-08-08
type: runbook
tags:
  - opsly/worker
  - opsly/pc-gamer
  - opsly/schedule
---

# PC-gamer — calendario Mauro (gaming vs trabajo)

El PC es de **Mauro**. Opsly solo lo usa cuando no compite con sus juegos.

**Fuente de verdad:** [`config/pc-gamer-schedule.json`](../../config/pc-gamer-schedule.json)  
**CLI:** `./scripts/ops/pc-gamer-schedule.sh`

## Modos

| Modo | Significado | Qué encolar |
|------|-------------|-------------|
| `gaming` | Mauro jugando (o probable) | Solo **light** (o nada). No OpenCode / builds |
| `light` | PC libre a medias | Ollama corto, docs; **no** OpenCode pesado |
| `heavy` | Mauro no lo usa | OpenCode + Ollama + tests |

## Borrador actual (America/Bogota) — confirmar con Mauro

| Día | Heavy | Light | Gaming (estimado) |
|-----|-------|-------|-------------------|
| Lun–Jue | 00:00–08:00 y 23:30–24:00 | 08:00–18:00 | **18:00–23:30** |
| Vie | 00:00–08:00 | 08:00–17:00 | **17:00–24:00** |
| Sáb | 00:00–10:00 | 10:00–14:00 | **14:00–24:00** |
| Dom | 00:00–10:00 y 23:00–24:00 | 10:00–14:00 | **14:00–23:00** |

Marcado **DRAFT** en el JSON hasta que Mauro confirme.

## Comandos

```bash
# ¿Qué modo es ahora?
./scripts/ops/pc-gamer-schedule.sh
./scripts/ops/pc-gamer-schedule.sh --json
./scripts/ops/pc-gamer-schedule.sh --week

# ¿Puedo encolar OpenCode ahora?
./scripts/ops/pc-gamer-schedule.sh --allow opencode
echo $?   # 0 = OK, 2 = bloqueado

# Simular viernes 20:00
./scripts/ops/pc-gamer-schedule.sh --at "2026-08-08T20:00:00-05:00" --json

# Override manual (Mauro avisa "estoy jugando" / "sali")
PC_GAMER_MODE_OVERRIDE=gaming ./scripts/ops/pc-gamer-schedule.sh --json
PC_GAMER_MODE_OVERRIDE=heavy  ./scripts/ops/pc-gamer-schedule.sh --json
```

`enqueue-overnight-opencode.sh` respeta el calendario (bloquea en `gaming`/`light` salvo `--force`).

## Cómo ajustar con Mauro (5 min)

Preguntar:

1. ¿Entre semana a qué hora sueles empezar a jugar?  
2. ¿Hasta qué hora?  
3. ¿Fin de semana distinto?  
4. ¿Hay noches fijas sin PC (trabajo / salir)?

Editar slots en `config/pc-gamer-schedule.json` → quitar nota DRAFT → commit en `feat/pc-gamer-worker-plane`.

Excepción puntual (viaje, LAN party):

```json
"exceptions": [
  {
    "start": "2026-08-15T18:00:00-05:00",
    "end": "2026-08-15T23:00:00-05:00",
    "mode": "heavy",
    "reason": "Mauro fuera — noche heavy extra"
  }
]
```

## Relacionado

- [`OVERNIGHT-OPENCODE-GAMER.md`](./OVERNIGHT-OPENCODE-GAMER.md)
- [`PC-GAMER-WORKER.md`](../04-infrastructure/PC-GAMER-WORKER.md)
