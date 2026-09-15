---
id: night-merge-inform-011
status: held
hold_reason: held for isolated Mac engineering-loop E2E smoke; avoid Discord/rebase side effects during smoke
owner: opsly-night-agent
created: 2026-09-09
requires_pr: false
---

# Informe — no esperes órdenes humanas

Cada 10 minutos (launchd) o cuando n8n dispare esta cola: **informa**, no preguntes.

Comprueba y manda Discord (`./scripts/notify-discord.sh`) con:

1. Hora Bogotá y si estamos en ventana 22:00–06:00
2. `origin/main` SHA corto
3. PRs abiertos con label `night-merge` (número + MERGEABLE + npm audit)
4. Último run **Night merge** y **Deploy** (`gh run list`)
5. Si existe `revert/night-merge-*` abierto: **no mergear**; explicar si es timeout de Deploy o smoke real

Si hay un FAILURE de npm audit en un PR etiquetado, rebase sobre `origin/main` (post-#1154) en worktree limpio. Si hay CONFLICTING, quitar `night-merge` y avisar.

No esperes confirmación en el chat. Deja «Respuesta agente» aquí.
