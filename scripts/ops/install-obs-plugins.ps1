# Instala plugins de OBS (lienzo vertical + multistream) desde GitHub Releases.
# Windows / PowerShell 5.1+. Cierra OBS antes de correrlo.
#
# Uso:
#   .\install-obs-plugins.ps1 -DryRun
#   .\install-obs-plugins.ps1
#   .\install-obs-plugins.ps1 -Multistream aitum
param(
  [ValidateSet('multi-rtmp', 'aitum', 'none')]
  [string]$Multistream = 'multi-rtmp',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$plugins = @(@{ Name = 'Aitum Vertical'; Repo = 'Aitum/obs-vertical-canvas' })
switch ($Multistream) {
  'multi-rtmp' { $plugins += @{ Name = 'obs-multi-rtmp'; Repo = 'sorayuki/obs-multi-rtmp' } }
  'aitum'      { $plugins += @{ Name = 'Aitum Multistream'; Repo = 'Aitum/obs-aitum-multistream' } }
}

if (Get-Process -Name obs64 -ErrorAction SilentlyContinue) {
  throw 'OBS esta abierto. Cierralo y vuelve a correr el script.'
}

function Get-WindowsAsset($repo) {
  $release = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest" -Headers @{ 'User-Agent' = 'opsly-obs-installer' }
  $assets = $release.assets | Where-Object { $_.name -match '(?i)(windows|win64|x64)' -and $_.name -match '\.(exe|zip)$' }
  $asset = @($assets | Where-Object { $_.name -match '\.exe$' }) + @($assets) | Select-Object -First 1
  if (-not $asset) {
    $names = ($release.assets | ForEach-Object { $_.name }) -join ', '
    throw "No hay asset de Windows en $repo $($release.tag_name). Assets: $names"
  }
  [pscustomobject]@{ Tag = $release.tag_name; Asset = $asset }
}

$tmp = Join-Path $env:TEMP 'opsly-obs-plugins'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

foreach ($p in $plugins) {
  $found = Get-WindowsAsset $p.Repo
  $file = Join-Path $tmp $found.Asset.name
  Write-Host "$($p.Name) $($found.Tag) -> $($found.Asset.name)"
  if ($DryRun) { continue }

  Invoke-WebRequest $found.Asset.browser_download_url -OutFile $file -UseBasicParsing
  Write-Host "  SHA256: $((Get-FileHash $file -Algorithm SHA256).Hash)"

  if ($file -match '\.exe$') {
    Start-Process $file -Wait
  } else {
    $dest = Join-Path $tmp ([IO.Path]::GetFileNameWithoutExtension($file))
    Expand-Archive $file -DestinationPath $dest -Force
    Write-Host "  Zip extraido en $dest."
    Write-Host "  Copia su contenido a C:\Program Files\obs-studio (carpetas obs-plugins y data)."
  }
}

Write-Host 'Listo. Abre OBS > Docks para activar los paneles nuevos.'
