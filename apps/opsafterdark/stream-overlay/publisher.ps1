# Publicador de OpsAfterDark (YouTube, via el YouTubePublisher existente). Pensado para Task Scheduler cada 15 min.
# NO se registra solo: ver docs/04-infrastructure/OPSAFTERDARK-PUBLISHING-SETUP.md.
#
# Seguridad: (1) no corre con OBS en directo ni con OBS abierto sin websocket; (2) Doppler recibe SOLO los 4 secretos
# necesarios (--only-secrets); (3) sin YOUTUBE_OPSAFTERDARK_REFRESH_TOKEN no sube nada; (4) solo publica entradas
# aprobadas y vencidas, maximo 1 al dia; (5) PUBLISH_DISABLED en la carpeta de la cola lo apaga.
# Uso manual:  powershell -File publisher.ps1 -Dry        |  publisher.ps1 -Status  |  publisher.ps1 -Approve <id|all>
param([switch]$Dry, [switch]$Status, [string]$Approve)

$ErrorActionPreference = 'Continue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = (Resolve-Path (Join-Path $here '..\..\..')).ProviderPath
$src = Join-Path $repo 'packages\stream-ops-kit\src'
$env:STREAM_KIT_DATA_DIR = $here
$queue = 'D:\Content\PostStream\publish-queue.json'
$log = 'D:\Content\PostStream\_publisher.log'
New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function Log($m) { "[$(Get-Date -Format s)] $m" | Out-File -FilePath $log -Append -Encoding utf8; Write-Host $m }

# Estado y aprobacion no necesitan secretos ni OBS: corren con node de Windows.
if ($Status) { & node (Join-Path $src 'publisher.mjs') --queue $queue status; exit $LASTEXITCODE }
if ($Approve) {
  $a = if ($Approve -eq 'all') { @('approve', '--all') } else { @('approve', $Approve) }
  & node (Join-Path $src 'publisher.mjs') --queue $queue @a
  exit $LASTEXITCODE
}

$mutex = New-Object System.Threading.Mutex($false, 'Global\OpsAfterDark-Publisher')
if (-not $mutex.WaitOne(0)) { Write-Host 'Ya hay una ejecucion en curso.'; exit 0 }
$code = 0
try {
  if (-not (Test-Path $queue)) { Log 'No existe publish-queue.json: nada que publicar.'; exit 0 }
  # Guardia de OBS (node de Windows: puede hablar con el websocket). 0 = idle/cerrado; 10 = directo o desconocido.
  $obs = (& node (Join-Path $src 'obs-state.mjs') 2>$null | Select-Object -Last 1)
  if ($LASTEXITCODE -ne 0) { Log "OBS en estado '$obs': no se publica ahora."; exit 0 }

  # La subida corre en WSL (tsx + lib/content-studio). Rutas de Windows -> /mnt/<unidad>/...
  $wslRepo = '/home/opsly/opsly-wt-stream-ops-kit'
  $wslQueue = '/mnt/d/Content/PostStream/publish-queue.json'
  $secrets = 'YOUTUBE_CLIENT_ID,YOUTUBE_CLIENT_SECRET,YOUTUBE_OPSAFTERDARK_REFRESH_TOKEN,YOUTUBE_OPSAFTERDARK_PRIVACY,MAKE_OPSAFTERDARK_WEBHOOK_URL,GOOGLE_SERVICE_ACCOUNT_JSON,OPSLY_DRIVE_ROOT_FOLDER_ID,MAKE_OPSAFTERDARK_DRIVE_FOLDER_ID'
  # $Dry is a [switch]; use another name (PS vars are case-insensitive).
  $dryArg = if ($Dry.IsPresent) { '--dry' } else { '' }
  $cmd = "cd $wslRepo && doppler run -p ops-intcloudsysops -c prd --only-secrets $secrets -- node_modules/.bin/tsx packages/stream-ops-kit/src/publisher.mjs --queue $wslQueue --adapters packages/stream-ops-kit/src/opsafterdark-adapters.mjs --no-obs-check $dryArg"
  & wsl.exe -e bash -lc $cmd 2>&1 | ForEach-Object { Log "$_" }
  $code = $LASTEXITCODE
} finally { $mutex.ReleaseMutex() }
exit $code
