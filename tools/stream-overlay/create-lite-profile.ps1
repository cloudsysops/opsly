# Crea el perfil de OBS "OpsAfterDark-LITE": 1080p a 30 fps, 4500 kbps CBR, NVENC P3 sin psycho-AQ.
# Copia tu perfil actual (incluida la clave de stream, que queda solo en tu AppData) y cambia SOLO fps/bitrate/preset.
# NO activa el perfil: se elige en OBS (menu Perfil) con el stream APAGADO; OBS no deja cambiar de perfil en directo.
#   powershell -ExecutionPolicy Bypass -File .\create-lite-profile.ps1 [-Force]
param([switch]$Force)
$root = Join-Path $env:APPDATA 'obs-studio\basic\profiles'
$ini = Join-Path $env:APPDATA 'obs-studio\user.ini'
$cur = ((Select-String -Path $ini -Pattern '^ProfileDir=(.+)$' | Select-Object -First 1).Matches.Groups[1].Value).Trim()
$src = Join-Path $root $cur; $name = 'OpsAfterDark-LITE'; $dst = Join-Path $root $name
if (-not (Test-Path $src)) { throw "No encuentro el perfil actual ($cur)" }
if ((Test-Path $dst) -and -not $Force) { "El perfil $name ya existe (usa -Force para recrearlo)."; return }
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
New-Item -ItemType Directory -Path $dst | Out-Null
Get-ChildItem $src -File | Where-Object { $_.Name -notmatch '\.bak' } | ForEach-Object { Copy-Item $_.FullName (Join-Path $dst $_.Name) }
# basic.ini: nombre del perfil y 30 fps (FPSType=2 = fraccion FPSNum/FPSDen)
$b = Join-Path $dst 'basic.ini'; $t = Get-Content $b -Raw
$t = $t -replace '(?m)^Name=.*$', "Name=$name"
$t = $t -replace '(?m)^FPSNum=\d+', 'FPSNum=30' -replace '(?m)^FPSCommon=\d+', 'FPSCommon=30'
[IO.File]::WriteAllText($b, $t, (New-Object Text.UTF8Encoding($false)))
# codificador de directo
$e = Join-Path $dst 'streamEncoder.json'; $j = Get-Content $e -Raw | ConvertFrom-Json
$j.bitrate = 4500; $j.preset = 'p3'; $j.preset2 = 'p3'; $j.psycho_aq = $false; $j.multipass = 'disabled'; $j.lookahead = $false
[IO.File]::WriteAllText($e, ($j | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding($false)))
"Perfil creado: $dst"
"  fps: " + ((Select-String -Path $b -Pattern '^FPSNum=').Line) + " | " + (Get-Content $e -Raw)
