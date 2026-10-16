# Post-stream automatico para OpsAfterDark: corta borradores de clips cuando termina una grabacion de OBS.
# NO publica nada. No corre si OBS esta en directo. Pensado para Task Scheduler cada 15 min (ver README).
# Uso manual:  powershell -File post-stream-clips.ps1 [-Dry]
param([switch]$Dry)

# 'Continue': en PS 5.1, el stderr de node fusionado con 2>&1 se vuelve ErrorRecord y con 'Stop' abortaria el script.
$ErrorActionPreference = 'Continue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = (Resolve-Path (Join-Path $here '..\..\..')).ProviderPath
$script = Join-Path $repo 'packages\stream-ops-kit\src\post-stream-clips.mjs'
$env:STREAM_KIT_DATA_DIR = $here

# Una sola instancia a la vez (cortar es pesado y ffmpeg tarda minutos).
$mutex = New-Object System.Threading.Mutex($false, 'Global\OpsAfterDark-PostStream-Clips')
if (-not $mutex.WaitOne(0)) { Write-Host 'Ya hay una ejecucion en curso.'; exit 0 }
try {
  # Prioridad baja para no molestar si se abre un juego u OBS.
  (Get-Process -Id $PID).PriorityClass = 'BelowNormal'
  $nodeArgs = @($script, '--horizontal-dir', 'D:\Content\Media\OBS\horizontal', '--vertical-dir', 'D:\Content\Media\OBS\vertical', '--out', 'D:\Content\PostStream')
  $template = Join-Path $here 'spectate-template.json'
  if (Test-Path $template) { $nodeArgs += @('--spectate-template', $template) }
  if ($Dry) { $nodeArgs += '--dry' }
  $log = 'D:\Content\PostStream\_auto-clips.log'
  New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null
  "== $(Get-Date -Format s) ==" | Add-Content $log
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8  # node escribe UTF-8
  & node @nodeArgs 2>&1 | ForEach-Object { "$_"; "$_" | Out-File -FilePath $log -Append -Encoding utf8 }
  $code = $LASTEXITCODE
} finally { $mutex.ReleaseMutex() }
exit $code
