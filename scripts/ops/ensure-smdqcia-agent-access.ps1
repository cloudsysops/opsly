#requires -RunAsAdministrator
<#
.SYNOPSIS
  Make PC gamer (smdqcia-pc) reachable from Mac agents over Tailscale for WSL + Windows.

.DESCRIPTION
  Idempotent. Safe to re-run after reboot.
  - WSL networkingMode=mirrored
  - Clears broken portproxy on :22
  - Windows OpenSSH :22 with DefaultShell -> C:\Opsly\bin\opsly-agent-shell.cmd (WSL bash)
  - Syncs authorized_keys (+ administrators_authorized_keys)
  - Firewall allow TCP/22
  - Keeps WSL Tailscale (smdqcia-wsl) as backup path

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\ops\ensure-smdqcia-agent-access.ps1
  powershell -ExecutionPolicy Bypass -File scripts\ops\ensure-smdqcia-agent-access.ps1 -DryRun
#>
param([switch]$DryRun)

$ErrorActionPreference = "Stop"
$LogDir = "C:\Opsly\logs"
$Log = Join-Path $LogDir "ensure-agent-access.log"
$BinDir = "C:\Opsly\bin"
$Wrapper = Join-Path $BinDir "opsly-agent-shell.cmd"

function Write-Log([string]$Message) {
  $line = "{0} {1}" -f ([DateTimeOffset]::Now.ToString("o")), $Message
  Add-Content -Path $Log -Value $line -Encoding utf8
  Write-Host $line
}

New-Item -ItemType Directory -Force -Path $LogDir, $BinDir | Out-Null
Write-Log "=== ensure-smdqcia-agent-access START dryRun=$DryRun ==="

if ($DryRun) {
  Write-Log "[dry-run] would enforce mirrored WSL, OpenSSH:22 + WSL wrapper, keys, firewall"
  exit 0
}

# 1) WSL mirrored (canonical for Tailscale + sshd bridging)
$wslcfg = @"
[wsl2]
memory=12GB
processors=8
swap=8GB
networkingMode=mirrored
dnsTunneling=true
autoProxy=true
vmIdleTimeout=86400000

[general]
instanceIdleTimeout=-1
"@
[System.IO.File]::WriteAllText("$env:USERPROFILE\.wslconfig", $wslcfg.Replace("`r`n", "`n"))
Write-Log "wrote mirrored .wslconfig"

# 2) Wrapper: OpenSSH passes `-c "cmd"`; wsl.exe needs `-e bash -lc`
$wrapperBody = @"
@echo off
setlocal EnableExtensions
if /I "%~1"=="-c" (
  if "%~2"=="" (
    wsl.exe -e bash -l
  ) else (
    wsl.exe -e bash -lc %2
  )
  exit /b %ERRORLEVEL%
)
wsl.exe -e bash -l
exit /b %ERRORLEVEL%
"@
[System.IO.File]::WriteAllText($Wrapper, $wrapperBody.Replace("`r`n", "`n"))
Write-Log "wrote $Wrapper"

# 3) Kill broken portproxy loops on :22
netsh interface portproxy reset | Out-Null
Write-Log "portproxy reset"

# 4) Keys (Mac dragon keys already in WSL authorized_keys)
$keys = wsl -e bash -lc "cat ~/.ssh/authorized_keys"
if (-not $keys) { throw "WSL ~/.ssh/authorized_keys empty — authorize Mac pubkey first" }

$userAuth = Join-Path $env:USERPROFILE ".ssh\authorized_keys"
New-Item -ItemType Directory -Force -Path (Split-Path $userAuth) | Out-Null
Set-Content -Path $userAuth -Value $keys -Encoding ASCII
icacls $userAuth /inheritance:r | Out-Null
icacls $userAuth /grant:r "${env:USERNAME}:R" | Out-Null

$adminAuth = "C:\ProgramData\ssh\administrators_authorized_keys"
Set-Content -Path $adminAuth -Value $keys -Encoding ASCII
icacls $adminAuth /inheritance:r | Out-Null
icacls $adminAuth /grant:r "Administrators:F" | Out-Null
icacls $adminAuth /grant:r "SYSTEM:F" | Out-Null
Write-Log "synced authorized_keys"

# 5) sshd_config: Port 22 + pubkey
$sshdConfig = "C:\ProgramData\ssh\sshd_config"
Copy-Item $sshdConfig "$sshdConfig.bak-opsly-$(Get-Date -Format yyyyMMddHHmmss)" -Force
$base = Get-Content $sshdConfig
$out = [System.Collections.Generic.List[string]]::new()
$out.Add("Port 22")
$out.Add("PubkeyAuthentication yes")
$out.Add("PasswordAuthentication no")
$out.Add("AuthorizedKeysFile .ssh/authorized_keys")
$out.Add("Subsystem sftp sftp-server.exe")
foreach ($line in $base) {
  if ($line -match '^\s*Port\s+') { continue }
  if ($line -match '^\s*PubkeyAuthentication\s+') { continue }
  if ($line -match '^\s*PasswordAuthentication\s+') { continue }
  if ($line -match '^\s*AuthorizedKeysFile\s+') { continue }
  if ($line -match '^\s*Subsystem\s+sftp') { continue }
  if ($line -match 'BEGIN OPSLY|END OPSLY') { continue }
  $out.Add($line)
}
if (-not ($out | Where-Object { $_ -match 'administrators_authorized_keys' })) {
  $out.Add("")
  $out.Add("Match Group administrators")
  $out.Add("       AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys")
}
$out | Set-Content -Path $sshdConfig -Encoding ASCII

New-Item -Path "HKLM:\SOFTWARE\OpenSSH" -Force | Out-Null
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell -Value $Wrapper -PropertyType String -Force | Out-Null
Remove-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShellCommandOption -ErrorAction SilentlyContinue
Write-Log "DefaultShell=$Wrapper"

# 6) Firewall
if (-not (Get-NetFirewallRule -Name "Opsly-SSH-Tailscale-22" -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -Name "Opsly-SSH-Tailscale-22" -DisplayName "Opsly SSH Tailscale 22" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 22 | Out-Null
} else {
  Enable-NetFirewallRule -Name "Opsly-SSH-Tailscale-22"
}
Get-NetFirewallRule | Where-Object { $_.DisplayName -match "OpenSSH-Server-Tailscale-22|WSL SSH 22" } | ForEach-Object {
  Enable-NetFirewallRule -Name $_.Name -ErrorAction SilentlyContinue
}

# 7) Prefer Windows OpenSSH on :22; stop WSL ssh.socket to avoid bind fight
wsl -u root -e bash -lc "systemctl stop ssh.socket ssh 2>/dev/null || true; systemctl disable ssh.socket 2>/dev/null || true; echo wsl-sshd-stopped" | ForEach-Object { Write-Log $_ }

& "C:\Windows\System32\OpenSSH\sshd.exe" -t -f $sshdConfig
Set-Service sshd -StartupType Automatic
Restart-Service sshd -Force
Start-Sleep -Seconds 1
$st = (Get-Service sshd).Status
Write-Log "sshd=$st"
if ($st -ne "Running") { throw "sshd failed to start — see Application log" }

# 8) Keep WSL Tailscale up as backup MagicDNS smdqcia-wsl
wsl -u root -e bash -lc "systemctl enable --now tailscaled 2>/dev/null || true; tailscale up --accept-dns=false 2>/dev/null || true; tailscale status --self | head -2" | ForEach-Object { Write-Log $_ }

$probe = Test-NetConnection -ComputerName 100.117.5.102 -Port 22 -WarningAction SilentlyContinue
Write-Log "probe 100.117.5.102:22 = $($probe.TcpTestSucceeded)"
Write-Log "=== DONE ==="
Write-Log "WSL (default):  ssh opsly@smdqcia-pc"
Write-Log "Windows:        ssh opsly@smdqcia-pc `"powershell.exe -NoProfile -Command 'Write-Output WIN_OK'`""
Write-Log "Backup WSL TS:  ssh opsly@smdqcia-wsl"
