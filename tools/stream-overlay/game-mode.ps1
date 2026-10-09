# Modo juego: libera CPU para el juego y OBS sin tocar el juego ni su anti-cheat.
#   powershell -ExecutionPolicy Bypass -File .\game-mode.ps1        -> activa
#   powershell -ExecutionPolicy Bypass -File .\game-mode.ps1 -Off   -> revierte (prioridad normal)
# NO toca: bf6.exe, EA anti-cheat, Discord, audio, controladores. No cierra ningun programa.
param([switch]$Off)
$bg = 'chrome', 'Cursor', 'claude', 'ChatGPT', 'OneDrive', 'OneDrive.Sync.Service', 'steamwebhelper', 'msedgewebview2', 'msedge', 'OSCApplicationManager', 'WidgetBoard', 'node'
if ($Off) {
    $n = 0
    foreach ($name in $bg) { Get-Process $name -ErrorAction SilentlyContinue | ForEach-Object { try { $_.PriorityClass = 'Normal'; $n++ } catch { } } }
    Get-Process obs64 -ErrorAction SilentlyContinue | ForEach-Object { try { $_.PriorityClass = 'Normal' } catch { } }
    "Modo juego APAGADO: $n procesos de fondo vuelven a prioridad normal."
    return
}
$log = @()
Get-Process TextInputHost -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.Id -Force -ErrorAction Stop; $log += 'TextInputHost reiniciado' } catch { } }
Get-Process obs64 -ErrorAction SilentlyContinue | ForEach-Object { try { $_.PriorityClass = 'AboveNormal'; $log += 'OBS -> AboveNormal' } catch { $log += "OBS: $($_.Exception.Message)" } }
$n = 0
foreach ($name in $bg) { Get-Process $name -ErrorAction SilentlyContinue | ForEach-Object { try { if ($_.PriorityClass -eq 'Normal') { $_.PriorityClass = 'BelowNormal'; $n++ } } catch { } } }
$log += "procesos de fondo -> BelowNormal: $n"
$log
