# Atajos globales de escena.  Uso:  powershell -File hotkeys.ps1 [start|stop|status]
#   Ctrl+Alt+Shift+1 inicio | 2 coding | 3 juego | 4 dj | 5 brb | 6 fin
#   Ctrl+Alt+Shift+0  = ACTIVAR/DESACTIVAR los atajos (pausa sin cerrar el proceso)
# Solo cambian de escena; no pueden iniciar ni detener el stream.
param([string]$Action = 'start')
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $dir '.hotkeys.pid'

function Find-Node {
  $c = Get-Command node -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($p in 'C:\Program Files\nodejs\node.exe', "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe") { if (Test-Path $p) { return $p } }
  throw 'node no encontrado'
}

if ($Action -eq 'stop') {
  if (Test-Path $pidFile) { Stop-Process -Id ([int](Get-Content $pidFile)) -Force -ErrorAction SilentlyContinue; Remove-Item $pidFile -Force; 'Atajos desactivados (proceso detenido).' } else { 'No estaban activos.' }
  return
}
if ($Action -eq 'status') {
  if ((Test-Path $pidFile) -and (Get-Process -Id ([int](Get-Content $pidFile)) -ErrorAction SilentlyContinue)) { 'ACTIVOS (pid ' + (Get-Content $pidFile) + ')' } else { 'INACTIVOS' }
  return
}

if ((Test-Path $pidFile) -and (Get-Process -Id ([int](Get-Content $pidFile)) -ErrorAction SilentlyContinue)) { 'Ya están activos.'; return }
$PID | Set-Content $pidFile
$node = Find-Node
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public static class HK {
  [DllImport("user32.dll")] public static extern bool RegisterHotKey(IntPtr h, int id, uint mod, uint vk);
  [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr h, int id);
  [DllImport("user32.dll")] public static extern int GetMessage(out MSG m, IntPtr h, uint a, uint b);
  [StructLayout(LayoutKind.Sequential)] public struct MSG { public IntPtr hwnd; public uint message; public IntPtr wParam; public IntPtr lParam; public uint time; public int x; public int y; }
}
'@
$names = @{ 1 = 'inicio'; 2 = 'coding'; 3 = 'juego'; 4 = 'dj'; 5 = 'brb'; 6 = 'fin' }
$mod = 0x0001 -bor 0x0002 -bor 0x0004   # Alt+Ctrl+Shift
foreach ($i in 0..6) { [void][HK]::RegisterHotKey([IntPtr]::Zero, $i, $mod, [uint32](0x30 + $i)) }
$enabled = $true
try {
  $msg = New-Object HK+MSG
  while ([HK]::GetMessage([ref]$msg, [IntPtr]::Zero, 0, 0) -gt 0) {
    if ($msg.message -ne 0x0312) { continue }
    $id = [int]$msg.wParam
    if ($id -eq 0) { $enabled = -not $enabled; [Console]::Beep($(if ($enabled) { 900 } else { 400 }), 120); continue }
    if ($enabled -and $names.ContainsKey($id)) { Start-Process $node -ArgumentList @((Join-Path $dir 'stream-ctl.mjs'), $names[$id]) -WindowStyle Hidden }
  }
} finally { foreach ($i in 0..6) { [void][HK]::UnregisterHotKey([IntPtr]::Zero, $i) }; Remove-Item $pidFile -Force -ErrorAction SilentlyContinue }
