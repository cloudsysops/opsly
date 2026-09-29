<#
.SYNOPSIS
    Configura una Tarea Programada simple: startup + logon
    El script bash maneja el loop periódico internamente
#>

$ErrorActionPreference = "Stop"

$TaskName = "Opsly Auto-Sync GitHub"
$ScriptPath = "/home/opsly/opsly/scripts/ops/auto-sync-github.sh"

# Verificar WSL y script
if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) {
    Write-Error "WSL no encontrado."
    exit 1
}
$wslTest = wsl -- bash -c "test -f '$ScriptPath' && echo OK"
if ($wslTest -ne "OK") {
    Write-Error "Script no encontrado en WSL: $ScriptPath"
    exit 1
}

# Acción: el script bash hace loop interno cada 15 min si hay red
$Action = New-ScheduledTaskAction `
    -Execute "wsl.exe" `
    -Argument "-- bash -c '$ScriptPath --daemon'"

# Triggers simples
$TriggerStartup = New-ScheduledTaskTrigger -AtStartup -RandomDelay "00:02:00"
$TriggerLogon   = New-ScheduledTaskTrigger -AtLogOn -RandomDelay "00:01:00"

# Settings
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 24) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5)

# Principal: SYSTEM
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Eliminar si existe
$Existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Existing) {
    Write-Host "Tarea '$TaskName' ya existe, eliminando..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Registrar
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $TriggerStartup, $TriggerLogon `
    -Settings $Settings `
    -Principal $Principal `
    -Description "Sincroniza automáticamente el repo opsly con GitHub (daemon: cada 15 min si hay red)." `
    -Force

Write-Host "✅ Tarea '$TaskName' creada exitosamente."
Write-Host "Triggers:"
Write-Host "  - Al iniciar Windows (AtStartup) + random delay 0-2min"
Write-Host "  - Al iniciar sesión (AtLogOn) + random delay 0-1min"
Write-Host "El script corre como daemon: sync cada 15 min mientras haya red."
Write-Host ""
Write-Host "Para probar manualmente:"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
Write-Host "Logs en: /home/opsly/opsly/runtime/logs/auto-sync.log"