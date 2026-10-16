# Mantiene la escena vertical (Aitum) alineada con la escena horizontal de OBS. Solo cambia la escena VERTICAL.
# Pensado para Task Scheduler al iniciar sesion (ver README). Una sola instancia; se reconecta solo si OBS se cierra.
# Uso manual:  powershell -File vertical-sync.ps1 [-Once] [-Dry]
param([switch]$Once, [switch]$Dry)

# 'Continue': en PS 5.1, el stderr de node fusionado con 2>&1 se vuelve ErrorRecord y con 'Stop' abortaria el script.
$ErrorActionPreference = 'Continue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = (Resolve-Path (Join-Path $here '..\..\..')).ProviderPath
$script = Join-Path $repo 'packages\stream-ops-kit\src\vertical-sync.mjs'
$env:STREAM_KIT_DATA_DIR = $here

$mutex = New-Object System.Threading.Mutex($false, 'Global\OpsAfterDark-Vertical-Sync')
if (-not $mutex.WaitOne(0)) { Write-Host 'Ya hay una instancia en ejecucion.'; exit 0 }
$code = 0
try {
  $nodeArgs = @($script)
  if ($Once) { $nodeArgs += '--once' }
  if ($Dry) { $nodeArgs += '--dry' }
  $log = 'D:\Content\PostStream\_vertical-sync.log'
  New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8  # node escribe UTF-8; sin esto el log muestra "ΓÇö" en vez de "—"
  & node @nodeArgs 2>&1 | ForEach-Object { "$_" | Out-File -FilePath $log -Append -Encoding utf8 }
  $code = $LASTEXITCODE
} finally { $mutex.ReleaseMutex() }
exit $code
