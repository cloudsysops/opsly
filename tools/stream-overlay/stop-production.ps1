# Detiene el set: apaga el sonido, termina la grabacion (WAV + MIDI), vuelve a la escena anterior y cierra el proyector.
# El stream de Twitch NO se detiene (eso se hace aparte en OBS o con run.ps1 stop).
$api = 'http://127.0.0.1:8766'
try { Invoke-RestMethod "$api/set/stop" | Out-Null; "Set detenido." } catch { "El servidor no responde." }
try { Invoke-RestMethod "$api/sonify/off" | Out-Null; "Sonido apagado." } catch {}
try { Invoke-RestMethod "$api/rec/off" | Out-Null } catch {}
& "$PSScriptRoot\projector.ps1" -Close
