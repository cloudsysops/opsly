---
status: active
owner: operations
last_review: 2026-10-12
type: infrastructure
tags:
  - opsly/infrastructure
  - opsly/streaming
  - opsly/opsafterdark
---

# OpsAfterDark — Stream runtime reconciliation (8765 / 8766 / 8799 / 4001)

Inventario del runtime de streaming del PC de stream (Windows `smdqcia-pc`) y plan para converger a un solo servidor canónico **sin cortar el overlay en producción**. Es documento puramente de runtime/streaming: no cubre contenido musical, Ableton ni Rights Manifest.

## Decisión de arquitectura

- `packages/stream-ops-kit` es el **runtime canónico de streaming**.
- `apps/opsafterdark/` contiene configuración y superficie específica del tenant (escenas, config, assets).
- Mission Control sigue **separado**, como read model.
- **Ningún proceso adicional debe escribir en OBS sin ownership explícito** (ver [Pendiente: single owner](#pendiente-single-owner-for-obs-writes)).
- Regla de verdad: lo que no tiene evidencia se muestra `UNKNOWN` / `UNVERIFIED` / `—`; nada se infiere.

## Alcance y método

Estado observado el 2026-10-11 con comandos de solo lectura (listeners, línea de comandos de procesos, lectura del código y de las colecciones de escenas de OBS). Lo que **no** se pudo verificar se marca `NO VERIFICADO`. Esto es una foto: reverificar antes de actuar.

## Mapa de puertos

| Puerto | Proceso dueño | Qué es | Estado |
|---|---|---|---|
| `8765` | `node …\intcloudsysops\stream-overlay\server.mjs` (PID 8596 al observar) | Prototipo local de Windows (overlay + métricas + música + alertas). **No** es el `stream-ops-kit` de #1681. | En producción, OBS lo consume |
| `8766` | `node …\stream-overlay\vibe-live.mjs` (PID 28876) | "Vibe live": paneles, control de OBS, medidores, estado propio | En producción, OBS lo consume |
| `8799` | `stream-ops-kit/src/server.mjs` (canónico, #1681), con datos de tenant en `/tmp/studio-preview` | Instancia **solo de preview**, creada para validar `/studio` | Temporal; se pierde al reiniciar WSL |
| `4001` | Mission Control (servicio aparte) | Read model; OBS tiene fuentes a `/mission-control/live?mode=dev` | NO VERIFICADO el proceso dueño |

Todos escuchan en `127.0.0.1`.

## Rutas por servidor

### 8765 (prototipo local)

`/metrics`, `/activity`, `/schedule`, `/schedule/test`, `/nowplaying`, `/music/*.strudel`, `/music-test`, `/music-test/state`, `/analyze`, `/analysis/*`, `/alerts/next|test|push`, y las páginas `/coding /vibe /starting /brb /ending /hud /summary /stream`; cualquier otra ruta devuelve el overlay por defecto.

### 8766 (`vibe-live.mjs`)

- Páginas: `/` (Vibe LIVE), `/factory` (`?engine=1` audio, `?visual=1`), `/festival`, página de control.
- Telemetría/estado: `/feed`, `/metrics` (reenvía `8765/metrics` + `GetStats`/`GetStreamStatus` de OBS), `/audio` (medidores desde eventos de volumen de OBS), `/sonify`, mapping, `/look`.
- Estado propio: `/studio/mode`, `/engine/claim` (candado de motor único), archivos `music/look.json`, `music/sonify.json`, `music/mapping.json`.
- **Escritura en OBS**: `/scene/*` (cambia escena de programa), `/set/*` (sets programados), `/rec/*` (grabación).
- Sirve además su propio `studio-dashboard.html`.

### 8799 (canónico, preview)

Todas las rutas del `server.mjs` canónico más `GET /studio` (`?mode=camera`) añadida en #1681. Sin `/feed`, sin endpoint de modo, sin estado nuevo.

## Qué fuentes de OBS consumen cada ruta

Fuentes de navegador en las colecciones de escenas (leídas de `%APPDATA%\obs-studio\basic\scenes`):

| URL | Fuentes de OBS |
|---|---|
| `8765/` | Overlay PC Live |
| `8765/stream` | Overlay Streaming |
| `8765/hud` | HUD OpsAfterDark |
| `8765/starting`, `/brb`, `/ending` | Pantallas Inicio / BRB / Fin |
| `8765/summary` | Vibe Coding Glass |
| `8765/alerts` | Alertas |
| `8766/` | Vibe LIVE, Vibe LIVE V |
| `8766/factory?engine=1` | FACTORY Engine (audio) |
| `8766/factory?visual=1` | FACTORY Hacker Overlay |
| `8766/festival` | FESTIVAL Visuals |
| `4001/mission-control/live?mode=dev` | MISSION_CONTROL_DEV_FULL, MISSION_CONTROL_DEV_PANEL |
| `file://…/stream-overlay/studio-dashboard.html?theme=studio&mode=mission&max=ARRANGE` | MISSION_CONTROL_DEV_FULL (prototipo local por `file://`) |
| `file://…/stream-overlay/chat.html` | CHAT Twitch |
| `strudel.cc`, `data:` (reloj) | Strudel Música, Reloj |

Pendiente: NO VERIFICADO qué escenas contienen cada fuente ni cuáles están activas.

## Procesos que escriben en OBS

| Proceso | Escribe | Verificado |
|---|---|---|
| `vibe-live.mjs` (8766) | `SetCurrentProgramScene`, inicio/parada de sets, grabación | Sí, en código |
| `scene-watch.mjs` | Cambia la escena de programa según si Battlefield 6 está abierto | Sí, en código |
| Scripts CLI de `stream-ops-kit` y del prototipo (`stream-ctl`, `configure-*`, `rescale-canvas`, `obs-snapshot`, `auto-start`, etc.) | Bajo demanda, por operador | Solo por nombre; NO auditados |
| `vertical-sync.mjs` (tarea `OpsAfterDark-Vertical-Sync`, `stream-ops-kit`) | Solo la escena **vertical** del canvas Aitum, siguiendo la escena de programa horizontal según `verticalSync.map` | Sí, en código y probado sin directo |
| Herramientas de sesión de Claude Code | Escenas/fuentes temporales con `STUDIO-PREVIEW-*`, siempre borradas | Registro en esta sesión |

Dos procesos permanentes (`vibe-live.mjs`, `scene-watch.mjs`) escriben a OBS sin coordinación; `vertical-sync` se añadió (2026-10-15) como tercero, pero pertenece al runtime canónico (`stream-ops-kit`), solo escribe la escena vertical y no compite con los otros por la escena horizontal. Ver pendiente.

## Duplicaciones encontradas

1. **Servidor de overlay duplicado:** el prototipo (8765) y `stream-ops-kit/src/server.mjs` sirven las mismas rutas (schedule, music, alerts, metrics, activity, páginas). Equivalencia exacta ruta a ruta: NO VERIFICADA.
2. **Telemetría duplicada:** `8766/metrics` reenvía y re-agrega `8765/metrics`. El kit reusa `collectNvidiaTelemetry` de `scripts/ops`; no debe aparecer una tercera lectura de GPU.
3. **Control de OBS duplicado:** `vibe-live` y `scene-watch` escriben escenas por separado, y `obs.mjs` existe en el prototipo y en el kit.
4. **Dos `studio-dashboard.html`:** el del prototipo local (OBS lo carga por `file://`) y el canónico en `apps/opsafterdark/stream-overlay/` (servido en `/studio`). No son el mismo archivo.
5. **Estado propio en vibe-live:** `/studio/mode`, `/engine/claim` y los JSON de `music/` son un state store aparte.

## Qué absorbe `stream-ops-kit`

- Rutas del 8765 (metrics, activity, schedule, música, alertas, páginas): **sí**, ya existen en el kit.
- `/studio` y `/studio?mode=camera`: ya incluido (#1681).
- Medidores de audio (`/audio`): **solo** si se verifica que miden el master real; hoy no está verificado (MASTER L/R = UNKNOWN).
- Telemetría: se reutiliza `/metrics` del kit; no se crea un servicio nuevo.

## Qué NO se porta

- `/feed`, `/studio/mode`, `/engine/claim` y los archivos de estado de `music/` (no hay mecanismo genérico ni dueño; no se crea otro state store).
- `vibe-live.mjs` como servidor adicional.
- `obs.mjs` duplicado del prototipo.
- Cualquier telemetría por agente no verificada.
- `factory-page.mjs`, `festival-page.mjs`, `ideas-sketch.mjs`: diferidos a después de resolver el runtime.

## Estrategia de migración uno-a-uno

Reglas: nada se mueve durante un directo; cada fase es reversible; un cambio por vez.

1. **Paridad:** levantar el kit canónico en `8799` y comparar sus respuestas con las de `8765` ruta a ruta (cuerpo, tipo, cabeceras). Solo lectura.
2. **Fuentes estáticas:** mover una fuente de OBS a la vez, empezando por las que solo usan `/metrics` o páginas estáticas (`/hud`, `/summary`). Verificar en una escena de preview antes de producción.
3. **Resto del 8765:** `/stream`, `/starting`, `/brb`, `/ending`, `/alerts`, `/` en ese orden, una por vez.
4. **Mover el puerto canónico:** cuando todas las fuentes usen el kit, el kit pasa a ser dueño del puerto elegido para producción (decisión pendiente: reutilizar `8765` o fijar uno nuevo). No se cambian puertos en directo.
5. **vibe-live:** se descompone según su criterio (abajo), por responsabilidad.

## Rollback por fase

| Fase | Rollback |
|---|---|
| 1 Paridad | No hay cambios en producción; detener `8799`. |
| 2–3 Fuentes | Volver la URL de esa fuente de OBS al `8765`. Anotar la URL anterior antes de cambiarla; copia de la colección de escenas antes de empezar. |
| 4 Puerto | Restaurar el proceso y el puerto anteriores; el proceso del prototipo no se borra hasta cumplir el criterio de apagado. |
| 5 vibe-live | Mantener `vibe-live.mjs` sin modificar hasta que cada responsabilidad migrada tenga prueba; revertir fuente a `8766`. |

## Criterio para apagar 8765

Se apaga solo si se cumplen **todos**:

1. Ninguna fuente de OBS (todas las colecciones, incluidas las de respaldo) usa `8765`.
2. Ningún proceso activo mantiene conexiones a `8765` (verificado con listeners).
3. Paridad de rutas verificada (fase 1) y pruebas del kit en verde.
4. Un directo completo sin incidencias sobre el servidor canónico, con CPU, ms de render y frames perdidos dentro de la línea base.
5. Rollback ensayado una vez.
6. Apagado fuera de directo, con el prototipo conservado (no borrado) hasta una segunda sesión de directo estable.

## Criterio para retirar o descomponer `vibe-live.mjs`

Se descompone por responsabilidad, no de golpe:

- **Páginas** (`/`, `/factory`, `/festival`): moverlas al tenant o conservarlas como superficie, sin servidor propio, cuando exista dueño; hasta entonces siguen en `8766`.
- **Control de OBS** (`/scene`, `/set`, `/rec`): se retira solo cuando exista el *single owner* de escrituras en OBS.
- **Medidores `/audio`**: se migran solo con fuente verificada del master.
- **Estado** (`/studio/mode`, `/engine/claim`, JSON de `music/`): no se migra; se elimina o se reasigna a un mecanismo existente con dueño explícito.
- `vibe-live.mjs` se retira cuando ninguna fuente de OBS usa `8766` y sus responsabilidades están migradas o eliminadas por decisión explícita.

## Pendiente: single owner for OBS writes

**Abierto.** Hoy escriben en OBS `vibe-live.mjs` y `scene-watch.mjs`, además de scripts CLI manuales. Hay que decidir un único dueño (propuesta: el kit canónico, con una sola capa de escritura a OBS) y definir cómo se coordinan las escrituras (bloqueo, auditoría, rechazo si hay directo). Hasta entonces:

- No se añaden procesos nuevos que escriban en OBS.
- Toda escritura manual verifica antes `GetStreamStatus` y se niega a actuar en directo.
- Las pruebas usan escenas temporales con prefijo propio y las eliminan al terminar.

## Pendiente de verificar

- Equivalencia exacta de rutas entre `8765` y el kit (fase 1).
- Procesos dueños de las conexiones activas a `8765`/`8766` y del servicio `4001`.
- Qué escenas contienen cada fuente de navegador y cuáles están activas.
- Auditoría de los scripts CLI que escriben en OBS.
- Qué puerto usará el kit en producción.
