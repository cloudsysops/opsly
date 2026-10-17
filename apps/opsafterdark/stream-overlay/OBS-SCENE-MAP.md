---
status: active
owner: operations
last_review: 2026-10-01
tags: [opsly/streaming, opsafterdark]
related: ["#1681", "#1691", "#1692"]
---
# OpsAfterDark — mapa lógico de escenas OBS (sin secretos)

| Escena | Video principal | Overlays | Audio | Notas |
|---|---|---|---|---|
| Iniciando / Vuelvo / Terminando | Browser `127.0.0.1:8765/{starting,brb,ending}` | — | Strudel Música | Fondos/textos GDI ocultos = fallback |
| Battlefield 6 — Día 2 | **Game Capture `bf6.exe`** | Marca, Reloj, HUD, Overlay PC, Vibe Glass, Alertas | GAME_AUDIO (bf6.exe), CHATGPT_VOICE (ChatGPT.exe), Mic | Display Capture LG = **oculto, solo fallback manual** |
| Gaming | **Game Capture `bf6.exe`** | Marca, Reloj, HUD, Alertas | GAME_AUDIO, CHATGPT_VOICE, MIC_OPERATOR | Display Capture/LG ocultos |
| Coding | Window Capture 65 % + MISSION_CONTROL_DEV_PANEL 35 % | Marca, Overlay PC, HUD, Alertas (Vibe Glass oculto) | MIC_OPERATOR, CHATGPT_VOICE | Revisar que la terminal no muestre env/tokens |
| OAD_FACTORY_FOCUS | MISSION_CONTROL_DEV_FULL (`:4001`) | Marca | CHATGPT_VOICE | Creada 2026-10-02; `oad factory` se mapea tras validación visual |
| gaming 2 | Display Capture LG | — | — | **SUPERSEDED por Gaming** — retirar tras verificar |
| Streaming | Game Capture | Overlay Streaming | — | DJ NDI (Mac) **oculto**: sin `ndi_source_name`; reconfigurar solo si la Mac vuelve al setup |
| Vertical TikTok / Vertical Scene | Game Capture | — | — | Vertical Scene vacía (pendiente) |

## Reglas
- Gameplay **nunca** con captura de monitor visible (expone Chrome, terminal, GitHub, Claude).
- Una sola instancia de OBS: dos instancias se pelean el hook de Game Capture → pantalla negra.
- Audio por aplicación (Application Audio Capture); Desktop Audio **muted** para no duplicar.
- Antes de cada directo: `python3 setup/obs-doctor.py "%APPDATA%/obs-studio/basic/scenes/OpsAfterDark.json" stream.config.json` → sin FAIL.
- Pistas (`stream.config.json` → `audioTracks`): MIC_OPERATOR 1,2,3 · GAME_AUDIO 1,2 · CHATGPT_VOICE 1,2 · Strudel Música 1. Pista 2 = VOD sin música.

## Factory / Mission Control Dev
- URL: `http://127.0.0.1:4001/mission-control/live?mode=dev` (dueño: #1691).
- `oad factory` = **NOT_CONFIGURED** hasta que exista la escena física `OAD_FACTORY_FOCUS` mostrando Mission Control Dev y el doctor lo confirme (fail-closed).
- Coding objetivo: terminal OpenCode + Mission Control Dev (≈65/35).
- Overlays en `127.0.0.1:8765`: **legacy/UNKNOWN**, no reutilizar para Mission Control.

## Incidentes 2026-10-01
1. Escena al aire con Display Capture LG (escritorio completo) → LIVE_PRIVACY_RISK.
2. Se abrió una 2.ª instancia de OBS ("Launch Anyway") → Game Capture en negro en la instancia que emitía.
3. Regresión: backups del 27-sep tenían Game Capture ON; ediciones de agentes del 28-sep lo cambiaron a captura de monitor.

## Estado aplicado 2026-10-01 (post-stream)
- Perfil y colección renombrados a `OpsAfterDark`.
- Audio global: Desktop Audio **Disabled**; Mic/Aux renombrado `MIC_OPERATOR` (HyperX Cloud Jet).
- Application Audio Capture: `GAME_AUDIO` → bf6.exe, `CHATGPT_VOICE` → ChatGPT.exe (BF6, Gaming; Coding solo CHATGPT_VOICE).
- Game Capture: ventana re-seleccionada (`[bf6.exe]: Battlefield™ 6`); antes quedaba `(null)` → negro.
- Ajuste: confirmación al iniciar stream ON.
- Dispositivos Windows: Headphones (HyperX Cloud Jet), Speakers (Realtek) = AUX, HDMI LG/Dell.
- Pendiente manual (Windows → Mezclador de volumen): bf6.exe → Headphones; ChatGPT.exe → Speakers (Realtek).
- 2026-10-02: pistas GAME_AUDIO/CHATGPT_VOICE = 1,2 ✅; Mission Control Dev en Coding y OAD_FACTORY_FOCUS ✅ (doctor sin FAIL). Plantilla reproducible en `obs/`.
- Backups: `Untitled.json.bak-pre-claude-fix-*`, `Untitled.json.bak-post-stream-*`, `OpsAfterDark.json.bak-clean-*`.
