# Stream OpsAfterDark — herramientas de OBS

Todo se maneja desde una carpeta y un punto de entrada:

```powershell
cd C:\Users\opsly\OneDrive\Documents\ChatGPT\intcloudsysops\stream-overlay
powershell -ExecutionPolicy Bypass -File .\run.ps1 <comando>
```

(`run.ps1` busca `node` solo y levanta el servidor de overlays en `127.0.0.1:8765` si no está corriendo.)

## Flujo del stream

| Paso | Comando | Qué hace |
|---|---|---|
| 1. Chequeo previo | `run.ps1 preflight` | Servidor, páginas, OBS, escenas, audio sin silenciar, disco, FPS, clave de stream y cuenta regresiva. Sale con error si algo falla. |
| 2. Iniciar | `run.ps1 start` | **PONE EL STREAM EN VIVO.** Cambia a "Iniciando Stream", empieza la transmisión y deja un vigía que pasa a la escena de juego al llegar a cero. |
| 3. Cambiar escena | `run.ps1 scene inicio` (o `coding`, `juego`, `dj`, `brb`, `fin`) | Solo cambia de escena. |
| 4. Detener | `run.ps1 stop` | **TERMINA el stream.** Antes, `run.ps1 scene fin` para mostrar la pantalla final. |

## Cuenta regresiva (escena "Iniciando Stream")

- Se configura en `schedule.json`: `at` (hora local de la zona), `timezone` (`America/New_York`) y `scene` (a dónde saltar).
- **`at` es una hora de ejemplo (2026-10-03T20:00): cámbiala por la real.**
- El vigía (`auto-start.mjs`) solo cambia de escena, nunca inicia ni detiene el stream. Si la escena actual no es "Iniciando Stream" al llegar a cero, no toca nada. Si la hora ya pasó al arrancar, se niega.
- Prueba sin transmitir: `run.ps1 test-countdown 15` (15 s). Pone "Iniciando Stream", cuenta, salta a la escena de juego, verifica y restaura la escena previa. El estado de la prueba vive solo en memoria y no modifica `schedule.json`.

## Alertas (follow, sub, raid) — solo simuladas

- Overlay: `/alerts` (fuente de navegador "Alertas", arriba de Streaming, Gaming, Coding y Battlefield 6). Se instala con `node configure-alerts.mjs`.
- Probar: `run.ps1 alert follow` · `alert sub` · `alert raid` · `alert all`.
- El servidor solo acepta eventos por `POST /alerts/test` con la cabecera `x-stream-tool: 1`, desde esta máquina.
- **No hay conexión con Twitch.** Para alertas reales haría falta EventSub con tu autorización, y no está hecho.

## Atajos de teclado

| Atajo | Escena |
|---|---|
| Ctrl+Alt+Shift+1 | inicio |
| Ctrl+Alt+Shift+2 | coding |
| Ctrl+Alt+Shift+3 | juego |
| Ctrl+Alt+Shift+4 | dj |
| Ctrl+Alt+Shift+5 | brb |
| Ctrl+Alt+Shift+6 | fin |
| Ctrl+Alt+Shift+0 | pausar / reanudar los atajos (pitido agudo = activos, grave = pausados) |

- Activar: `run.ps1 hotkeys-on` · Desactivar del todo: `run.ps1 hotkeys-off` · Estado: `powershell -File hotkeys.ps1 status`.
- Solo cambian de escena; no pueden iniciar ni detener el stream.
- No arrancan solos con Windows: hay que activarlos cada sesión.

## Música en vivo (Strudel)

Patrones techno, house, build-up y drop en `music/`; instructivo en [music/INSTRUCTIVO.md](music/INSTRUCTIVO.md) y licencias en [music/LICENCIAS.md](music/LICENCIAS.md).

| Comando | Qué hace |
|---|---|
| `run.ps1 music-setup` | Crea la fuente de audio independiente "Strudel Música" en OBS (pista 1, sin VOD, -18 dB, monitoreo apagado). Una vez. |
| `run.ps1 music techno` (o `house`, `buildup`, `drop`) | Copia el patrón al portapapeles y actualiza el widget "Sonando ahora". `--no-copy` para no tocar el portapapeles. |
| `run.ps1 music "Texto" "detalle"` / `music off` | Texto propio en el widget / ocultarlo. También sirve editar `music/nowplaying.txt`. |
| `run.ps1 music-check` | Verifica que los patrones solo usan sintetizadores incorporados (sin samples). |

## Marco del DJ (NDI)

`run.ps1 test-ndi` verifica que el DJ NDI de la escena "Streaming" queda dentro del marco 640×360 (x 1820, y 860) con 1920×1080, 1280×720, 2560×1440, 1920×1200 y 3840×2160. Mide un render real en una escena temporal que borra al terminar. Se niega a correr con el stream en vivo.

## Archivos

`server.mjs` (servidor y rutas) · `scenes.mjs` (páginas de overlay) · `schedule.mjs`/`schedule.json` (cuenta regresiva) · `obs.mjs` (conexión a OBS) · `stream-ctl.mjs` · `auto-start.mjs` · `preflight.mjs` · `hotkeys.ps1` · `configure-*.mjs` (instalan fuentes en OBS) · `music.mjs`/`music/` · `check-music-licenses.mjs` · `log-activity.mjs`/`activity.json` (resumen de sesión) · `start-stream-tools.vbs` (arranque con Windows).
