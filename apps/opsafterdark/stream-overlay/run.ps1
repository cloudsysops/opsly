# Punto de entrada único:  .\run.ps1 <comando> [argumento]
param([Parameter(Position = 0)][string]$Cmd = 'help', [Parameter(Position = 1)][string]$Arg, [Parameter(ValueFromRemainingArguments)][string[]]$Rest)
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = (@('C:\Program Files\nodejs\node.exe', "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1) }
function Node($script, $rest) { & $node (Join-Path $dir $script) @rest }
function Ensure-Server {
  try { Invoke-WebRequest http://127.0.0.1:8765/schedule -UseBasicParsing -TimeoutSec 2 | Out-Null }
  catch { Start-Process $node -ArgumentList (Join-Path $dir 'server.mjs') -WorkingDirectory $dir -WindowStyle Hidden; Start-Sleep 2 }
}
switch ($Cmd) {
  'preflight'  { Ensure-Server; Node 'preflight.mjs' }
  'start'      { Ensure-Server; Start-Process $node -ArgumentList (Join-Path $dir 'auto-start.mjs') -WorkingDirectory $dir -WindowStyle Hidden; Node 'stream-ctl.mjs' @('live') }   # EN VIVO
  'scene'      { Node 'stream-ctl.mjs' @($Arg) }
  'stop'       { Node 'stream-ctl.mjs' @('stop') }                                                                                                  # termina el stream
  'test-countdown' { Ensure-Server; Node 'auto-start.mjs' @('--test', $(if ($Arg) { $Arg } else { '15' })) }
  'alert'      { Ensure-Server; Node 'test-alert.mjs' @($(if ($Arg) { $Arg } else { 'all' })) }
  'music'      { Ensure-Server; Node 'music.mjs' (@($Arg) + $Rest) }
  'music-check'{ Node 'check-music-licenses.mjs' }
  'vod-audio-fix' { Node 'fix-vod-audio.mjs' }
  'test-vod-audio' { Ensure-Server; Node 'test-vod-audio.mjs' }
  'music-setup'{ Node 'configure-music.mjs' }
  'test-ndi'   { Node 'test-ndi-frame.mjs' }
  'hotkeys-on' { Start-Process powershell -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $dir 'hotkeys.ps1') -WindowStyle Hidden; Start-Sleep 3; & (Join-Path $dir 'hotkeys.ps1') status }
  'hotkeys-off'{ & (Join-Path $dir 'hotkeys.ps1') stop }
  default      { 'Comandos: preflight | start | scene <inicio|coding|juego|dj|brb|fin> | stop | test-countdown [seg] | alert [follow|sub|raid|all] | music <techno|house|buildup|drop|off|"texto"> | music-check | vod-audio-fix | test-vod-audio | music-setup | test-ndi | hotkeys-on | hotkeys-off' }
}
