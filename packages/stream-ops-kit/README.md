# @intcloudsysops/stream-ops-kit

Motor genérico de automatización de OBS/stream para tenants del vertical
`gaming-streamer` (ver `config/vertical-blueprints/gaming-streamer.json`).
No contiene branding ni nombres de escena de ningún tenant — eso vive en la
carpeta de datos de cada tenant (ej. `apps/opsafterdark/stream-overlay/`).

## Contrato con el tenant

El motor no asume ninguna carpeta fija. Cada script espera la variable de
entorno `STREAM_KIT_DATA_DIR` apuntando a la carpeta del tenant, que debe
contener:

| Archivo | Contenido |
|---|---|
| `stream.config.json` | `obsConfigPath`, `apiBase`, `obsSceneNames` (mapa inicio/coding/juego/dj/brb/fin → nombre real de escena en OBS), `audioTracks` (mapa fuente → pistas), `game` (`processName`, `label`, `liveStatusLabel`, opcional), `overlaySourceName` (opcional) |
| `scenes.mjs` | Exporta el HTML/branding de cada página: `starting, brb, ending, hud, summary, stream, alerts, overlay, coding, vibe` |
| `schedule.json` | `at`, `timezone`, `scene` — cuenta regresiva |
| `activity.json` | `{ goal, items[] }` — resumen de sesión |
| `music/` | `catalog.json`, patrones `.strudel`, `nowplaying.txt` |
| `.analysis/` | Se crea sola (salida de `extract-audio-tracks.mjs`) |

Ver `apps/opsafterdark/stream-overlay/` como referencia completa de un tenant.

## Onboarding de un tenant nuevo (resumen)

1. Clonar la carpeta de datos de un tenant existente como plantilla (o partir
   de `stream.config.json` en blanco).
2. Ajustar `obsSceneNames`, `audioTracks`, `game` y `overlaySourceName` a la
   configuración real de OBS del nuevo streamer.
3. Escribir su propio `scenes.mjs` con su branding.
4. El punto de entrada (`run.ps1` u otro) fija `STREAM_KIT_DATA_DIR` a su
   carpeta y llama a los scripts de este paquete (`src/*.mjs`).
5. Los scripts de `setup/*.mjs` de cada tenant (instalación de fuentes en OBS
   con nombres exactos) siguen siendo específicos de cada uno — no están aquí.
