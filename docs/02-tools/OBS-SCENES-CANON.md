# OBS — escenas canónicas de OpsAfterDark / AI Factory

Estado a 2026-10-11. Perfil y colección: `OpsAfterDark-DualRec-TEST` (1920x1080, 60 fps, NVENC). Snapshot de la estructura: `docs/reports/stream-ai-factory/obs-scenes-snapshot-2026-10-11.json` (se genera con `obs-snapshot.mjs` del overlay del stream; no contiene clave de stream ni servidor).

## Flujo del directo

```
Iniciando Stream → CODING_4 | Coding-Game | AI Factory — Hacker → Battlefield 6 → Vuelvo en un momento → Terminando Stream
```

| Escena | Rol | Contenido |
|---|---|---|
| `Iniciando Stream` | Inicio | Cuenta atrás animada |
| `CODING_4` | **Vibe coding puro** | Terminal `VIBE · Terminal` (65% izq.) + Mission Control (35% der.). Mientras Mission Control esté offline se ve el placeholder `FACTORY_MC_OFFLINE` |
| `Coding-Game` | **Juego + vibe coding** | Juego (65% izq., 16:9) + terminal y panel "Resumen de sesión" (35% der.) |
| `AI Factory — Hacker` | Juego + panel de agentes | Juego a pantalla completa + overlay AI FACTORY y chat |
| `Festival — AI Set` | **Set en vivo (música + visuales + agentes)** | Visuales del festival a pantalla completa, panel AI FACTORY a la derecha, chat a la izquierda y motor de música. Se retoca en directo desde `http://127.0.0.1:8766/control` (paleta, tono, volumen) sin recargar fuentes |
| `Battlefield 6` | Juego | `Game Capture` + audio de `bf6.exe` |
| `Vuelvo en un momento` | Pausa segura | Pantalla de pausa con reloj |
| `Terminando Stream` | Cierre | — |
| `QUEST_CAST_TEST` | **Laboratorio** | No usar en directo |

Escenas heredadas, no usar en directo: `Gaming`, `Streaming-Gaming`, `Battlefield 6 — Zoom`, `Gaming + Vibe Coding`, `LG Desktop` (muestra el segundo monitor completo), `OAD_FACTORY_FOCUS` (Mission Control a pantalla completa; en blanco si el puerto 4001 está apagado).

## Reglas de privacidad

- Nunca `Display Capture` en una escena de directo. `LG Desktop` es la excepción heredada: evitarla.
- **Fallo corregido:** `Window Capture 2` (captura de la ventana `bf6.exe`) mostraba el **escritorio completo** en `Coding-Game`, `Gaming` y `Streaming-Gaming`. Está quitada de `Coding-Game` y desactivada en las otras dos. No volver a activarla.
- El terminal (`VIBE · Terminal`, ventana "OpenCode" de Windows Terminal) se ve tal cual: no mostrar claves, `.env`, tokens ni rutas privadas.
- Ventanas de Cursor, ChatGPT y Claude (`VIBE · Cursor`, `VIBE · ChatGPT`, `VIBE · Claude`, `VIBE.Ubuntu`) están ocultas en `CODING_4`. No activarlas sin revisar su contenido.
- Mission Control: `MISSION_CONTROL_DEV_PANEL` se activa solo cuando `http://127.0.0.1:4001/mission-control/live` responde. Si está caído se ve en blanco.

## Qué se cambió el 2026-10-11 en OBS

1. Se crearon `FACTORY_INTRO`, `FACTORY_CODING` y `FACTORY_BREAK`, y luego **se borraron** por duplicar `Iniciando Stream`, `CODING_4` y `Vuelvo en un momento`. Quedan `FACTORY_MC_PANEL_BG` y `FACTORY_MC_OFFLINE` (placeholder de Mission Control en `CODING_4`).
2. `CODING_4`: layout 65/35, fondo `V_BG_OAD`, micrófono añadido, ventanas privadas ocultas.
3. `Coding-Game`: juego 65% + terminal + panel "Resumen de sesión". Se quitaron el duplicado de `Vibe Coding Glass`, un grupo vacío, `Window Capture 2` y el panel de Mission Control (vive en `CODING_4`).

## Rollback

Todo es reversible desde OBS. Las fuentes quitadas de una escena siguen existiendo y se pueden volver a añadir. Las `FACTORY_*` borradas se recrean con una fuente de color y de texto si hiciera falta.

## Pendiente

- Abrir un Windows Terminal titulado "OpenCode" para que `CODING_4` y `Coding-Game` muestren código.
- Levantar Mission Control en el puerto 4001 (PR #1691) y activar su panel.
- Dejar **un solo** escritor automático de escenas (`scene-watch.mjs` o la tarea `OBS-Scene-Automation-BF6`, que apunta a una escena inexistente).
- CPU al 100% con BF6 en el menú y VRAM al 93%: cerrar Chrome y agentes pesados antes de salir.

## Panel AI Factory y música (2026-10-11)

- `http://127.0.0.1:8766/factory`: fila de objetivo (de `activity.json`), tope de 30 fps y candado de motor único: solo una página suena; la de OBS (`?engine=1`) tiene prioridad sobre un navegador normal, así no se duplica el audio.
- Modos: `?engine=1` solo audio, `?visual=1` solo imagen.
- Retoque en directo: `/look/palette/<neon|fuego|hielo|matrix|ultravioleta|oro|arcoiris|mono>`, `/look/hue/<-180..180>`, `/sonify/vol/<0..0.6>`. No recargar fuentes de navegador mientras se emite.
