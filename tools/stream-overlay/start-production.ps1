# Arranca TODA la produccion: servidor de visuales/audio, proyector (si hay) y el set en directo.
# Uso: powershell -ExecutionPolicy Bypass -File .\start-production.ps1 [-Minutes 30] [-Screen 3] [-NoProjector] [-Dry]
#   -Dry : prueba el temporizador sin cambiar escena, sin sonido y sin grabar.
param([int]$Minutes = 30, [int]$Screen = 0, [switch]$NoProjector, [switch]$Dry)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$api = 'http://127.0.0.1:8766'

function Up { try { (Invoke-WebRequest -UseBasicParsing "$api/sonify" -TimeoutSec 2).StatusCode -eq 200 } catch { $false } }
if (-not (Up)) {
  Start-Process -WindowStyle Hidden -FilePath node -ArgumentList "`"$here\vibe-live.mjs`"" -WorkingDirectory $here
  1..10 | ForEach-Object { if (-not (Up)) { Start-Sleep -Milliseconds 500 } }
  if (-not (Up)) { throw 'No arranco el servidor de visuales (vibe-live.mjs).' }
}
if (-not (Get-Process obs64 -ErrorAction SilentlyContinue)) { throw 'OBS no esta abierto.' }

if (-not $NoProjector) {
  Add-Type -AssemblyName System.Windows.Forms
  $n = [System.Windows.Forms.Screen]::AllScreens.Count
  if ($Screen -eq 0) { $Screen = if ($n -ge 3) { 3 } else { 0 } }
  if ($Screen -ge 1 -and $Screen -le $n) { & "$here\projector.ps1" -Screen $Screen }
  else { Write-Host "Proyector: Windows solo ve $n pantalla(s). Conectalo/extiendelo (Win+P > Extender) y corre projector.ps1 -Screen N." }
}

$q = if ($Dry) { "&dry=1" } else { "" }
$r = Invoke-RestMethod "$api/set/start?min=$Minutes$q"
"Set iniciado: $($r.minutes) min · $($r.set.name) -> $($r.set.next) · grabando en: $($r.rec)"
