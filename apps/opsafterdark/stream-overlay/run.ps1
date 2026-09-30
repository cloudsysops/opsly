# Punto de entrada único:  .\run.ps1 <comando> [argumento]
# El motor genérico vive en packages/stream-ops-kit/src (compartido entre tenants);
# esta carpeta solo tiene la config/datos de OpsAfterDark + los scripts de setup únicos de este tenant.
param([Parameter(Position = 0)][string]$Cmd = 'help', [Parameter(Position = 1)][string]$Arg, [Parameter(ValueFromRemainingArguments)][string[]]$Rest)
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$engine = Join-Path $dir '..\..\..\packages\stream-ops-kit\src'
$setup = Join-Path $dir 'setup'
$env:STREAM_KIT_DATA_DIR = $dir
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = (@('C:\Program Files\nodejs\node.exe', "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1) }
function Engine($script, $rest) { & $node (Join-Path $engine $script) @rest }
function Setup($script, $rest) { & $node (Join-Path $setup $script) @rest }
function Ensure-Server {
  try { Invoke-WebRequest http://127.0.0.1:8765/schedule -UseBasicParsing -TimeoutSec 2 | Out-Null }
  catch { Start-Process $node -ArgumentList (Join-Path $engine 'server.mjs') -WorkingDirectory $dir -WindowStyle Hidden; Start-Sleep 2 }
}
switch ($Cmd) {
  'preflight'  { Ensure-Server; Engine 'preflight.mjs' }
  'start'      { Ensure-Server; Start-Process $node -ArgumentList (Join-Path $engine 'auto-start.mjs') -WorkingDirectory $dir -WindowStyle Hidden; Engine 'stream-ctl.mjs' @('live') }   # EN VIVO
  'scene'      { Engine 'stream-ctl.mjs' @($Arg) }
  'stop'       { Engine 'stream-ctl.mjs' @('stop') }                                                                                                  # termina el stream
  'test-countdown' { Ensure-Server; Engine 'auto-start.mjs' @('--test', $(if ($Arg) { $Arg } else { '15' })) }
  'alert'      { Ensure-Server; Engine 'test-alert.mjs' @($(if ($Arg) { $Arg } else { 'all' })) }
  'music'      { Ensure-Server; Engine 'music.mjs' (@($Arg) + $Rest) }
  'music-check'{ Engine 'check-music-licenses.mjs' }
  'vod-audio-fix' { Engine 'fix-vod-audio.mjs' }
  'test-vod-audio' { Ensure-Server; Setup 'test-vod-audio.mjs' }
  'music-setup'{ Setup 'configure-music.mjs' }
  'test-ndi'   { Setup 'test-ndi-frame.mjs' }
  'hotkeys-on' { Start-Process powershell -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $dir 'hotkeys.ps1') -WindowStyle Hidden; Start-Sleep 3; & (Join-Path $dir 'hotkeys.ps1') status }
  'hotkeys-off'{ & (Join-Path $dir 'hotkeys.ps1') stop }
  'vod-archive'{ Engine 'vod-policy.mjs' @('archive') }                                        # registra los VODs recientes (requiere TWITCH_CLIENT_ID/TWITCH_ACCESS_TOKEN)
  'vod-check'  { Engine 'vod-policy.mjs' @('check') }                                           # avisa VODs por vencer, no borra nada
  'twitch-events' { Start-Process $node -ArgumentList (Join-Path $engine 'twitch-eventsub.mjs') -WorkingDirectory $dir -WindowStyle Hidden }  # alertas reales follow/sub/raid
  'hardware-trend' { Engine 'hardware-trend.mjs' @($(if ($Arg) { $Arg })) }                     # tendencia de GPU/temp entre sesiones
  default      { 'Comandos: preflight | start | scene <inicio|coding|juego|dj|brb|fin> | stop | test-countdown [seg] | alert [follow|sub|raid|all] | music <techno|house|buildup|drop|off|"texto"> | music-check | vod-audio-fix | test-vod-audio | music-setup | test-ndi | hotkeys-on | hotkeys-off | vod-archive | vod-check | twitch-events | hardware-trend [--all]' }
}
