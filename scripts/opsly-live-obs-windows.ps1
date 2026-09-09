param([Parameter(Mandatory = $true)][string]$Payload)

$ErrorActionPreference = 'Stop'
$request = $Payload | ConvertFrom-Json
$blocked = @('start_stream', 'stop_stream', 'set_stream_service_settings')
if ($blocked -contains [string]$request.action) {
  throw "action '$($request.action)' is blocked by PC Gamer policy"
}

$map = @{
  get_version = @{ type = 'GetVersion'; data = @{} }
  get_stream_status = @{ type = 'GetStreamStatus'; data = @{} }
  get_stats = @{ type = 'GetStats'; data = @{} }
  get_record_status = @{ type = 'GetRecordStatus'; data = @{} }
  start_record = @{ type = 'StartRecord'; data = @{} }
  stop_record = @{ type = 'StopRecord'; data = @{} }
  pause_record = @{ type = 'PauseRecord'; data = @{} }
  resume_record = @{ type = 'ResumeRecord'; data = @{} }
  save_replay_buffer = @{ type = 'SaveReplayBuffer'; data = @{} }
  get_current_program_scene = @{ type = 'GetCurrentProgramScene'; data = @{} }
  get_scene_list = @{ type = 'GetSceneList'; data = @{} }
}
$action = [string]$request.action
if ($action -eq 'set_current_program_scene') {
  $name = [string]$request.params.scene_name
  if ([string]::IsNullOrWhiteSpace($name)) { throw 'scene_name is required' }
  $map[$action] = @{ type = 'SetCurrentProgramScene'; data = @{ sceneName = $name.Trim() } }
}
if (-not $map.ContainsKey($action)) { throw "unknown action '$action'" }

function Hash-Base64([string]$value) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { return [Convert]::ToBase64String($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($value))) }
  finally { $sha.Dispose() }
}
function Send-Json($socket, $value) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($value | ConvertTo-Json -Compress -Depth 10))
  $socket.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
}
function Receive-Json($socket) {
  $buffer = New-Object byte[] 65536
  $result = $socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), [Threading.CancellationToken]::None).GetAwaiter().GetResult()
  if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) { throw 'OBS WebSocket closed' }
  return [Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count) | ConvertFrom-Json
}

$password = $env:OBS_WEBSOCKET_PASSWORD
if ([string]::IsNullOrEmpty($password)) {
  $obsConfigPath = Join-Path $env:APPDATA 'obs-studio\plugin_config\obs-websocket\config.json'
  if (Test-Path -LiteralPath $obsConfigPath) {
    $obsConfig = Get-Content -LiteralPath $obsConfigPath -Raw | ConvertFrom-Json
    $password = [string]$obsConfig.server_password
  }
}
if ([string]::IsNullOrEmpty($password)) {
  $line = & wsl.exe -d Ubuntu -- bash -lc "grep '^OBS_WEBSOCKET_PASSWORD=' /home/devops/.config/opsly/obs-websocket.env" 2>$null
  if ($line) { $password = ([string]$line -replace '^OBS_WEBSOCKET_PASSWORD=', '').Trim() }
}
if ([string]::IsNullOrEmpty($password)) { throw 'OBS_WEBSOCKET_PASSWORD is not set' }
$socket = [Net.WebSockets.ClientWebSocket]::new()
try {
  $socket.ConnectAsync([Uri]'ws://127.0.0.1:4455', [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
  $hello = Receive-Json $socket
  $auth = $null
  if ($hello.op -eq 0 -and $hello.d.authentication) {
    $auth = Hash-Base64 ($hello.d.authentication.salt + $password)
    $auth = Hash-Base64 ($auth + $hello.d.authentication.challenge)
  }
  $identify = @{ op = 1; d = @{ rpcVersion = 1 } }
  if ($auth) { $identify.d.authentication = $auth }
  Send-Json $socket $identify
  $identified = Receive-Json $socket
  if ($identified.op -ne 2) { throw 'OBS WebSocket identification failed' }
  $requestId = [guid]::NewGuid().ToString()
  Send-Json $socket @{ op = 6; d = @{ requestType = $map[$action].type; requestId = $requestId; requestData = $map[$action].data } }
  do { $response = Receive-Json $socket } while ($response.op -ne 7 -or $response.d.requestId -ne $requestId)
  if (-not $response.d.requestStatus.result) { throw [string]$response.d.requestStatus.comment }
  @{ ok = $true; data = $response.d.responseData } | ConvertTo-Json -Compress -Depth 10
}
finally {
  if ($socket) { $socket.Dispose() }
}
