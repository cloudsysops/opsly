# Levanta los servicios del stream si NO estan corriendo (idempotente; seguro de ejecutar varias veces).
# Se llama desde Opsly-Workstation-Startup.cmd ANTES de abrir OBS, para que las fuentes de navegador carguen bien.
# No inicia el stream, no abre el juego, no toca OBS.   Uso: powershell -ExecutionPolicy Bypass -File .\start-services.ps1
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = (Get-Command node -ErrorAction SilentlyContinue).Source; if (-not $node) { $node = 'C:\Program Files\nodejs\node.exe' }
$log = Join-Path $dir 'start-services.log'
function Log($m) { Add-Content $log ("[{0}] {1}" -f (Get-Date -Format 'dd/MM HH:mm:ss'), $m) }
function Running($pat) { [bool](Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match [regex]::Escape($pat) }) }
function Start-Node($script, $argsText = '') { Start-Process -WindowStyle Hidden -FilePath $node -ArgumentList ("`"$dir\$script`" $argsText").Trim() -WorkingDirectory $dir; Log "lanzado $script" }

# 1) overlays originales (:8765). Si WSL ya sirve ese puerto, no se duplica.
if (-not (Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)) { Start-Node 'server.mjs' } else { Log 'server.mjs: el puerto 8765 ya esta en uso, no se lanza' }
# 2) musica / paneles / medidores (:8766). Arranca con el sonido APAGADO.
if (-not (Running 'vibe-live.mjs')) { Start-Node 'vibe-live.mjs' }
# 3) cambio de escena segun Battlefield 6. (stream-health.mjs NO se arranca aqui: se cierra solo cuando no hay directo; lanzalo al salir en vivo)
if (-not (Running 'scene-watch.mjs')) { Start-Node 'scene-watch.mjs' }
Start-Sleep -Seconds 3
foreach ($p in 8765, 8766) { Log ("puerto {0}: {1}" -f $p, $(if (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) { 'OK' } else { 'SIN RESPUESTA' })) }
