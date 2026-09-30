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

## Relación con el worker `pc-gamer` (mismo host, dos roles distintos)

El primer tenant de este vertical (`opsafterdark`) transmite desde el mismo
equipo que ya está registrado en producción como el worker de cómputo GPU
`home-gpu-01` (alias `pc-gamer`, `desktop-smdqcia` / `smdqcia-pc`) —
ver [`docs/04-infrastructure/PC-GAMER-WORKER.md`](../../docs/04-infrastructure/PC-GAMER-WORKER.md)
y `config/compute-workers.json`. Son **dos conceptos distintos que conviven en
el mismo hardware**, no un registro duplicado:

| | `pc-gamer` (existente) | `opsafterdark` / `stream-ops-kit` (este vertical) |
|---|---|---|
| Qué es | Worker de cómputo GPU de la plataforma (rutea jobs `gpu.nvidia`/`video.render`/`ffmpeg` vía BullMQ) | Tenant de creador de contenido (streaming, CRM de patrocinios, clips) |
| Dueño del concepto | Infraestructura de plataforma | Vertical `gaming-streamer` |
| Disponibilidad | `scripts/ops/check-pc-gamer-gpu-load.sh` — ¿está libre AHORA para recibir un job? | `stream.config.json` → `alerts.gpuHighPercent/gpuHighSustainedMinutes` — ¿la GPU lleva mucho tiempo saturada DURANTE mi stream? (señal de mantenimiento, no de disponibilidad para jobs) |
| Lectura de GPU | `scripts/ops/creator-system-telemetry.mjs` (`collectNvidiaTelemetry`) | El mismo módulo, importado directo — **no hay una segunda lectura/parseo de `nvidia-smi`** |

Regla dura de `AGENTS.md`: nunca crear un segundo worker registry/orquestador.
`stream-ops-kit` no lo es — es código de aplicación de un tenant que corre en
la máquina, no una cola ni un registro de workers — pero reutiliza el módulo
de telemetría existente en vez de duplicar la lectura de GPU/CPU.
