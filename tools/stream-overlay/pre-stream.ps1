# Revision previa de TODO antes de salir en vivo. Un solo comando; dice LISTO o REVISAR.
#   powershell -ExecutionPolicy Bypass -File .\pre-stream.ps1        -> revisa (y asegura que los servicios esten arriba)
#   powershell -ExecutionPolicy Bypass -File .\pre-stream.ps1 -Go    -> ademas aplica el modo juego y deja el vigilante esperando a que salgas en vivo
# NO inicia el stream, NO abre el juego, NO cambia escenas ni ajustes de OBS.
param([switch]$Go)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = (Get-Command node -ErrorAction SilentlyContinue).Source; if (-not $node) { $node = 'C:\Program Files\nodejs\node.exe' }
$gb = [math]::Pow(1GB, -1); $rows = @()
function Chk([bool]$ok, [string]$name, [string]$detail = '', [string]$level = 'fail') { $script:rows += [pscustomobject]@{ ok = $ok; level = $level; name = $name; detail = $detail } }

& "$dir\start-services.ps1" | Out-Null
Start-Sleep -Seconds 2

# --- servicios
foreach ($p in @(@(8765, 'Overlays (:8765)'), @(8766, 'Musica y paneles (:8766)'))) { Chk ([bool](Get-NetTCPConnection -LocalPort $p[0] -State Listen -ErrorAction SilentlyContinue)) $p[1] }
Chk ([bool](Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'scene-watch' })) 'Vigilante de escenas (BF6)' '' 'warn'

# --- OBS
$s = (& $node "$dir\obs-state.mjs") | ConvertFrom-Json
if (-not $s.ok) { Chk $false 'OBS responde por websocket' $s.error }
else {
    Chk $true 'OBS responde' "perfil $($s.profile) | escena $($s.scene)"
    Chk ($s.canvas -eq '1920x1080') 'Lienzo 1920x1080' "$($s.canvas) -> $($s.output) @$($s.fps)" 'warn'
    Chk (-not $s.studio) 'Modo Estudio apagado' $(if ($s.studio) { 'ENCENDIDO: duplica el render y confunde que escena sale al aire' } else { '' })
    Chk ($s.renderMs -lt 8) 'Render de OBS holgado' "$($s.renderMs) ms por fotograma (limite 16,7)" 'warn'
    if ($s.live) { Chk $true 'Estado del directo' 'YA ESTAS EN VIVO' 'info' } else { Chk $true 'Estado del directo' 'fuera de linea (listo para salir)' 'info' }
    $pd = Join-Path $env:APPDATA ('obs-studio\basic\profiles\' + $s.profile)
    $enc = Get-Content (Join-Path $pd 'streamEncoder.json') -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json
    if ($enc) { Chk (($enc.multipass -eq 'disabled') -and ($enc.preset -match 'p[1-4]$')) 'Codificador ligero (P1-P4, una pasada)' "preset $($enc.preset), multipass $($enc.multipass), $($enc.bitrate) kbps" 'warn' }
}
# --- el preflight del proyecto (escenas reales, audio en pistas, clave, disco)
$pf = (& $node "$dir\preflight.mjs") 2>&1 | Out-String
$bad = @($pf -split "`n" | Where-Object { $_ -match '^\S*❌' -and $_ -notmatch 'Battlefield 6 abierto' })
Chk ($bad.Count -eq 0) 'Preflight del proyecto (escenas, audio, clave de stream)' $(if ($bad.Count) { ($bad -join ' || ').Trim() } else { 'todo en verde' })

# --- red
$ad = Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | Select-Object -First 1
Chk ($ad -and $ad.MediaType -match '802.3|Ethernet' -or $ad.Name -match 'Ethernet') 'Conexion por cable' "$($ad.Name) $($ad.LinkSpeed)" 'warn'
$pg = Test-Connection -ComputerName 1.1.1.1 -Count 10 -ErrorAction SilentlyContinue
if ($pg) { $avg = ($pg | Measure-Object -Property ResponseTime -Average).Average; $lost = 10 - @($pg).Count; Chk (($lost -eq 0) -and ($avg -lt 40)) 'Internet estable' "ping medio $([math]::Round($avg)) ms, perdidos $lost de 10" } else { Chk $false 'Internet estable' 'sin respuesta' }

# --- disco y juego
$c = Get-Volume -DriveLetter C; Chk (($c.SizeRemaining * $gb) -gt 40) 'Espacio en C: > 40 GB' ("{0:N0} GB libres" -f ($c.SizeRemaining * $gb))
$onSsd = Test-Path 'C:\Program Files (x86)\Steam\steamapps\appmanifest_2807960.acf'
Chk $onSsd 'Battlefield 6 instalado en el SSD (C:)' $(if ($onSsd) { '' } else { 'esta en el HDD: habra tirones' }) 'warn'

# --- estabilidad de GPU
$ev = @(Get-WinEvent -FilterHashtable @{LogName = 'System'; ProviderName = 'nvlddmkm'; StartTime = (Get-Date).AddHours(-12)} -ErrorAction SilentlyContinue)
Chk ($ev.Count -eq 0) 'Sin fallos de GPU en las ultimas 12 h' $(if ($ev.Count) { "$($ev.Count) eventos nvlddmkm; ultimo $($ev[0].TimeCreated.ToString('dd/MM HH:mm'))" } else { '' }) 'warn'
$bf = Get-Process bf6 -ErrorAction SilentlyContinue
Chk $true 'Battlefield 6' $(if ($bf) { 'abierto' } else { 'cerrado (abrelo antes de salir)' }) 'info'

# --- carga de fondo que pesa
$chrome = @(Get-Process chrome -ErrorAction SilentlyContinue).Count; $ag = @('Cursor', 'claude', 'ChatGPT') | ForEach-Object { if (Get-Process $_ -ErrorAction SilentlyContinue) { $_ } }
Chk (($chrome -le 10) -and (-not $ag)) 'Programas pesados cerrados' "Chrome: $chrome procesos | agentes abiertos: $(if ($ag) { $ag -join ', ' } else { 'ninguno' })" 'warn'
$cpu = [math]::Round((Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 2 -MaxSamples 2).CounterSamples[-1].CookedValue)
Chk ($cpu -lt 40) 'CPU en reposo baja (< 40 %)' "$cpu % ahora (sin juego)" 'warn'

# --- resultado
""; "=== REVISION PREVIA $((Get-Date).ToString('dd/MM HH:mm')) ==="
foreach ($r in $rows) { $m = if ($r.level -eq 'info') { 'ℹ ' } elseif ($r.ok) { '✅' } elseif ($r.level -eq 'warn') { '⚠ ' } else { '❌' }; "{0} {1}{2}" -f $m, $r.name, $(if ($r.detail) { " - $($r.detail)" } else { '' }) }
$fails = @($rows | Where-Object { -not $_.ok -and $_.level -eq 'fail' }); $warns = @($rows | Where-Object { -not $_.ok -and $_.level -eq 'warn' })
""; if ($fails.Count) { "RESULTADO: REVISAR ($($fails.Count) problema(s) bloqueante(s), $($warns.Count) aviso(s))" } elseif ($warns.Count) { "RESULTADO: LISTO CON AVISOS ($($warns.Count))" } else { "RESULTADO: LISTO PARA SALIR" }

if ($Go) {
    ""; "-- Modo juego --"; & "$dir\game-mode.ps1"
    if (-not (Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'stream-health' })) { Start-Process -WindowStyle Hidden -FilePath $node -ArgumentList "`"$dir\stream-health.mjs`" 240" -WorkingDirectory $dir; "Vigilante de salud: esperando a que salgas en vivo (registro: stream-health.log)" } else { "Vigilante de salud: ya estaba corriendo" }
    "Ahora pulsa Start Streaming en OBS."
}
