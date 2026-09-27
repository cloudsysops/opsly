# Always-on (no sleep / no hibernate) for the PC-gamer Windows host.
# Run in an admin PowerShell (CMD: powershell -ExecutionPolicy Bypass -File pc-gamer-power-always-on.ps1)
#
# Keeps the Tailscale peer reachable 24/7 so the Mac/agents can reach
# Ollama :11434, worker :3011 and bridge :5004 whenever the machine is on.
# Optionally enables Wake-on-LAN so a remote magic packet can wake it anyway.
#
# Flags:
#   -Wol            also enable Wake-on-LAN on the active NIC (requires admin)
#   -DryRun         print actions only (no changes)
param(
  [switch]$Wol,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$msg, [bool]$apply) {
  if ($apply) {
    Write-Host "[apply] $msg"
  } else {
    Write-Host "[dry-run] $msg"
  }
}

function Run-Cmd([string]$cmd) {
  if (-not $DryRun) {
    try {
      cmd /c "`"$cmd`"" | Write-Host
    } catch {
      Write-Host "[warn] command failed: $cmd -> $($_.Exception.Message)"
    }
  }
}

Write-Host "== PC-gamer always-on settings =="
Write-Host "Host: $env:COMPUTERNAME"

# 1) Standby (sleep) on AC power -> never
Run-Cmd "powercfg /change standby-timeout-ac 0"
Write-Step "standby-timeout-ac = 0 (never sleep on AC)" (-not $DryRun)

# 2) Hibernate timeout on AC -> never
Run-Cmd "powercfg /change hibernate-timeout-ac 0"
Write-Step "hibernate-timeout-ac = 0 (never hibernate on AC)" (-not $DryRun)

# 3) Disable hibernate feature entirely (frees hiberfil.sys)
Run-Cmd "powercfg /hibernate off"
Write-Step "hibernate = off" (-not $DryRun)

# 4) Monitor stays off is fine; keep disk on if desired (optional, commented):
# Run-Cmd "powercfg /change disk-timeout-ac 0"

# 5) Optional Wake-on-LAN on the active NIC
if ($Wol) {
  Write-Host "-- Wake-on-LAN --"
  $nicEnabled = $false
  if (-not $DryRun) {
    $active = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
    if ($active) {
      Set-NetAdapterPowerManagement -Name $active.Name -WakeOnMagicPacket Enabled -ErrorAction SilentlyContinue
      Register-PnpDevice -InstanceId $active.PnPDeviceID -ErrorAction SilentlyContinue | Out-Null
      Write-Host "[apply] WOL enabled on adapter: $($active.Name) ($($active.InterfaceDescription))"
      $nicEnabled = $true
    } else {
      Write-Host "[warn] no active adapter found; enable WOL manually (Device Manager -> NIC -> Power Management)"
    }
  } else {
    Write-Host "[dry-run] would enable WakeOnMagicPacket on active adapter"
    $nicEnabled = $true
  }
  if (-not $nicEnabled) {
    Write-Host "[warn] WOL not configured; magic packet will not wake this machine"
  }
}

Write-Host ""
if ($DryRun) {
  Write-Host "No changes applied (dry-run). Re-run without -DryRun."
} else {
  Write-Host "Done. Verify: powercfg /a  (sleep states) and powercfg /query SCHEME_CURRENT | findstr /i standby"
}