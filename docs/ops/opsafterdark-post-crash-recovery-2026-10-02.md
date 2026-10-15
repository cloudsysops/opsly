# Recuperación post-crash OpsAfterDark — 2026-10-02

Trazabilidad de la recuperación ejecutada el 2026-10-02 en la estación de
work/stream OpsAfterDark (Windows + WSL2). Documenta qué se cambió, cómo
restaurarlo y qué quedó fuera de alcance.

## Contexto del incidente

| Dato | Valor |
| --- | --- |
| Estación | `DESKTOP-SMDQCIA` |
| Entorno | Windows con WSL2 (Ubuntu) para OpenCode y Mission Control |
| BSOD | `0x154 UNEXPECTED_STORE_EXCEPTION` (decimal `340`) |
| Causa raíz | RAM mixta: 2×16 GB Crucial + 1×8 GB Kingston |
| Ámbito | Hardware. No se resuelve por software |

El módulo defectuoso de 8 GB no se puede aislar desde el sistema operativo, así
que la mitigación es de hardware: sustituirlo por un módulo del mismo tipo que
los otros dos. Nada de lo descrito abajo evita que el BSOD vuelva a ocurrir.

## Cambios aplicados

### 1. Automatización de escenas: la escena idle ya no es BRB

Cuando `bf6.exe` deja de existir, la automatización cortaba a
`"Vuelvo en un momento"`, que se quedaba en pantalla vacía durante toda la
sesión. Ahora selecciona `"OAD_FACTORY_FOCUS"`.

`"Vuelvo en un momento"` sigue existiendo como escena manual; solo deja de
activarse sola.

- Código: `scripts/ops/obs-scene-automation.ps1` (PR #1680)
- Eliminado `$SceneBrb`, que quedaba sin uso.

### 2. Deriva entre el script del repo y el desplegado (corregida)

El repo nombraba el cliente WebSocket `obs-ws-client.ps1` (guiones, como el
resto de `scripts/ops/`) y el despliegue en Windows lo tenía como
`obs_ws_client.ps1` (guion bajo). El contenido era idéntico, pero desplegar
desde el repo habría roto el `dot-source`.

Se renombró el archivo en Windows y se redesplegó el script desde el repo.
Ambos son ahora byte-idénticos:

```
b76eabbb1aaa8d4fb061de20373b115de54885e609849d1ff88108c0fee578f6  repo (scripts/ops/obs-scene-automation.ps1)
b76eabbb1aaa8d4fb061de20373b115de54885e609849d1ff88108c0fee578f6  win:obs-scene-automation.ps1
```

El cliente WebSocket no cambió de contenido, solo de nombre:

```
265d8e2af155dd45b3dc6f24bd43cd7368fc80755c3cd99aca979b06c00f74e2  win:obs-ws-client.ps1
```

> El cliente WebSocket sigue leyendo la contraseña del archivo de
> configuración local de OBS. **Ese archivo no se versiona aquí.**

### 3. Autostart idempotente de la estación

Snapshot en `scripts/ops/opsly-workstation-startup.cmd`. Lanza OBS, Cursor,
OpenCode (Windows Terminal) y ChatGPT, cada uno solo si no está corriendo.

Deliberadamente **excluidos**: Claude, BF6, Steam y cualquier inicio de
stream. OBS abre en `Ready` y el operador pulsa `Start Streaming` a mano, para
que un reinicio de la estación nunca publique por sorpresa.

### 4. Ruta del log de Mission Control

La unidad escribía el log en `/tmp/opencode/`, que no sobrevive a un reinicio
de WSL. Ahora usa `~/.local/state/opsly/`.

Snapshot en `infra/systemd/opsly-mission-control-preview.service`.

## Estado verificado

Comprobado el 2026-10-02 tras los cambios:

| Comprobación | Resultado |
| --- | --- |
| `opsly-mission-control-preview.service` | `active` |
| `http://127.0.0.1:4001/mission-control/live?mode=dev` | HTTP `200` |
| `npm run type-check` (Turbo) | `79/79 successful` |
| OBS | stream OFF, escena `OAD_FACTORY_FOCUS` |
| Captura de ventana | `method=2` (WGC); no queda ningún `method=1` (BitBlt) |
| Colección de escenas | las 6 escenas cargan |

El `method=2` se verificó sobre la colección viva: los únicos valores `method`
presentes son `0` y `2`. La copia de seguridad de la colección es byte-idéntica
a la actual, así que el ajuste WGC ya estaba aplicado cuando se tomó; este
documento lo registra como **estado verificado**, no como cambio de esta
ventana.

## Backups locales

Fuera del repo, en la estación. `sha256` para verificar integridad.

| Archivo | `sha256` |
| --- | --- |
| `win:AppData/Roaming/obs-studio/basic/scenes/OpsAfterDark.json` | `1b33a08312e50443871dc0d0db3e063fff9043b50744af8907905b05b05e78f6` |
| `…/OpsAfterDark.json.bak-recovery-20261002-222519` | `1b33a08312e50443871dc0d0db3e063fff9043b50744af8907905b05b05e78f6` |
| `win:obs-scene-automation.ps1.bak-20261002-223754` | `10ee970fe1293999e2d1c826b56f8e19f81b3ebd69c054e0a99fe2600b87ec9c` |
| `win:obs_ws_client.ps1.bak-20261002-230125` | `265d8e2af155dd45b3dc6f24bd43cd7368fc80755c3cd99aca979b06c00f74e2` |
| `…/Startup/Opsly-Workstation-Startup.cmd.bak-20261002-222519` | `cb03f019f0777a9ff7137559c14d02b901665fc0fd07a53f8576e1bebdae6ffa` |
| `wsl:.config/systemd/user/…service.bak-20261002-2242` | `8d2f588fdb05907f24ea92f45e9093f11999a3b8588e837e997da99578107872` |
| `win:opsly-obs-task.xml.bak-20261002-222519` | `bcb7e85505788a52bdf52877234dbe2126524916019e561a4903868c43628784` |
| `win:OBS-Scene-Automation-BF6-task.xml.bak-20261002-222519` | `fb75caaf252d83e807da7d4394be2e9a9ff71c5366b2062fbbeffff37e47c2f7` |

### Qué NO se versiona, y por qué

- **La colección de escenas de OBS** (`OpsAfterDark.json`, 211 302 bytes).
  Contiene rutas locales y layout de capturas específico de la máquina. Queda
  solo en los backups de arriba.
- **La configuración del WebSocket de OBS**, que incluye la contraseña.
- **Los XML de las tareas programadas**, son volcados de una sola máquina.
- **Las rutas absolutas** de los snapshots de unidad y autostart son las de
  esta estación. Al desplegar en otra máquina hay que ajustar `WorkingDirectory`,
  `ExecStart` y las rutas de `C:\Users\opsly\`.

## Restauración

```bash
# Script de escenas (idéntico al commiteado)
cp scripts/ops/obs-scene-automation.ps1 /mnt/c/Users/opsly/obs-scene-automation.ps1
cp scripts/ops/obs-ws-client.ps1         /mnt/c/Users/opsly/obs-ws-client.ps1

# Unidad de Mission Control
mkdir -p ~/.local/state/opsly
cp infra/systemd/opsly-mission-control-preview.service \
   ~/.config/systemd/user/opsly-mission-control-preview.service
systemctl --user daemon-reload
systemctl --user restart opsly-mission-control-preview.service

# Autostart
cp scripts/ops/opsly-workstation-startup.cmd \
   "/mnt/c/Users/opsly/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup/Opsly-Workstation-Startup.cmd"
```

## Pendientes

- **Sustituir el módulo RAM de 8 GB** (Definity 4). Es la única forma de
  eliminar la causa del BSOD.
- **La colección de escenas sigue sin control de versiones.** Cualquier cambio
  en OBS es local y se pierde con la estación. Es el hueco de trazabilidad que
  este PR no cierra.
- **`opsly-obs` sigue habilitada** y no se puede deshabilitar sin cuenta
  administradora. Hoy no compite: es un `TimeTrigger` de una sola ejecución que
  ya disparó el 2026-09-25 y no tiene `NextRunTime`. Si vuelve a armar un
  trigger, es la que competirá con el OBS abierto por el autostart.
  ```powershell
  Disable-ScheduledTask -TaskName 'opsly-obs'
  ```

## Fuera de alcance

No se hizo, y no debe hacerse como parte de esta recuperación:

- Cambios de BIOS/UEFI (configuración de memoria, XMP/EXPO).
- Reemplazo físico de RAM.
- Reinstalación de Windows u OBS.
- Cualquier modificación de las 9 diferencias de trabajo ajenas que ya había
  en `feat/mission-control-live-obs` (`system_state.json`,
  `MissionControlLiveBoard.tsx`, `scripts/ci/scan-orphan-content-pipelines.*`,
  `tools/live-automation/*`).