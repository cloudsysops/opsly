<#
.SYNOPSIS
    Configura Tareas Programadas via schtasks.exe (mas compatible)
#>

$ErrorActionPreference = "Stop"

$TaskName = "Opsly Auto-Join System"
$ScriptPath = "/home/opsly/opsly/scripts/ops/auto-join-opsly.sh"
$HealthTaskName = "Opsly Health Check"
$HealthScriptPath = "/home/opsly/opsly/scripts/ops/health-check-quick.sh"

Write-Host "=== Configurando Opsly Auto-Join System ==="

# 1. Verificar WSL y scripts
if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) {
    Write-Error "WSL no encontrado."
    exit 1
}
$wslTest = wsl -- bash -c "test -f '$ScriptPath' && echo OK"
if ($wslTest -ne "OK") {
    Write-Error "Script auto-join no encontrado en WSL: $ScriptPath"
    exit 1
}

# 2. Asegurar Tailscale servicio auto-inicio
Write-Host "[1/5] Configurando Tailscale auto-inicio..."
$TailscaleService = Get-Service -Name "Tailscale" -ErrorAction SilentlyContinue
if ($TailscaleService) {
    if ($TailscaleService.StartType -ne "Automatic") {
        Set-Service -Name "Tailscale" -StartupType Automatic
        Write-Host "  Tailscale -> Automatic"
    }
    if ($TailscaleService.Status -ne "Running") {
        Start-Service -Name "Tailscale"
        Write-Host "  Tailscale iniciado"
    }
} else {
    Write-Warning "Servicio Tailscale no encontrado. Instala desde tailscale.com/download"
}

# 3. Preferencias Tailscale
Write-Host "[2/5] Configurando preferencias Tailscale..."
try { & tailscale set --accept-routes=true --accept-dns=true --shields-up=false 2>$null; Write-Host "  Preferencias aplicadas" } catch { Write-Warning "tailscale CLI no disponible en PATH" }

# 4. Crear health-check-quick.sh en WSL
Write-Host "[3/5] Creando health-check-quick.sh..."
$HealthScript = @"
#!/usr/bin/env bash
set -euo pipefail
LOG="/home/opsly/opsly/runtime/logs/health-check.log"
mkdir -p "`$(dirname `"$LOG`")"
echo "`$((date)) Health check" >> "`$LOG"
tailscale status --json 2>/dev/null | jq -e '.BackendState == "Running"' >/dev/null && echo "`$((date)) Tailscale OK" >> "`$LOG" || echo "`$((date)) Tailscale DOWN" >> "`$LOG"
curl -sf --max-time 5 "https://api.github.com" >/dev/null && echo "`$((date)) GitHub OK" >> "`$LOG" || echo "`$((date)) GitHub DOWN" >> "`$LOG"
"@
wsl -- bash -c "cat > '$HealthScriptPath' << 'EOF'
$HealthScript
EOF
chmod +x '$HealthScriptPath'
"
Write-Host "  health-check-quick.sh creado"

# 5. Crear tareas via schtasks.exe (ruta completa)
Write-Host "[4/5] Creando tareas programadas via schtasks.exe..."

$SchTasks = "C:\Windows\System32\schtasks.exe"
$CmdMain = "wsl.exe -- bash -c '$ScriptPath'"
$CmdHealth = "wsl.exe -- bash -c '$HealthScriptPath'"

# Eliminar tareas existentes
& $SchTasks /Delete /TN "$TaskName" /F 2>$null
& $SchTasks /Delete /TN "$HealthTaskName" /F 2>$null

# Tarea principal: ONSTART (al iniciar Windows)
& $SchTasks /Create `
    /TN "$TaskName" `
    /TR $CmdMain `
    /SC ONSTART `
    /RU SYSTEM `
    /RL HIGHEST `
    /F `
    /IT

# Trigger ONLOGON (al iniciar sesion)
& $SchTasks /Create `
    /TN "$TaskName" `
    /TR $CmdMain `
    /SC ONLOGON `
    /RU SYSTEM `
    /RL HIGHEST `
    /F `
    /IT 2>$null

# Trigger DAILY con repeticion cada 15 min
& $SchTasks /Create `
    /TN "$TaskName" `
    /TR $CmdMain `
    /SC DAILY `
    /ST 00:00 `
    /RI 15 `
    /DU 24:00 `
    /RU SYSTEM `
    /RL HIGHEST `
    /F `
    /IT 2>$null

# Trigger evento de red (NetworkProfile 10000) - via XML para mas control
$XmlTrigger = @"
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers>
    <EventTrigger>
      <Enabled>true</Enabled>
      <Subscription><QueryList><Query Id="0" Path="Microsoft-Windows-NetworkProfile/Operational"><Select Path="Microsoft-Windows-NetworkProfile/Operational">*[System[(EventID=10000)]]</Select></Query></QueryList></Subscription>
      <Delay>PT30S</Delay>
    </EventTrigger>
  </Triggers>
</Task>
"@

$XmlPath = "$env:TEMP\opsly-network-trigger.xml"
$XmlTrigger | Out-File -FilePath $XmlPath -Encoding UTF8
& $SchTasks /Create /TN "$TaskName" /XML $XmlPath /F 2>$null
Remove-Item $XmlPath -Force -ErrorAction SilentlyContinue

Write-Host "  Tarea principal '$TaskName' creada con triggers: ONSTART, ONLOGON, DAILY(15min), EVENT(red)"

# Health check cada 5 min
& $SchTasks /Create `
    /TN "$HealthTaskName" `
    /TR $CmdHealth `
    /SC DAILY `
    /ST 00:00 `
    /RI 5 `
    /DU 24:00 `
    /RU SYSTEM `
    /RL HIGHEST `
    /F `
    /IT

Write-Host "  Tarea health '$HealthTaskName' creada: DAILY cada 5 min"

# Configurar "Run only if network available" via PowerShell (solo esta parte)
Write-Host "[5/5] Configurando 'Run only if network available'..."
try {
    $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
    $Task.Settings.RunOnlyIfNetworkAvailable = $true
    $Task.Settings.AllowStartIfOnBatteries = $true
    $Task.Settings.DontStopIfGoingOnBatteries = $true
    $Task.Settings.StartWhenAvailable = $true
    $Task.Settings.ExecutionTimeLimit = "PT2H"
    $Task.Settings.RestartCount = 3
    $Task.Settings.RestartInterval = "PT5M"
    Set-ScheduledTask -TaskName $TaskName -Settings $Task.Settings -ErrorAction Stop

    $HealthTask = Get-ScheduledTask -TaskName $HealthTaskName -ErrorAction Stop
    $HealthTask.Settings.RunOnlyIfNetworkAvailable = $true
    $HealthTask.Settings.AllowStartIfOnBatteries = $true
    $HealthTask.Settings.DontStopIfGoingOnBatteries = $true
    $HealthTask.Settings.StartWhenAvailable = $true
    $HealthTask.Settings.ExecutionTimeLimit = "PT5M"
    $HealthTask.Settings.RestartCount = 2
    $HealthTask.Settings.RestartInterval = "PT1M"
    Set-ScheduledTask -TaskName $HealthTaskName -Settings $HealthTask.Settings -ErrorAction Stop

    Write-Host "  Settings aplicados correctamente"
} catch {
    Write-Warning "No se pudieron aplicar settings via PowerShell (tareas creadas igual): $_"
}

Write-Host ""
Write-Host "=== CONFIGURACION COMPLETADA ==="
Write-Host ""
Write-Host "Tareas creadas:"
Write-Host "  1. $TaskName"
Write-Host "     Triggers: ONSTART, ONLOGON, DAILY(00:00 repite 15min x 24h), EVENT(NetworkProfile 10000)"
Write-Host "     Comando: $CmdMain"
Write-Host "  2. $HealthTaskName"
Write-Host "     Trigger: DAILY 00:00 repite 5min x 24h"
Write-Host "     Comando: $CmdHealth"
Write-Host ""
Write-Host "Ambas tareas corren como SYSTEM, solo si hay red (RunOnlyIfNetworkAvailable=true)"
Write-Host ""
Write-Host "Para probar manualmente:"
Write-Host "  schtasks /Run /TN `"$TaskName`""
Write-Host "  schtasks /Run /TN `"$HealthTaskName`""
Write-Host ""
Write-Host "Logs en WSL:"
Write-Host "  Auto-join: /home/opsly/opsly/runtime/logs/auto-join.log"
Write-Host "  Health:    /home/opsly/opsly/runtime/logs/health-check.log"
Write-Host "  Estado:    /home/opsly/opsly/runtime/state/auto-join-state.json"
Write-Host ""
Write-Host "IMPORTANTE: Ejecuta este script como ADMINISTRADOR"