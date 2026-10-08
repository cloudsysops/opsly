# Abre los visuales del festival a pantalla completa en el proyector.
# Uso: powershell -File projector.ps1            (usa la 2a pantalla)
#      powershell -File projector.ps1 -Screen 1  (1 = principal, 2 = la siguiente...)
#      powershell -File projector.ps1 -Close     (cierra la ventana del proyector)
param([int]$Screen = 2, [switch]$Close)
$profile = Join-Path $env:TEMP 'oad-projector-profile'
if ($Close) { Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object CommandLine -match 'oad-projector-profile' | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }; return }
Add-Type -AssemblyName System.Windows.Forms
$screens = [System.Windows.Forms.Screen]::AllScreens
if ($Screen -lt 1 -or $Screen -gt $screens.Count) { throw "Solo hay $($screens.Count) pantalla(s)." }
$b = $screens[$Screen - 1].Bounds
$edge = @("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", "C:\Program Files\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
Start-Process $edge -ArgumentList "--user-data-dir=`"$profile`"", "--kiosk", "--edge-kiosk-type=fullscreen", "--no-first-run", "--window-position=$($b.X),$($b.Y)", "--window-size=$($b.Width),$($b.Height)", "http://127.0.0.1:8766/festival"
"Visuales en pantalla $Screen ($($b.Width)x$($b.Height) en $($b.X),$($b.Y))"
