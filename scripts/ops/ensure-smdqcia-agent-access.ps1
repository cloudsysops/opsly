#requires -RunAsAdministrator
<#
.SYNOPSIS
  Make PC gamer (smdqcia-pc) reachable from Mac agents over Tailscale for WSL + Windows.

.DESCRIPTION
  Idempotent. Safe to re-run after reboot.
  - WSL networkingMode=mirrored
  - Deletes only portproxy rules listening on :22 (does not wipe unrelated proxies)
  - Windows OpenSSH :22 with DefaultShell -> C:\Opsly\bin\opsly-agent-shell.cmd (WSL bash)
  - Syncs authorized_keys (+ administrators_authorized_keys)
  - Firewall allow TCP/22 scoped to Tailscale CGNAT (100.64.0.0/10) only
  - Disables WSL ssh.socket to avoid bind fight; WSL Tailscale remains optional backup

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
# Tailscale CGNAT — SSH must not be open on LAN/public interfaces
$TailscaleCidr = "100.64.0.0/10"
$MagicDnsProbeHost = "smdqcia-pc"

function Write-Log([string]$Message) {
  $line = "{0} {1}" -f ([DateTimeOffset]::Now.ToString("o")), $Message
  Add-Content -Path $Log -Value $line -Encoding utf8
  Write-Host $line
}

function Remove-Port22Proxies {
  # Enumerate and delete ONLY listenport=22 rules — never `portproxy reset` (wipes all).
  $show = netsh interface portproxy show all 2>$null
  if (-not $show) {
    Write-Log "portproxy: empty"
    return
  }
  $listenAddress = $null
  $listenPort = $null
  $removed = 0
  foreach ($raw in $show) {
    $line = ($raw -as [string]).Trim()
    if (-not $line) { continue }
    if ($line -match '^(Listen|Address|Port|Connect|-----|\s*$)') {
      if ($line -match '^Listen\s+on\s+ipv4:\s*(.+)$') {
        $listenAddress = $Matches[1].Trim()
      }
      elseif ($line -match '^Connect\s+to\s+ipv4:') {
        if ($listenPort -eq "22" -and $listenAddress) {
          netsh interface portproxy delete v4tov4 listenaddress=$listenAddress listenport=22 | Out-Null
          Write-Log "portproxy deleted v4tov4 listen=$listenAddress:22"
          $removed++
        }
        $listenAddress = $null
        $listenPort = $null
      }
      continue
    }
    # Table format: listenaddress listenport connectaddress connectport
    $parts = $line -split '\s+'
    if ($parts.Count -ge 2 -and $parts[1] -eq "22" -and $parts[0] -match '^\d+\.\d+\.\d+\.\d+$|^0\.0\.0\.0$|^\*$') {
      $addr = $parts[0]
      if ($addr -eq "*") { $addr = "0.0.0.0" }
      netsh interface portproxy delete v4tov4 listenaddress=$addr listenport=22 | Out-Null
      Write-Log "portproxy deleted v4tov4 listen=$addr:22"
      $removed++
    }
    elseif ($parts.Count -ge 1 -and $parts[0] -match '^\d+$' -and $listenAddress) {
      # Some locales print port on its own line after Listen address
      $listenPort = $parts[0]
    }
  }
  # Fallback parser for classic netsh columns
  if ($removed -eq 0) {
    $csv = netsh interface portproxy show v4tov4 2>$null
    foreach ($raw in $csv) {
      $parts = (($raw -as [string]).Trim() -split '\s+')
      if ($parts.Count -ge 4 -and $parts[1] -eq "22") {
        $addr = $parts[0]
        netsh interface portproxy delete v4tov4 listenaddress=$addr listenport=22 | Out-Null
        Write-Log "portproxy deleted v4tov4 listen=$addr:22"
        $removed++
      }
    }
  }
  Write-Log "portproxy :22 removals=$removed"
}

New-Item -ItemType Directory -Force -Path $LogDir, $BinDir | Out-Null
Write-Log "=== ensure-smdqcia-agent-access START dryRun=$DryRun ==="

if ($DryRun) {
  Write-Log "[dry-run] would enforce mirrored WSL, OpenSSH:22 + WSL wrapper, keys, Tailscale-scoped firewall, portproxy:22 only"
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

# 2) Wrapper: OpenSSH passes `-c "cmd"`; wsl.exe needs `-e bash -lc`.
# Delayed expansion so exit code reflects wsl.exe, not pre-block ERRORLEVEL=0.
$wrapperBody = @"
@echo off
setlocal EnableExtensions EnableDelayedExpansion
if /I "%~1"=="-c" (
  if "%~2"=="" (
    wsl.exe -e bash -l
  ) else (
    wsl.exe -e bash -lc %2
  )
  exit /b !ERRORLEVEL!
)
wsl.exe -e bash -l
exit /b !ERRORLEVEL!
"@
[System.IO.File]::WriteAllText($Wrapper, $wrapperBody.Replace("`r`n", "`n"))
Write-Log "wrote $Wrapper (delayed ERRORLEVEL)"

# 3) Kill broken portproxy loops on :22 only
Remove-Port22Proxies

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

# 6) Firewall — Tailscale CGNAT only (never open :22 to LAN/public Any)
$ruleName = "Opsly-SSH-Tailscale-22"
$existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if (-not $existing) {
  New-NetFirewallRule `
    -Name $ruleName `
    -DisplayName "Opsly SSH Tailscale 22" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 22 `
    -RemoteAddress $TailscaleCidr `
    -Profile Any | Out-Null
  Write-Log "firewall created $ruleName RemoteAddress=$TailscaleCidr"
} else {
  Set-NetFirewallRule -Name $ruleName -Direction Inbound -Action Allow -Protocol TCP -Enabled True
  Set-NetFirewallRule -Name $ruleName -RemoteAddress $TailscaleCidr
  Enable-NetFirewallRule -Name $ruleName
  Write-Log "firewall updated $ruleName RemoteAddress=$TailscaleCidr"
}
# Disable legacy wide-open OpenSSH/WSL :22 rules if present (do not leave Any-source SSH)
Get-NetFirewallRule | Where-Object {
  $_.DisplayName -match 'OpenSSH SSH Server \(sshd\)|OpenSSH-Server-In-TCP|OpenSSH-Server-Tailscale-22|WSL SSH 22|WSL-In-TCP-22'
} | ForEach-Object {
  try {
    Set-NetFirewallRule -Name $_.Name -RemoteAddress $TailscaleCidr -ErrorAction SilentlyContinue
    Write-Log "firewall scoped legacy rule $($_.Name) -> $TailscaleCidr"
  } catch {
    Write-Log "firewall skip legacy $($_.Name): $_"
  }
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

# 8) Optional WSL Tailscale (backup MagicDNS) — do not treat as canonical inventory node
wsl -u root -e bash -lc "systemctl enable --now tailscaled 2>/dev/null || true; tailscale up --accept-dns=false 2>/dev/null || true; tailscale status --self | head -2" | ForEach-Object { Write-Log $_ }

# Probe via MagicDNS (survives re-enroll / IP change); fall back to local listen check
$probeOk = $false
try {
  $probe = Test-NetConnection -ComputerName $MagicDnsProbeHost -Port 22 -WarningAction SilentlyContinue
  $probeOk = [bool]$probe.TcpTestSucceeded
  Write-Log "probe ${MagicDnsProbeHost}:22 = $probeOk"
} catch {
  Write-Log "probe MagicDNS failed: $_"
}
if (-not $probeOk) {
  $local = Get-NetTCPConnection -LocalPort 22 -State Listen -ErrorAction SilentlyContinue
  Write-Log "local listen:22 count=$((@($local)).Count)"
}

Write-Log "=== DONE ==="
Write-Log "WSL (default):  ssh opsly@smdqcia-pc"
Write-Log "Windows:        ssh opsly@smdqcia-pc `"powershell.exe -NoProfile -Command 'Write-Output WIN_OK'`""
Write-Log "Firewall:       TCP/22 RemoteAddress=$TailscaleCidr only"
Write-Log "Do NOT start WSL ssh.socket — Windows OpenSSH owns :22"
