# Produccion OpsAfterDark × AI Factory

Todo sale de `stream-overlay/`. Un servidor (`vibe-live.mjs`, `127.0.0.1:8766`) alimenta OBS y el proyector.

## Arrancar / parar
| Accion | Comando |
|---|---|
| Arrancar todo (servidor + proyector + set 30 min) | `powershell -ExecutionPolicy Bypass -File .\start-production.ps1 -Minutes 30` |
| Probar sin tocar el stream | `... start-production.ps1 -Dry -NoProjector` |
| Parar set, sonido, grabacion y proyector | `powershell -File .\stop-production.ps1` |
| Solo el servidor | `node vibe-live.mjs` |

El set cambia solo a la escena **Festival — AI Set**, sube el sonido, graba y recorre
INTRO → BUILD → DROP → BREAKDOWN → BUILD → DROP → OUTRO. Al terminar vuelve a la escena anterior.
El servidor siempre arranca con el sonido **apagado**.

## Escenas de OBS
| Escena | Para que |
|---|---|
| Battlefield 6 | Juego normal |
| Gaming + Vibe Coding | Juego + panel de actividad de agentes + chat |
| AI Factory — Hacker | Juego + panel hacker (FPS/CPU/GPU/RAM, grafo de agentes, musica reactiva) |
| Battlefield 6 — Zoom | Juego + zoom 2x |
| Festival — AI Set | Visuales de festival a pantalla completa (set) |
| V_GAMING (lienzo vertical Aitum) | Juego completo arriba + zoom abajo + chat |

## Control en vivo (HTTP, solo local)
- Sonido: `/sonify/on` · `/sonify/off` · `/sonify/vol/0.3` (max 0.6)
- Grabar: `/rec/on` · `/rec/off` · `/rec/status`
- Set: `/set/start?min=30` · `/set/skip` · `/set/stop` · `/set/status` (`&dry=1` = prueba)
- Visuales: `/factory` (panel), `/festival` (pantalla completa, `?sim=1` para previsualizar)

## Musica y sello
Cada grabacion queda en `D:\Content\Music\Factory\session_<fecha_hora>\`:
`session.wav` (48 kHz/24 bit) · `session.mid` (pistas por instrumento) · `session.json` (procedencia) · `raw.webm`.
Flujo: elegir sesiones → importar el `.mid` a un DAW → arreglar/mezclar/masterizar a mano → distribuir.
- La parte generada solo por codigo tiene proteccion de autor limitada en muchos paises; tu arreglo y mezcla si cuentan. Consulta a un abogado de PI antes de lanzar.
- No mezclar pistas de Serato/terceros en el material del sello.

## Pantallas
`projector.ps1 -Screen N` abre los visuales a pantalla completa en la pantalla N (`-Close` la cierra).
Si Windows no ve el proyector: `Win+P` → *Extender*, y revisa cable/entrada del proyector.

## Antes de salir (checklist)
1. OBS abierto y transmitiendo; mic y volumen del juego bien.
2. `start-production.ps1 -Dry` para confirmar que el servidor responde.
3. Volumen de musica 0.25–0.35; que tu voz se escuche por encima.
4. Cierra ventanas con tokens/correos antes de mostrar el panel de vibe coding.
5. Despues del set: revisa `session.wav` y borra lo que no sirva.

## Limites conocidos
- El ecualizador reacciona al volumen, no al espectro real.
- Instrumentos = sintetizadores basicos (Web Audio). Para sonido de estudio: MIDI → DAW.
- La DDJ-SX2 mide audio (medidor sin salida al aire) pero aun no controla los visuales.
