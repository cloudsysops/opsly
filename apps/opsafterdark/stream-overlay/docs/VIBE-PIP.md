# VIBE_PIP — vibe coding dinámico en OBS (OpsAfterDark)

Estado: PREPARADO 2026-10-02, **pendiente aplicar** (requiere OBS cerrado). JOIN_EXISTING #1681 / #1691.

## Problema
- 30/09: Gaming/BF6 mostraban monitor LG completo + mini Dell (privacidad: LIVE_PRIVACY_RISK).
- 01/10: se cambió a Game Capture; en Coding el `Vibe Coding Glass` quedó oculto y Mission Control ocupó su lugar (sin #1691 se ve negro/login). Resultado: "se perdieron" los cuadros.
- Nada se borró (verificado contra 14 backups). Escenas negras = servidores :8765/:4001 apagados o bf6.exe cerrado.

## Diseño (reusa lo existente, sin sistemas nuevos)
- Escena anidada `VIBE_PIP` con Window Capture por ejecutable (priority=2): claude.exe, ChatGPT.exe (Codex), Cursor.exe, WindowsTerminal.exe (OpenCode).
- Coding: VIBE_PIP grande (40,140, bounds 1600×900) + Vibe Coding Glass + Overlay PC + HUD + Alertas. MISSION_CONTROL_DEV_PANEL oculto hasta #1691.
- Gaming y BF6: Game Capture + Overlay PC — Live (tarjeta "BATTLEFIELD 6" CPU/GPU/RAM/FPS) + Vibe Coding Glass + VIBE_PIP 640×360 en (30,1030). Reloj y Marca ocultos (HUD los reemplaza, como 30/09).
- Selector: `stream-overlay/vibe-switch.mjs` (usa `obs.mjs`, mismo patrón que `scene-rotator.mjs`). Señal = `activity.json` `active` → fallback última `tool`.

## Aplicar
1. OBS cerrado (File → Exit). No en vivo.
2. `python3 scripts/restore-scenes-vibe-pip.py` (hace backup `OpsAfterDark.json.bak-pre-restore-*`).
3. Abrir OBS; `obs-doctor.py`; revisar escena por escena.

## Gotcha técnico
OBS 32 guarda `pos_rel/scale_rel/bounds_rel`; si existen, **ganan** sobre `pos/scale/bounds`. Al editar el JSON hay que borrarlos (el script lo hace). Esto explica el incidente "las transformaciones del JSON no se aplicaron".

## Fase 2 (Mission Control → VIBE_PIP)
- #1691 superficie stream-only expone sesión activa (runtime: claude|codex|cursor|terminal), sin secretos, loopback.
- Un adaptador ligero escribe `active` en `activity.json` (o `oad` lo llama); vibe-switch ya reacciona. Aprobación humana para cualquier cambio fuera de VIBE_PIP.

## Modo fijo (pin)
- `run.ps1 vibe pin claude` → `activity.json.pinned = "claude"`; gana sobre todo. `run.ps1 vibe unpin` → automático.
- También se puede fijar desde un agente escribiendo `pinned` en `activity.json` (el vigía lo aplica en ≤3 s). Solo afecta VIBE_PIP.
- Opción `mission` (alias `mc`): muestra MISSION_CONTROL_DEV_PANEL dentro de VIBE_PIP. Hasta #1691 puede verse login/negro.
