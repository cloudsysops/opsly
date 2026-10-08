---
status: active
owner: stream-production
last_review: 2026-10-07
---

# Stream AI Factory (OpsAfterDark)

Producción de stream en vivo (Twitch + canvas vertical) donde los **agentes de software "producen" música y visuales
con su trabajo**. Código en [`tools/stream-overlay/`](../../tools/stream-overlay/) y plantilla de clips en
[`tools/video-studio/`](../../tools/video-studio/). Runbook operativo del operador:
[`tools/stream-overlay/PRODUCCION.md`](../../tools/stream-overlay/PRODUCCION.md). Registro de cambios y estado de OBS:
[`docs/reports/stream-ai-factory/`](../reports/stream-ai-factory/).

> **Si eres un agente: el PC de stream suele estar EN VIVO.** Lee "Reglas para agentes" antes de tocar OBS o el servidor.

## Arquitectura

```text
Claude Code / Cursor / Codex ──► vibe-live.mjs (127.0.0.1:8766) ──► páginas web ──► fuentes de navegador de OBS
   transcripts + CPU por proceso     /feed /audio /sonify /rec /set        /factory /festival /  (panel, hacker, festival)
OBS (websocket 4455) ◄── medidores de audio ──┘   └─► motor de sonido (Web Audio) dentro de /factory
                                                     └─► graba WAV + MIDI + procedencia en D:\Content\Music\Factory\
```

- **Servidor de overlays original** (`server.mjs`, `:8765`): HUD, alertas, métricas del PC. No se tocó su comportamiento.
- **`vibe-live.mjs` (`:8766`)**: actividad de agentes (`/feed`), niveles de audio de OBS (`/audio`), sonido y set (`/sonify`, `/set/*`),
  grabación (`/rec/*`), mapeo de proyección (`/mapping`). Siempre arranca con el sonido **apagado**.
- **Motor de sonido** (`factory-page.mjs`, fuente de OBS `FACTORY Hacker Overlay`): sintetizador Web Audio, Re menor, 124 BPM. Notas según
  la actividad de los agentes; modo "set" con INTRO/BUILD/DROP/BREAKDOWN/OUTRO. Graba audio y exporta MIDI.
- **Visuales**: `/factory` (panel hacker + stats), `/` (panel Vibe Coding), `/festival` (pantalla completa, con corner-pin `?edit=1`).

## Escenas de OBS (colección `OpsAfterDark-DualRec-TEST`)

| Atajo `run.ps1 scene …` | Escena | Uso |
| --- | --- | --- |
| `juego` | Gaming + Vibe Coding | Juego + panel de agentes en movimiento + chat |
| `bf6` | Battlefield 6 | Juego normal |
| `zoom` | Battlefield 6 — Zoom | Juego + zoom 2x |
| `hacker` | AI Factory — Hacker | Panel hacker: FPS/CPU/GPU/RAM, grafo de agentes, música reactiva |
| `festival` | Festival — AI Set | Visuales de festival a pantalla completa (set) |
| `inicio` / `brb` / `fin` | Iniciando Stream / Vuelvo en un momento / Terminando Stream | Flujo del directo |
| `coding` / `dj` | Coding-Game / Streaming-Gaming | Escenas previas |

Canvas vertical (Aitum, 1080×1920): escena `V_GAMING` = juego completo arriba, zoom en medio con el chat encima y panel de agentes (fuente `Vibe LIVE V`, 1080×600) a ancho completo abajo.
Foto sanitizada de toda la configuración: [`obs-snapshot-2026-10-07.json`](../reports/stream-ai-factory/obs-snapshot-2026-10-07.json).

Audio: el motor de la factory (`FACTORY Hacker Overlay`) va **solo en la pista 1** (directo, no VOD) y está presente (fuera de pantalla) en
todas las escenas de juego para que la música no se corte. `METER DDJ-SX2 (no sale al aire)` mide la DDJ-SX2 sin pistas ni monitoreo.
Relacionado: [`STREAMING-GAMER-DJ-NDI.md`](../runbooks/STREAMING-GAMER-DJ-NDI.md) (AI-DJ en Mac, NDI).
Dispositivo de monitoreo de OBS: **Speakers (Realtek(R) Audio)** (la salida predeterminada de Windows es la DDJ-SX2).

## Comandos (HTTP local, `127.0.0.1:8766`)

`/sonify/on|off|vol/0.22` · `/rec/on|off|status` · `/set/start?min=30[&dry=1]|skip|stop|status` · `/audio` · `/feed` ·
`/festival?sim=1` (previsualiza sin música) · `/factory?sim=1&sound=1` (oír el sintetizador en un navegador normal).
Colores del proyector: `/look/palette/<neon|fuego|hielo|matrix|ultravioleta|oro|arcoiris|mono>` · `/look/hue/<-180..180>` (persisten en `music/look.json`).
Cambio de escena de OBS: `/scene/<juego|bf6|zoom|hacker|festival|inicio|brb|fin|coding|dj>` (**cambia el directo**).
**Panel de control web (botones): `http://127.0.0.1:8766/control`**. El servidor escucha solo en `127.0.0.1`; no lo expongas a la red
(estos endpoints cambian escenas y graban).
Arranque/parada completos: `tools/stream-overlay/start-production.ps1` y `stop-production.ps1`.

## Reglas para agentes

1. **No reinicies `vibe-live.mjs` sin avisar**: apaga la música (`sonify` vuelve a `off`). Tras reiniciar: `/sonify/vol/0.22` y `/sonify/on`.
2. **No recargues fuentes de navegador de OBS con el stream en vivo** (`refreshnocache`): la recarga del overlay pesado causó ~340 frames perdidos (~6 s).
3. **No cambies el Dispositivo de monitoreo ni la salida predeterminada de Windows**; no añadas capturas de audio de escritorio completo
   (la música no debe llegar al VOD). La música generada es original; Serato/terceros no deben entrar al mix ni al sello.
4. **Nunca escribas claves de stream, tokens ni la contraseña de obs-websocket en el repo.** Viven en el perfil local de OBS
   (`service.json`, `plugin_config/obs-websocket`). Doppler: CLI instalada; falta que el operador haga `doppler login` (no automatizado).
5. Las ediciones de escenas por websocket deben fijar **todos** los campos del transform (los bounds persisten); para el canvas vertical
   usa `canvasUuid` (`296c30be-fb5e-4e62-9b55-45f3223a4f6b`).
6. Las fuentes de navegador de escenas inactivas no se pintan: para verificar una escena nueva hay que ponerla al aire o usar el navegador (`?sim=1`).
7. Muestra actividad de agentes solo como nombre de herramienta y de archivo; **nunca contenido de código ni comandos**
   (el panel se emite en directo). Excluye `.env`, claves y tokens (ya filtrado en `vibe-live.mjs`).

## Estado y pendientes

- Proyector HDMI: **no detectado** por Windows. El Ryzen 5 3600X no tiene gráfica integrada, por lo que el HDMI de la placa base (ASUS PRIME X570-P)
  no sirve; hay que conectarlo a la RTX 3060 (adaptador DP→HDMI si no hay puertos). Lanzador: `projector.ps1 -Screen N`; mapeo: `/festival?edit=1`.
- `Encoding overloaded` en OBS: NVENC `p5` + `multipass qres` + `psycho_aq` mientras se juega; sugerido p4/p3 sin multipass (no aplicado en vivo).
- Chat de Twitch (`chat.html`, lector anónimo IRC) pendiente de comprobar en directo; sin el aviso de cookies porque ya no usa el popout de Twitch.
- DDJ-SX2: audio medido; MIDI (faders/jog) todavía sin leer. Ecualizador reacciona al volumen, no al espectro.
- Música del sello: ver "Derechos" en `PRODUCCION.md`; la parte generada solo por código tiene protección de autor limitada.
