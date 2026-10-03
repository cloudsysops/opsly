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

## `oad` — control remoto seguro de escena (allowlist)

Diseño canónico: [`docs/streaming/REMOTE-STREAM-CONTROL.md`](../../docs/streaming/REMOTE-STREAM-CONTROL.md).

`stream-ops-stream-ctl` (arriba) es la herramienta local del operador —
incluye `live`/`stop`, pensada para usarse sentado frente al PC. `oad` es la
superficie restringida pensada para SSH/teléfono: **solo** lee estado o
cambia de escena, nunca toca el stream key ni inicia/detiene el stream.

```bash
bin/oad status
bin/oad scene gaming|coding|factory|intermission|starting [--dry-run]
```

- Allowlist cerrada (`src/oad-scenes.mjs`, sin dependencias — testeable sin
  tocar OBS): cualquier otro valor falla con `UNKNOWN_SCENE` antes de abrir
  conexión alguna.
- `factory` existe en la allowlist pero no tiene escena física asignada
  todavía (`ALIASES.factory === null`) — falla con `SCENE_NOT_CONFIGURED` en
  vez de adivinar. Asignarla en `src/oad-scenes.mjs` cuando exista una escena
  de OBS que muestre Mission Control Dev.
- `--dry-run` imprime el plan (`LOGICAL_SCENE`, `PHYSICAL_SCENE`,
  `CURRENT_SCENE`) sin mutar OBS.
- Todo cambio real hace *readback* (`GetCurrentProgramScene` después del
  `SetCurrentProgramScene`) y falla con `READBACK_MISMATCH` si OBS no quedó
  donde se pidió — nunca reporta éxito sin verificarlo.
- Nunca imprime la contraseña de obs-websocket (no la toca directamente;
  reusa `obs-connection.mjs`/`obs.mjs` tal cual).

**`bin/oad` es un lanzador de WSL → Windows node.exe**, no un detalle de
`oad.mjs`: `obs-connection.mjs` lee el `config.json` de obs-websocket por su
ruta nativa de Windows, así que esto debe ejecutarse con el Node de Windows
aunque la sesión (teléfono → SSH → tmux) aterrice en WSL. El wrapper resuelve
las rutas con `wslpath` — no hace falta tocar nada a mano:

```bash
ssh opsly@<host-tailscale>
cd /mnt/c/Users/opsly/opsly   # o la ruta WSL de tu checkout
packages/stream-ops-kit/bin/oad status
packages/stream-ops-kit/bin/oad scene coding
```

Variables de entorno opcionales del wrapper: `OAD_NODE_EXE` (ruta a
`node.exe` si no está en `/mnt/c/Program Files/nodejs/node.exe`),
`OAD_TENANT_DIR` (si la carpeta del tenant no es
`apps/opsafterdark/stream-overlay` relativa al repo).

Tests puros (sin OBS): `node --test src/__tests__/oad.test.mjs`.
