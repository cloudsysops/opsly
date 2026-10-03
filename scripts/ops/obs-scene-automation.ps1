# Automatiza cambio de escena en OBS segun el foco de Battlefield 6, sin tocar el juego.
# Regla A: BF6 gana el foco -> escena "Battlefield 6 -- Dia 2"
# Regla B: bf6.exe deja de existir (cerraste el juego) -> escena "OAD_FACTORY_FOCUS"
# "Vuelvo en un momento" queda como escena manual: antes se automatizaba aqui y
# exponia una pantalla vacia durante la sesion.
# Todo lo demas (alt-tab a Discord/Chrome/terminal, escenas manuales) NO se toca,
# para no exponer contenido privado ni pelear con cambios manuales (Vibe Coding, BRB, etc).

. "$PSScriptRoot\obs-ws-client.ps1"

$SceneGame = "Battlefield 6 — Día 2"
$SceneIdle = "OAD_FACTORY_FOCUS"
$ProcessName = "bf6"
$PollSeconds = 2
$LogFile = "$env:TEMP\obs-scene-automation.log"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Focus {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

function Get-ForegroundProcessId {
    $hwnd = [Win32Focus]::GetForegroundWindow()
    $fgProcId = 0
    [void][Win32Focus]::GetWindowThreadProcessId($hwnd, [ref]$fgProcId)
    return $fgProcId
}

function Write-Log {
    param([string]$Message)
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -Path $LogFile -Value $line
    Write-Output $line
}

function Set-ObsScene {
    param([string]$SceneName)
    try {
        $r = Invoke-ObsRequest -RequestType "SetCurrentProgramScene" -RequestData @{ sceneName = $SceneName }
        if ($r.requestStatus.result) {
            Write-Log "Escena -> $SceneName"
        } else {
            Write-Log "ERROR cambiando a $SceneName : $($r.requestStatus.comment)"
        }
    } catch {
        Write-Log "ERROR websocket: $($_.Exception.Message)"
    }
}

Write-Log "Automatizacion de escenas iniciada (proceso=$ProcessName, poll=${PollSeconds}s)"

# lastState: "unknown" | "focused" | "unfocused" | "closed"
$lastState = "unknown"

while ($true) {
    Start-Sleep -Seconds $PollSeconds
    $proc = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue

    if (-not $proc) {
        if ($lastState -ne "closed") {
            Write-Log "$ProcessName.exe no esta corriendo"
            Set-ObsScene -SceneName $SceneIdle
            $lastState = "closed"
        }
        continue
    }

    $fgPid = Get-ForegroundProcessId
    $isFocused = $proc.Id -contains $fgPid

    if ($isFocused) {
        if ($lastState -ne "focused") {
            Write-Log "$ProcessName.exe gano el foco"
            Set-ObsScene -SceneName $SceneGame
            $lastState = "focused"
        }
    } else {
        if ($lastState -eq "focused" -or $lastState -eq "unknown" -or $lastState -eq "closed") {
            Write-Log "$ProcessName.exe corriendo pero sin foco (no se fuerza escena)"
        }
        $lastState = "unfocused"
    }
}
