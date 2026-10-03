---
status: active
owner: operations
last_review: 2026-10-02
tags: [opsly/streaming, opsafterdark, handoff]
related: ["#1681", "#1691", "#1692"]
---
# OpsAfterDark — HANDOFF para agentes (leer primero)

Estado verificado al 2026-10-02. Si algo de aquí contradice lo que ves, **verifica el estado real** antes de actuar.

## Mapa de piezas (dónde vive cada cosa)
| Pieza | Dónde | Canónico |
|---|---|---|
| Colección OBS | **única**: `%APPDATA%/obs-studio/basic/scenes/OpsAfterDark.backup-opencode-20261002-213403.json` (nombre interno `OpsAfterDark`; es el archivo que OBS carga). El antiguo `OpsAfterDark.json` quedó como `*.stale-*.bak` (2026-10-03) | OBS 32.2.2, PC Gamer Windows |
| Plantilla sanitizada | `obs/OpsAfterDark.scene-collection.template.json` | este repo |
| Overlays :8765 | `local-tools/server.mjs` (en el PC: OneDrive/Documents/ChatGPT/intcloudsysops/stream-overlay) | `run.ps1` lo levanta (Ensure-Server); `start-stream-tools.vbs` al iniciar Windows |
| Mission Control :4001 | `apps/admin` (Next 15) — `mission-control/live` en rama `feat/opsafterdark-tenant` (worktree WSL) | #1691 pendiente: vista stream-only |
| Multistream | plugin obs-multi-rtmp → destino `YouTube` | `docs/MULTISTREAM-YOUTUBE.md` |
| Vibe coding dinámico | escena `VIBE_PIP` + `local-tools/vibe-switch.mjs` | `docs/VIBE-PIP.md` |
| Auditoría | `setup/obs-doctor.py <colección.json> [stream.config.json]` | read-only |
| Clips | `CLIPS-RUNBOOK.md` | Twitch → TikTok/YT/IG |

## Reglas duras
- **LIVE = audita, no mutes.** Verifica botón "Stop Streaming"/timers antes de tocar OBS.
- Nunca "Launch Anyway" (2.ª instancia OBS → Game Capture negro).
- Editar el JSON de escenas **solo con OBS cerrado**, backup antes; borrar `pos_rel/scale_rel/bounds_rel` al mover items.
- Gameplay nunca con captura de monitor visible. `gaming 2` = SUPERSEDED.
- Sin secretos: stream key, contraseña obs-websocket, tokens, cookies, VNC → nunca en repo, logs ni chat.
- `factory` = NOT_CONFIGURED hasta validar `OAD_FACTORY_FOCUS` con #1691. No reutilizar :8765 para Mission Control.
- No declarar READY sin grabación local verificada.
- Publicar en redes / ir en vivo = aprobación humana explícita.

## "Las escenas están en negro"
No es configuración perdida (verificado contra 14 backups). Comprobar en orden:
1. `:8765` arriba (`run.ps1 preflight` o `curl 127.0.0.1:8765/starting`).
2. `:4001` arriba (Mission Control).
3. `bf6.exe` abierto (Game Capture), OpenCode/Claude/ChatGPT/Cursor abiertos y no minimizados (VIBE_PIP).
4. Si los servidores se levantaron con OBS abierto: cerrar y abrir OBS (recarga browser sources).

## Escenas añadidas 2026-10-03
- `CODING_4`: 2×2 Claude | Cursor / ChatGPT | OpenCode (WGC), recorte de sidebars, cortina de privacidad oculta (Fondo/Texto BRB). Script: `setup/add-coding4.py`.
- `CHATGPT_VOICE` corregido a ChatGPT.exe (antes capturaba todo chrome.exe → eco del propio stream).

## Pendientes (prioridad)
1. Aplicar `setup/restore-scenes-vibe-pip.py` (OBS cerrado) → validar escena por escena.
2. Servicios persistentes para :8765 y :4001 (systemd --user en WSL o tarea de Windows), sin secretos en units.
3. Grabación local de prueba (Gaming → Coding → Factory → ChatGPT → mic → juego) → READY.
4. #1691 superficie stream-only `/mission-control/stream` (loopback, read-only) + escribir `active` en `activity.json` para VIBE_PIP.
5. Diseño retro Game Boy aprobado como dirección visual (ver `docs/MISSION-CONTROL-RETRO.md`).
6. Audio Windows por app: bf6 → HyperX, ChatGPT → Realtek (manual).
7. Acceso remoto: TightVNC (Windows) solo vía Tailscale; nunca abrir 5900 a internet.
