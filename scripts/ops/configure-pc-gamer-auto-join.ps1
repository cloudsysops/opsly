<#
.SYNOPSIS
    Configura PC Gamer (o cualquier Windows) para auto-conectarse a Tailscale y al sistema Opsly al arrancar.
    Ejecutar UNA VEZ como ADMINISTRADOR en el PC Gamer. Queda persistente para siempre.

    Qué hace:
    1. Tailscale servicio -> Automatic + Running
    2. Tailscale prefs: --accept-routes --accept-dns --shields-up=false --login-server=auto
    3. Tarea Programada "Opsly PC-Gamer Auto-Join" (SYSTEM, AtStartup, cada 15min):
       - Fuerza tailscale up si está down
       - Verifica conectividad VPS (100.120.151.91)
       - PULEA actualizaciones del repo GitHub (scripts/ops/)
       - Log local en C:\Opsly\logs\pc-gamer-auto-join.log
       - Opcional: POST health a VPS /api/health
#>

$ErrorActionPreference = "Stop"

Write-Host "=== Configurando PC Gamer Auto-Join Opsly ===" -ForegroundColor Cyan

# 1. Verificar Admin
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "DEBE ejecutarse como ADMINISTRADOR (clic derecho -> Ejecutar como administrador)"
    exit 1
}

# 2. Rutas y configs
$LogDir = "C:\Opsly\logs"
$LogFile = "$LogDir\pc-gamer-auto-join.log"
$RepoDir = "C:\Opsly\repo"
$ScriptBlock = @"
# Auto-join script for PC Gamer - runs on startup and every 15min
Set-StrictMode -Version Latest
`$ErrorActionPreference = "Stop"

`$LogFile = "$LogFile"
`$RepoDir = "$RepoDir"
`$VPS_IP = "100.120.151.91"
`$TAILSCALE_EXE = "C:\Program Files\Tailscale\tailscale.exe"
if (-not (Test-Path `$TAILSCALE_EXE)) { `$TAILSCALE_EXE = "C:\Program Files (x86)\Tailscale\tailscale.exe" }

function Write-Log {
    param([string]`$msg)
    `$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "`$timestamp `$msg" | Out-File -FilePath `$LogFile -Encoding utf8 -Append
}

Write-Log "=== PC Gamer Auto-Join START ==="

# 0. PULEAR ULTIMA CONFIG DEL REPO
try {
    if (Test-Path "`$RepoDir\.git") {
        Write-Log "Repo existe, haciendo git pull..."
        cd `$RepoDir
        `$pull = git pull origin main 2>&1
        Write-Log "Git pull: `$(`$pull -join '; ')"
    } else {
        Write-Log "Clonando repo opsly..."
        git clone https://github.com/cloudsysops/opsly.git `$RepoDir 2>&1 | ForEach-Object { Write-Log "  clone: `$_" }
    }
} catch {
    Write-Log "⚠️ Error actualizando repo: `$_"
}

# 1. Asegurar Tailscale UP
try {
    `$status = & `$TAILSCALE_EXE status --json 2>`$null | ConvertFrom-Json
    if (`$status.BackendState -ne "Running") {
        Write-Log "Tailscale no running, ejecutando tailscale up..."
        & `$TAILSCALE_EXE up --accept-routes --accept-dns --shields-up=false 2>&1 | ForEach-Object { Write-Log "  up: `$_" }
        Start-Sleep 10
    } else {
        Write-Log "Tailscale ya running: `$(`$status.Self.TailscaleIPs[0])"
    }
} catch {
    Write-Log "Error checando Tailscale: `$_"
    Write-Log "Forzando tailscale up..."
    & `$TAILSCALE_EXE up --accept-routes --accept-dns --shields-up=false 2>&1 | ForEach-Object { Write-Log "  up: `$_" }
    Start-Sleep 10
}

# 2. Verificar conectividad VPS
try {
    `$ping = & `$TAILSCALE_EXE ping -c 1 -timeout 10s `$VPS_IP 2>&1
    if (`$LASTEXITCODE -eq 0) {
        Write-Log "✅ VPS reachable via Tailscale: `$ping"
    } else {
        Write-Log "❌ VPS NO reachable: `$ping"
    }
} catch {
    Write-Log "Error ping VPS: `$_"
}

# 3. Health check a API VPS (opcional)
try {
    `$health = Invoke-WebRequest -Uri "https://api.op-sly.com/api/health" -TimeoutSec 10 -UseBasicParsing 2>`$null
    if (`$health.StatusCode -eq 200) {
        Write-Log "✅ API VPS health OK"
    } else {
        Write-Log "⚠️ API VPS status: `$(`$health.StatusCode)"
    }
} catch {
    Write-Log "⚠️ API VPS no accesible (normal si no hay Cloudflare bypass): `$_"
}

# 4. Log estado final
`$final = & `$TAILSCALE_EXE status --json 2>`$null | ConvertFrom-Json
if (`$final) {
    Write-Log "Estado final: Backend=`$(`$final.BackendState) IP=`$(`$final.Self.TailscaleIPs[0]) Online=`$(`$final.Self.Online)"
    foreach (`$p in `$final.Peer) {
        if (`$p.Online) { Write-Log "  Peer ONLINE: `$(`$p.HostName) `$(`$p.TailscaleIPs[0])" }
    }
}

Write-Log "=== PC Gamer Auto-Join END ==="
"@

# 3. Crear directorios
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
if (-not (Test-Path $RepoDir)) { New-Item -ItemType Directory -Path $RepoDir -Force | Out-Null }

# 4. Configurar Tailscale servicio + prefs
Write-Host "[1/4] Configurando servicio Tailscale..."
$tsSvc = Get-Service -Name "Tailscale" -ErrorAction SilentlyContinue
if ($tsSvc) {
    if ($tsSvc.StartType -ne "Automatic") { Set-Service -Name "Tailscale" -StartupType Automatic; Write-Host "  Servicio -> Automatic" }
    if ($tsSvc.Status -ne "Running") { Start-Service -Name "Tailscale"; Write-Host "  Servicio iniciado" }
} else { Write-Warning "Servicio Tailscale no encontrado. ¿Está instalado?" }

Write-Host "[2/4] Configurando preferencias Tailscale..."
try {
    & tailscale set --accept-routes=true --accept-dns=true --shields-up=false 2>$null
    Write-Host "  Preferencias aplicadas"
} catch { Write-Warning "tailscale CLI no en PATH o error: $_" }

# 5. Crear Tarea Programada
Write-Host "[3/4] Creando Tarea Programada (SYSTEM, AtStartup + 15min)..."
$TaskName = "Opsly PC-Gamer Auto-Join"
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -Command `$ScriptBlock"
$TriggerStartup = New-ScheduledTaskTrigger -AtStartup -RandomDelay "00:02:00"
$TriggerRepeat  = New-ScheduledTaskTrigger -Daily -At "00:00" -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration ([TimeSpan]::FromDays(1))
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

$Existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false; Write-Host "  Tarea existente removida" }

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $TriggerStartup, $TriggerRepeat -Settings $Settings -Principal $Principal -Description "Auto-conecta PC Gamer a Tailscale, pulea repo GitHub y verifica conectividad VPS/Opsly al arrancar y cada 15min" -Force
Write-Host "  ✅ Tarea '$TaskName' creada"

# 6. Ejecutar una vez ahora para validar
Write-Host "[4/4] Ejecutando validación inicial..."
Start-ScheduledTask -TaskName $TaskName
Write-Host "  Tarea lanzada. Revisa log en: $LogFile"

Write-Host ""
Write-Host "=== LISTO ===" -ForegroundColor Green
Write-Host "A partir de ahora, cada vez que este PC inicie:"
Write-Host "  1. Tailscale se conecta automáticamente"
Write-Host "  2. Pulea última config del repo GitHub (scripts/ops/)"
Write-Host "  3. Verifica conectividad con VPS (100.120.151.91)"
Write-Host "  4. Log en: $LogFile"
Write-Host "  5. Se repite cada 15 min mientras haya red"
Write-Host ""
Write-Host "Para ver logs en tiempo real:"
Write-Host "  Get-Content $LogFile -Wait -Tail 20"
Write-Host ""
Write-Host "Para probar manualmente:"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"