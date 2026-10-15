# Cliente OBS-WebSocket v5 puro en PowerShell (sin depender de WSL/Python).
# Uso: . C:\Users\opsly\obs_ws_client.ps1 ; $r = Invoke-ObsRequest -RequestType "StartStream"

function Get-ObsAuth {
    param([string]$Password, [string]$Salt, [string]$Challenge)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $secretBytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Password + $Salt))
    $base64Secret = [Convert]::ToBase64String($secretBytes)
    $authBytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($base64Secret + $Challenge))
    return [Convert]::ToBase64String($authBytes)
}

function Connect-Obs {
    param([string]$Uri = "ws://127.0.0.1:4455", [string]$Password)
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $ct = New-Object System.Threading.CancellationToken
    try {
        [void]$ws.ConnectAsync([Uri]$Uri, $ct).GetAwaiter().GetResult()
    } catch {
        throw "No se pudo conectar a $Uri : $($_.Exception.InnerException.Message)"
    }

    $buffer = New-Object byte[] 8192
    $seg = New-Object System.ArraySegment[byte] (,$buffer)
    $result = $ws.ReceiveAsync($seg, $ct).GetAwaiter().GetResult()
    $helloJson = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
    $hello = $helloJson | ConvertFrom-Json

    $d = @{ rpcVersion = 1 }
    $auth = $hello.d.authentication
    if ($auth) {
        if (-not $Password) { throw "obs-websocket requiere password" }
        $d.authentication = Get-ObsAuth -Password $Password -Salt $auth.salt -Challenge $auth.challenge
    }
    $identify = @{ op = 1; d = $d } | ConvertTo-Json -Depth 5 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($identify)
    [void]$ws.SendAsync((New-Object System.ArraySegment[byte] (,$bytes)), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).GetAwaiter().GetResult()

    $attempts = 0
    do {
        $attempts++
        if ($attempts -gt 5) { throw "No se recibio Identified tras 5 intentos" }
        $result = $ws.ReceiveAsync($seg, $ct).GetAwaiter().GetResult()
        $msg = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count) | ConvertFrom-Json
    } while ($msg.op -ne 2)

    return $ws
}

function Get-ObsInputPeak {
    param(
        [string]$InputName,
        [int]$DurationSeconds = 6,
        [string]$Uri = "ws://127.0.0.1:4455",
        [string]$PasswordFile = "$env:APPDATA\obs-studio\plugin_config\obs-websocket\config.json"
    )
    $cfg = Get-Content $PasswordFile | ConvertFrom-Json
    $ws = Connect-Obs -Uri $Uri -Password $cfg.server_password
    $ct = New-Object System.Threading.CancellationToken

    # Reidentify con suscripcion a InputVolumeMeters (bit 1<<16 = 65536) + defaults bajos (511)
    # En realidad Connect-Obs ya identifico sin eventos; reenviamos un Reidentify (op 3).
    $reidentify = @{ op = 3; d = @{ eventSubscriptions = 65536 + 511 } } | ConvertTo-Json -Depth 5 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($reidentify)
    [void]$ws.SendAsync((New-Object System.ArraySegment[byte] (,$bytes)), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).GetAwaiter().GetResult()

    $buffer = New-Object byte[] 65536
    $seg = New-Object System.ArraySegment[byte] (,$buffer)
    $maxPeak = -100.0
    $deadline = (Get-Date).AddSeconds($DurationSeconds)
    while ((Get-Date) -lt $deadline) {
        $task = $ws.ReceiveAsync($seg, $ct)
        if ($task.Wait(500)) {
            $result = $task.GetAwaiter().GetResult()
            $msg = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count) | ConvertFrom-Json
            if ($msg.op -eq 5 -and $msg.d.eventType -eq "InputVolumeMeters") {
                foreach ($input in $msg.d.eventData.inputs) {
                    if ($input.inputName -eq $InputName) {
                        foreach ($ch in $input.inputLevelsMul) {
                            if ($ch[1] -gt $maxPeak) { $maxPeak = $ch[1] }
                        }
                    }
                }
            }
        }
    }
    [void]$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "", $ct).GetAwaiter().GetResult()
    return $maxPeak
}

function Invoke-ObsRequest {
    param(
        [string]$RequestType,
        [hashtable]$RequestData = @{},
        [string]$Uri = "ws://127.0.0.1:4455",
        [string]$PasswordFile = "$env:APPDATA\obs-studio\plugin_config\obs-websocket\config.json"
    )
    $cfg = Get-Content $PasswordFile | ConvertFrom-Json
    $ws = Connect-Obs -Uri $Uri -Password $cfg.server_password
    $ct = New-Object System.Threading.CancellationToken

    $reqId = [guid]::NewGuid().ToString()
    $req = @{ op = 6; d = @{ requestType = $RequestType; requestId = $reqId; requestData = $RequestData } } | ConvertTo-Json -Depth 6 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($req)
    [void]$ws.SendAsync((New-Object System.ArraySegment[byte] (,$bytes)), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).GetAwaiter().GetResult()

    $buffer = New-Object byte[] 65536
    $seg = New-Object System.ArraySegment[byte] (,$buffer)
    $attempts = 0
    do {
        $attempts++
        if ($attempts -gt 5) { throw "No se recibio respuesta (op 7) tras 5 intentos" }
        $result = $ws.ReceiveAsync($seg, $ct).GetAwaiter().GetResult()
        $resp = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count) | ConvertFrom-Json
    } while ($resp.op -ne 7)

    try { [void]$ws.CloseOutputAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "", $ct).GetAwaiter().GetResult() } catch {}
    return $resp.d
}
