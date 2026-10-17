# OBS — colección OpsAfterDark (reproducible en otro PC)

`OpsAfterDark.scene-collection.template.json` es la colección real del PC Gamer **sin datos de la máquina**:
IDs de monitor/audio → `{{MONITOR_ID}}`, `{{DEVICE_ID}}`, `{{DesktopAudioDevice1}}`, `{{AuxAudioDevice1}}`; NDI → `{{NDI_NAME}}`; hotkeys vacíos.
**No contiene** stream key ni contraseña de WebSocket (viven en el *perfil*, que nunca se versiona).

## Importar en un PC nuevo
1. OBS → *Scene Collection → Import* → este JSON → activarlo.
2. *Settings → Audio*: Desktop Audio = **Disabled**; Mic/Aux = tu micrófono (renombrar a `MIC_OPERATOR`).
3. Re-seleccionar en cada fuente: Game Capture `[bf6.exe]`, Window Capture (OpenCode), GAME_AUDIO `bf6.exe`, CHATGPT_VOICE `ChatGPT.exe`.
4. Display Captures quedan **ocultas** (solo fallback). No activarlas en gameplay.
5. Verificar: `python3 setup/obs-doctor.py "%APPDATA%/obs-studio/basic/scenes/OpsAfterDark.json" stream.config.json` → sin FAIL.
6. Mission Control Dev debe estar sirviendo en `http://127.0.0.1:4001/mission-control/live?mode=dev` (dueño #1691).

## Escenas clave
- **Battlefield 6 — Día 2 / Gaming**: Game Capture + Marca/Reloj + GAME_AUDIO/CHATGPT_VOICE.
- **Coding**: terminal 65 % (1664×1440) + `MISSION_CONTROL_DEV_PANEL` 35 % (896×1440).
- **OAD_FACTORY_FOCUS**: `MISSION_CONTROL_DEV_FULL` 2560×1440 + Marca + CHATGPT_VOICE.
- Pistas: MIC_OPERATOR 1,2,3 · GAME_AUDIO 1,2 · CHATGPT_VOICE 1,2 · Strudel Música 1.

Al cambiar OBS en el PC: re-exportar con el mismo procedimiento y commitear en #1681.
