#requires -RunAsAdministrator
<#
.SYNOPSIS
  Make PC gamer (smdqcia-pc) reachable from Mac agents over Tailscale for WSL + Windows.

.DESCRIPTION
  Idempotent. Safe to re-run after reboot.
  - WSL networkingMode=mirrored
  - Deletes only portproxy rules listening on :22 (does not wipe unrelated proxies)
  - Windows OpenSSH :22 with DefaultShell -> C:\Opsly\bin\opsly-agent-shell.exe (WSL bash)
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
$WrapperExe = Join-Path $BinDir "opsly-agent-shell.exe"
$WrapperCmd = Join-Path $BinDir "opsly-agent-shell.cmd"
# Built-in Administrators well-known SID (locale-independent)
$AdministratorsSid = "*S-1-5-32-544"
# Tailscale CGNAT -- SSH must not be open on LAN/public interfaces
$TailscaleCidr = "100.64.0.0/10"
$MagicDnsProbeHost = "smdqcia-pc"

function Write-Log([string]$Message) {
  $line = "{0} {1}" -f ([DateTimeOffset]::Now.ToString("o")), $Message
  Add-Content -Path $Log -Value $line -Encoding utf8
  Write-Host $line
}

function Invoke-IcaclsChecked {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )
  & icacls.exe @Arguments | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "icacls failed (exit=$LASTEXITCODE) for $Path :: $($Arguments -join ' ')"
  }
}

function Remove-Port22Proxies {
  # Enumerate and delete ONLY listenport=22 rules -- never `portproxy reset` (wipes all).
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

function Build-OpslyAgentShellExe {
  param([Parameter(Mandatory = $true)][string]$OutputPath)

  $source = @'
using System;
using System.Diagnostics;

public static class OpslyAgentShell
{
    public static int Main(string[] args)
    {
        string systemRoot = Environment.GetEnvironmentVariable("SystemRoot") ?? @"C:\Windows";
        string wsl = System.IO.Path.Combine(systemRoot, "System32", "wsl.exe");
        var psi = new ProcessStartInfo
        {
            FileName = wsl,
            UseShellExecute = false,
        };

        if (args.Length >= 1 && string.Equals(args[0], "-c", StringComparison.OrdinalIgnoreCase))
        {
            if (args.Length < 2 || string.IsNullOrEmpty(args[1]))
            {
                psi.Arguments = "-e bash -l";
            }
            else
            {
                psi.Arguments = "-e bash -lc " + QuoteForCmd(args[1]);
            }
        }
        else
        {
            psi.Arguments = "-e bash -l";
        }

        using (var process = Process.Start(psi))
        {
            if (process == null)
            {
                return 1;
            }
            process.WaitForExit();
            return process.ExitCode;
        }
    }

    private static string QuoteForCmd(string value)
    {
        if (value.IndexOfAny(new[] { ' ', '\t', '"' }) < 0)
        {
            return value;
        }
        return "\"" + value.Replace("\"", "\\\"") + "\"";
    }
}
'@

  $tempDir = Join-Path $env:TEMP ("opsly-agent-shell-" + [guid]::NewGuid().ToString("n"))
  New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
  try {
    $csPath = Join-Path $tempDir "OpslyAgentShell.cs"
    [System.IO.File]::WriteAllText($csPath, $source)

    $cscCandidates = @(
      "${env:WINDIR}\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
      "${env:WINDIR}\Microsoft.NET\Framework\v4.0.30319\csc.exe"
    )
    $csc = $cscCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $csc) {
      throw "csc.exe not found -- cannot build opsly-agent-shell.exe (OpenSSH DefaultShell requires an executable)"
    }

    $outTmp = Join-Path $tempDir "opsly-agent-shell.exe"
    & $csc /nologo /target:exe /optimize+ /out:$outTmp $csPath | ForEach-Object { Write-Log "csc: $_" }
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $outTmp)) {
      throw "failed to compile opsly-agent-shell.exe (csc exit=$LASTEXITCODE)"
    }
    Copy-Item -Force $outTmp $OutputPath
    Write-Log "wrote executable DefaultShell candidate $OutputPath"
  }
  finally {
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
  }
}

function ConvertTo-ManagedSshdConfig {
  param(
    [Parameter(Mandatory = $false)]
    [AllowNull()]
    [AllowEmptyCollection()]
    [AllowEmptyString()]
    [string[]]$ExistingLines = @()
  )

  # Rewrite only GLOBAL (pre-Match) directives. Preserve everything inside Match blocks.
  $out = [System.Collections.Generic.List[string]]::new()
  $out.Add("Port 22")
  $out.Add("PubkeyAuthentication yes")
  $out.Add("PasswordAuthentication no")
  $out.Add("AuthorizedKeysFile .ssh/authorized_keys")
  $out.Add("Subsystem sftp sftp-server.exe")

  if ($null -eq $ExistingLines) { $ExistingLines = @() }
  # Scalar empty string from Get-Content edge cases must not bind-fail.
  if ($ExistingLines -is [string]) { $ExistingLines = @([string]$ExistingLines) }

  $inMatch = $false
  $sawAdminMatch = $false
  foreach ($line in $ExistingLines) {
    if ($line -match '^\s*Match\s+') {
      $inMatch = $true
      if ($line -match '(?i)Match\s+Group\s+administrators\b') {
        $sawAdminMatch = $true
      }
      $out.Add($line)
      continue
    }

    if (-not $inMatch) {
      if ($line -match '^\s*Port\s+') { continue }
      if ($line -match '^\s*PubkeyAuthentication\s+') { continue }
      if ($line -match '^\s*PasswordAuthentication\s+') { continue }
      if ($line -match '^\s*AuthorizedKeysFile\s+') { continue }
      if ($line -match '^\s*Subsystem\s+sftp') { continue }
      if ($line -match 'BEGIN OPSLY|END OPSLY') { continue }
    }

    $out.Add($line)
  }

  if (-not $sawAdminMatch) {
    $out.Add("")
    $out.Add("Match Group administrators")
    $out.Add("       AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys")
  }

  return , $out.ToArray()
}

function Invoke-OptionalWslTailscale {
  # Optional backup MagicDNS only. Never block on interactive `tailscale up`.
  $authKey = $env:OPSLY_WSL_TAILSCALE_AUTHKEY
  if (-not $authKey) { $authKey = $env:TS_AUTHKEY }

  $statusScript = @'
set -euo pipefail
if ! command -v tailscale >/dev/null 2>&1; then
  echo "wsl-tailscale: binary missing -- skip"
  exit 0
fi
systemctl enable --now tailscaled 2>/dev/null || true
backend="$(tailscale status --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get(\"BackendState\",\"\"))" 2>/dev/null || true)"
echo "wsl-tailscale: BackendState=${backend:-unknown}"
case "${backend:-}" in
  Running)
    tailscale status --self 2>/dev/null | head -2 || true
    ;;
  *)
    if [ -n "${OPSLY_WSL_TAILSCALE_AUTHKEY:-}" ] || [ -n "${TS_AUTHKEY:-}" ]; then
      key="${OPSLY_WSL_TAILSCALE_AUTHKEY:-$TS_AUTHKEY}"
      timeout 20 tailscale up --accept-dns=false --authkey="$key" 2>/dev/null || echo "wsl-tailscale: noninteractive up failed/timeout -- skip"
      tailscale status --self 2>/dev/null | head -2 || true
    else
      echo "wsl-tailscale: not Running and no OPSLY_WSL_TAILSCALE_AUTHKEY/TS_AUTHKEY -- skip interactive up"
    fi
    ;;
esac
'@

  $envAssign = ""
  if ($authKey) {
    # Pass auth key only into this one wsl invocation; do not persist it.
    $escaped = $authKey.Replace("'", "'\''")
    $envAssign = "OPSLY_WSL_TAILSCALE_AUTHKEY='$escaped' "
  }

  wsl -u root -e bash -lc ($envAssign + $statusScript) | ForEach-Object { Write-Log $_ }
}

New-Item -ItemType Directory -Force -Path $LogDir, $BinDir | Out-Null
Write-Log "=== ensure-smdqcia-agent-access START dryRun=$DryRun ==="

if ($DryRun) {
  Write-Log "[dry-run] would enforce mirrored WSL, OpenSSH:22 + WSL exe wrapper, keys, Tailscale-scoped firewall, portproxy:22 only"
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

# 2) Executable wrapper (OpenSSH DefaultShell MUST be an .exe, not .cmd)
Build-OpslyAgentShellExe -OutputPath $WrapperExe

# Keep a .cmd twin for manual Windows debugging only (not used as DefaultShell).
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
[System.IO.File]::WriteAllText($WrapperCmd, $wrapperBody.Replace("`r`n", "`n"))
Write-Log "wrote debug helper $WrapperCmd (not DefaultShell)"

# 3) Kill broken portproxy loops on :22 only
Remove-Port22Proxies

# 4) Keys (Mac dragon keys already in WSL authorized_keys)
$keys = wsl -e bash -lc "cat ~/.ssh/authorized_keys"
if (-not $keys) { throw "WSL ~/.ssh/authorized_keys empty -- authorize Mac pubkey first" }

$userAuth = Join-Path $env:USERPROFILE ".ssh\authorized_keys"
New-Item -ItemType Directory -Force -Path (Split-Path $userAuth) | Out-Null
# Prior runs may leave USER:(R) only; reclaim write for elevated re-runs.
if (Test-Path $userAuth) {
  takeown /F $userAuth | Out-Null
  Invoke-IcaclsChecked -Path $userAuth -Arguments @($userAuth, "/inheritance:r")
  Invoke-IcaclsChecked -Path $userAuth -Arguments @($userAuth, "/grant:r", "${AdministratorsSid}:F")
  Invoke-IcaclsChecked -Path $userAuth -Arguments @($userAuth, "/grant:r", "SYSTEM:F")
  Invoke-IcaclsChecked -Path $userAuth -Arguments @($userAuth, "/grant:r", "${env:USERNAME}:M")
}
Set-Content -Path $userAuth -Value $keys -Encoding ASCII
Invoke-IcaclsChecked -Path $userAuth -Arguments @($userAuth, "/inheritance:r")
Invoke-IcaclsChecked -Path $userAuth -Arguments @($userAuth, "/grant:r", "${AdministratorsSid}:F")
Invoke-IcaclsChecked -Path $userAuth -Arguments @($userAuth, "/grant:r", "SYSTEM:F")
Invoke-IcaclsChecked -Path $userAuth -Arguments @($userAuth, "/grant:r", "${env:USERNAME}:R")

$adminAuth = "C:\ProgramData\ssh\administrators_authorized_keys"
if (Test-Path $adminAuth) {
  takeown /F $adminAuth | Out-Null
  Invoke-IcaclsChecked -Path $adminAuth -Arguments @($adminAuth, "/inheritance:r")
  Invoke-IcaclsChecked -Path $adminAuth -Arguments @($adminAuth, "/grant:r", "${AdministratorsSid}:F")
  Invoke-IcaclsChecked -Path $adminAuth -Arguments @($adminAuth, "/grant:r", "SYSTEM:F")
}
Set-Content -Path $adminAuth -Value $keys -Encoding ASCII
Invoke-IcaclsChecked -Path $adminAuth -Arguments @($adminAuth, "/inheritance:r")
Invoke-IcaclsChecked -Path $adminAuth -Arguments @($adminAuth, "/grant:r", "${AdministratorsSid}:F")
Invoke-IcaclsChecked -Path $adminAuth -Arguments @($adminAuth, "/grant:r", "SYSTEM:F")
Write-Log "synced authorized_keys (Administrators SID $AdministratorsSid)"

# 5) sshd_config: Port 22 + pubkey -- only rewrite GLOBAL directives; preserve Match bodies
$sshdConfig = "C:\ProgramData\ssh\sshd_config"
if (-not (Test-Path -LiteralPath $sshdConfig) -or ((Get-Item -LiteralPath $sshdConfig).Length -eq 0)) {
  $latestBak = Get-ChildItem -LiteralPath (Split-Path $sshdConfig) -Filter "sshd_config.bak-opsly-*" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($latestBak) {
    Copy-Item -LiteralPath $latestBak.FullName -Destination $sshdConfig -Force
    Write-Log "restored empty sshd_config from $($latestBak.Name)"
  }
}
Copy-Item -LiteralPath $sshdConfig "$sshdConfig.bak-opsly-$(Get-Date -Format yyyyMMddHHmmss)" -Force
# Force array; never pass a scalar empty string into ConvertTo-ManagedSshdConfig.
$base = [System.Collections.Generic.List[string]]::new()
try {
  foreach ($line in [System.IO.File]::ReadAllLines($sshdConfig)) { $base.Add($line) }
} catch {
  Write-Log "ReadAllLines failed ($_); falling back to Get-Content"
  foreach ($line in @(Get-Content -LiteralPath $sshdConfig -ErrorAction SilentlyContinue)) {
    if ($null -ne $line) { $base.Add([string]$line) }
  }
}
Write-Log ("sshd_config lines={0} bytes={1}" -f $base.Count, (Get-Item -LiteralPath $sshdConfig).Length)
$managed = ConvertTo-ManagedSshdConfig -ExistingLines $base.ToArray()
$managed | Set-Content -LiteralPath $sshdConfig -Encoding ASCII

New-Item -Path "HKLM:\SOFTWARE\OpenSSH" -Force | Out-Null
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell -Value $WrapperExe -PropertyType String -Force | Out-Null
# OpenSSH appends CommandOption + remote command; our exe understands `-c`.
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShellCommandOption -Value "-c" -PropertyType String -Force | Out-Null
Write-Log "DefaultShell=$WrapperExe DefaultShellCommandOption=-c"

# 6) Firewall -- Tailscale CGNAT only (never open :22 to LAN/public Any)
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
if ($st -ne "Running") { throw "sshd failed to start -- see Application log" }

# 8) Optional WSL Tailscale (backup MagicDNS) -- gated; never interactive hang
Invoke-OptionalWslTailscale

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
Write-Log "DefaultShell:   $WrapperExe (executable, not .cmd)"
Write-Log "Do NOT start WSL ssh.socket -- Windows OpenSSH owns :22"
