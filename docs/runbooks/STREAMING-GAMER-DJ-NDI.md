---
status: active
owner: operations
last_review: 2026-09-22
type: runbook
tags:
  - opsly/worker
  - opsly/revenue
  - opsly/gaming
---

# Streaming gamer + DJ en vivo (NDI Mac → PC)

Montaje para tocar la **controladora DDJ en el Mac** (Serato DJ Pro) mientras se **juega
y se transmite desde el PC gamer** (OBS). El audio del DJ viaja por red vía **NDI** y se
mezcla en OBS de la PC con el juego y el micro.

## Arquitectura

```text
Mac (opsly-quantum)                    PC gamer (smdqcia-pc)
┌──────────────────────────┐           ┌──────────────────────────────┐
│ DDJ-SX2 (USB)            │           │ Juego  ──────────────────┐    │
│   │                      │           │      │  (grabación/capture)│   │
│ Serato DJ Pro  ──► mix   │           │                            ▼   │
│   │  (Serato Virtual     │           │  OBS  ──► mezcla ──► Twitch/  │
│   │   Audio / BlackHole) │           │        ./stream key          │
│   ▼                     │           │        ▲                      │
│ OBS  ──► NDI OUTPUT      │  Tailscale/│        │                      │
│  (captura audio del DJ   │◄────────  LAN  NDI │                      │
│   + webcam opcional)     │            │   │ SOURCE ◄──┘              │
└──────────────────────────┘           └──────────────────────────────┘
```

| Lado | Máquina | Rol |
|------|---------|-----|
| Audio DJ | `opsly-quantum` (100.89.38.3) | Serato DJ Pro + DDJ-SX2 (USB) |
| Transporte | NDI por red | OBS del Mac emite; OBS del PC recibe |
| Streaming | `smdqcia-pc` (100.117.5.102) | OBS mezcla juego + DJ + micro → Twitch |

Nota: el nodo real del PC con juego/SHIFT es este host (`smdqcia-pc`, `home-gpu-01`).
La DDJ-SX2 queda siempre en el Mac (no se mueve).

## Estado verificado (2026-09-22)

- Mac: Serato DJ Pro 3.2.3 corriendo, DDJ-SX2 por USB, OBS 32.1.2, `Serato Virtual Audio`
  y `BlackHole 2ch` presentes, SSH desde el PC OK (llave `~/.ssh/id_ed25519_pc_gamer2`, alias `macbook`).
- PC: OBS 32.2.2 (`C:\Program Files\obs-studio`).
- Falta en ambos: **NDI Runtime + plugin `obs-ndi`** (instalación manual con clics).

## Paso 1 — Mac: instalar NDI + obs-ndi

La instalación del plugin va **dentro del bundle de OBS** → pide la contraseña admin del usuario `dragon`.

```bash
# en el Mac (SSH: ssh macbook)
brew install --cask obs-ndi   # si brew disponible; si no, descargar el .pkg del release
# NDI Runtime (si el cask no lo incluye):
#   https://ndi.video/tools/ndi-tools  → instalar NDI Runtime (macOS)
```

Verificar después:

```bash
ls "/Applications/OBS.app/Contents/MacOS/obs-plugins/64bit/" | grep ndi   # obs-ndi.*
```

Abrir OBS en el Mac:
1. **Fuente:** Audio Input Capture → **"Serato Virtual Audio"** (o "BlackHole 2ch" si Serato envía ahí).
2. Menú **Tools → NDI Output → Start NDI Output** (o clase `obs-ndi` con "Main Output").
   - Emite nombre NDI típico: `OBS-<host>` / "MacBook Pro".
3. (Opcional) webcam del usuario como fuente adicional para enviarla también.

### Ruteo del audio de Serato (clave)

Serato DJ Pro → **Setup → Audio**:
- Con **Internal Mixer**: la mezcla master debe salir a un **dispositivo virtual**
  (`Serato Virtual Audio` o `BlackHole 2ch`) que OBS capture.
- El monitoreo: ajustar salidas de auriculares/altavoces según el uso (en la DDJ-SX2 los
  auriculares siguen por el hardware si el master pasa por el controlador).
- Alternativa física sin latencia: usar la **REC OUT** de la DDJ-SX2 hacia una interfaz
  USB/mix, y capturar esa interfaz en OBS (para este caso no hace falta porque es una Mac).

## Paso 2 — PC: instalar obs-ndi

Descargar **NDI Runtime** (Windows) + **obs-ndi** release en
`C:\Program Files\obs-studio\obs-plugins\64bit\`. Exige UAC (cuenta `opsly`).

```powershell
# (en Windows, verificado el destino)
Test-Path "C:\Program Files\obs-studio\obs-plugins\64bit\obs-ndi.dll"
# → False ahora; será True tras copiar el plugin en esa carpeta
```

En OBS del PC:
1. Menú **Tools → NDI Source** (o añadir fuente "NDI™ Source").
2. Seleccionar el NDI del Mac (**OBS-<mac>**).
3. La fuente trae **audio + video**: activar solo lo que quieras (p. ej. audio del DJ).

## Paso 3 — Mezcla y salida en el PC

En el OBS del PC, añadir lo que se transmite:

| Fuente | Cómo |
|--------|------|
| Juego/gameplay | Captura de pantalla o fuente del juego |
| DJ (audio) | La fuente NDI del Mac (o su audio) |
| Micro | Audio Input Capture del PC |
| Música de fondo (opcional) | Media Source con la playlist |

Configurar en **Settings → Stream**: servicio (Twitch/YouTube), stream key y servidor.
El audio se envía a OBS por red NDI (~baja latencia en tailnet/LAN); para más estabilidad
usar **latencia baja en la fuente NDI** y subir a Twitch con el bitrate/juego normal.

## Controlador AI-DJ (agente local)

El DJ también puede operarse por un **agente HTTP local** (`apps/ai-dj/`) que se ejecuta en el
Mac corriendo junto a OBS, y que el orquestador invoca a través de su cola de agentes locales.

| Aspecto | Valor |
|---------|-------|
| Servicio | `python3 apps/ai-dj/src/ai_dj_service.py` (HTTP `:5013`) |
| Config | env `OPSLY_AI_DJ_CONFIG` o `config.json` en cwd/src; auth Bearer opcional `OPSLY_CLI_AGENT_TOKEN` |
| Endpoints | `GET /health`, `GET /actions`, `POST /execute` (`{prompt_content, agent_role, max_steps, job_id}`) |
| Arranque autónomo | `service.sh` o `com.opsly.ai-dj.plist` (launchd del usuario `dragon`) |
| Registro orquestador | `config/external-agent-registry.json` worker `ai-dj-cli` (`opsly_job_type: local_ai_dj`, `bridge_port: 5013`, `endpoint_env: OPSLY_AI_DJ_AGENT_URL`) |
| Mapa local | `local-worker-utils.ts` (`local_ai_dj → ai-dj`), `worker-concurrency.ts` (`local-ai-dj`), `types.ts` (`JobType local_ai_dj`) |
| Concurrencia Mac | el worker del Mac consume con `OPSLY_LOCAL_AGENT_KINDS=local_ai_dj` en tu tmux/launchd |
| Raw contract | `POST /execute` → `{success: bool, result: string}`; sin `success:false` → el worker marca `success=false` como fallo |

El agente usa un **vocabulario determinista** (sin llamadas a LLM): `stream.*`, `scene.*`, `deck.*`,
`mixer.crossfader`, `setlist.*`, `library.stats`, `mapping.*`, `status.all`. No reconoce prompt libre:
una sintaxis desconocida responde `success:false` listando `/actions`.

Dependencias opcionales con fallback controlado: `serato_tools` (DB Serato), `python-rtmidi`
(MIDI virtual), `websocket-client` (OBS websocket). Si `websocket-client` falta, las acciones de
OBS devuelven `ObsError` en lugar de romper el servicio.

Verificación:

```bash
# en el Mac
curl -s http://127.0.0.1:5013/health          # {"ok":true,"service":"ai-dj",...}
curl -s http://127.0.0.1:5013/actions
curl -s -X POST http://127.0.0.1:5013/execute \
  -H 'Content-Type: application/json' \
  -d '{"prompt_content":"stream status","agent_role":"executor","max_steps":1,"job_id":"smoke-1"}'
```

## Verificación (smoke)

```bash
# 1) Mac alcanzable + OBS arriba
ssh macbook 'pgrep -x OBS >/dev/null && echo "OBS-MAC OK"'
# 2) PC OBS con plugin cargado
powershell.exe -NoProfile -Command "Test-Path 'C:\Program Files\obs-studio\obs-plugins\64bit\obs-ndi.dll'"
# 3) Confirmar que la fuente NDI respira: abrir OBS en el PC y ver FPS/latencia de la fuente
```

## Archivos y pendientes

| Pendiente | Dónde | Nota |
|-----------|-------|------|
| Instalar NDI Runtime + obs-ndi Mac | `ssh macbook` + admin `dragon` | con clics GUI |
| Instalar obs-ndi Windows | carpeta obs-plugins en el PC | UAC `opsly` |
| Configurar audio Serato → virtual | Setup → Audio en Serato | master a Serato Virtual Audio/BlackHole |
| Fuente NDI en OBS PC + stream key | OBS del PC | mezcla + salida |
| ✔ Deploy agente AI-DJ en el Mac | `~/opsly-ai-dj/apps/ai-dj` vía launchd `com.opsly.ai-dj` | venv `~/opsly-ai-dj/venv` (`python-rtmidi`, `websocket-client`; `serato_tools` descartado: depende de `llvmlite` que no compila en este Mac); `:5013/health` OK; librería 84 pistas |
| ✔ Registro orquestador `local_ai_dj` | repo, PR #1674 (`feat/ai-dj-local-agent`) | `external-agent-registry.json` + `agent-services.yaml` + maps TS; tsc + 280 tests OK |
| ✔ Mapping MIDI instalado (headless) | `~/Music/_Serato_/MIDI/Xml/opsly-ai-dj.xml` | 29 `<control>` con binding (decks A/B + hotcues 94-97 + crossfader CC84 abs); puerto virtual "OPSLY AI DJ" visible en CoreMIDI |
| Validación MIDI en vivo | Setup → MIDI en Serato | carga el mapping y probar `deck.*`/`mixer.crossfader` con música; `status all` debe dar `midi:ok` |
| ✔ Control OBS del PC: prep listo | PC OBS websocket `:4455` ya `server_enabled` + password; regla firewall tailnet TCP 4455 `remoteip=100.64.0.0/10`; tarea `opsly-obs` (lanzador interactivo); agente del Mac apuntado a `ws://100.117.5.102:4455` | queda: **abrir OBS en el escritorio del PC** (SSH/headless no inicializa: session 0 o sin log; fue OK el 16/09) y luego `status all` → `stream:off` |
| E2E orquestador → `local_ai_dj` | contrato validado (POST `/execute` en `:5013` con el envelope del worker) | full queue-path (BullMQ+Redis + `OPSLY_LOCAL_AGENT_KINDS=local_ai_dj` + approval) en ventana sin tocar la granja en ejecución |
| Instalar NDI ambos lados | Mac: NDI Runtime+.pkg y obs-ndi; PC: NDI runtime + `obs-ndi.dll` | confirmado: **no instalado en ninguno**; instaladores con GUI/admin en el escritorio |
| Fijar `ndi_name` real de la fuente NDI | `basic/scenes/Untitled.json` (PC) | hoy queda `{{NDI_NAME}}` hasta existir el sender Mac |

## Relacionado

- [`TAILSCALE-SSH-SMDQCIA-PC.md`](../04-infrastructure/TAILSCALE-SSH-SMDQCIA-PC.md) — acceso SSH/red entre PC y Mac.
- `GAMER-REVENUE-PATH.md` — contexto de monitoreo local del PC gamer.
- Ajustes de latencia OBS: usar **`settings --advanced` → network` (reducción de frame/audio) y
  considerar `ndi` buffer bajo si hay jitter en NDI.