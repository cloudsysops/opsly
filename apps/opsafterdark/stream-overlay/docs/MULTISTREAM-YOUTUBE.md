# Multistream Twitch + YouTube (OBS) — OpsAfterDark

Estado: VERIFICADO 2026-10-01 (YouTube Studio recibió señal). JOIN_EXISTING #1681.

## Componentes
- OBS 32.2.2 (Windows, PC Gamer). Salida principal = Twitch (Settings → Stream).
- Plugin **obs-multi-rtmp** (sorayuki) — instalador `*-windows-x64-Installer.exe` desde
  github.com/sorayuki/obs-multi-rtmp/releases. Instalación la hace el humano (UAC).
- Dock: `Docks → Multiple output`.

## Destino YouTube (no secretos aquí)
| Campo | Valor |
|---|---|
| Name | `YouTube` |
| Protocol | RTMP |
| URL | `rtmps://a.rtmps.youtube.com:443/live2` |
| Stream key | **la pega el humano** (YouTube Studio → Crear → Emitir en directo → Copiar). Nunca en logs/repo/chat |
| Video/Audio encoder | `Reuse the streaming encoder as OBS` (sin carga extra) |
| Sync start with OBS | ✔ |
| Sync stop with OBS | ✔ |

## Uso
1. Escena segura con fuente activa (Gaming con bf6 abierto, o Iniciando con overlay :8765 arriba).
2. `Start Streaming` → arranca Twitch + YouTube. `Stop Streaming` → para ambos.
3. Verificar en YouTube Studio (estado "Excelente") y en Twitch.

## Errores conocidos
- `Cannot reuse encoder when it's not in streaming or recording` / `Failed to create encoder object`:
  normal si pulsas **Start** del destino sin stream principal activo. Usar Start Streaming.
- Escenas en negro ≠ config perdida: requieren bf6.exe abierto, overlay en :8765, OpenCode/Terminal,
  Mission Control en :4001. Validar con `obs-doctor.py`.
- Nunca "Launch Anyway" (segunda instancia OBS rompe Game Capture).
- `gaming 2` (Display Capture LG) = SUPERSEDED, no usar en vivo.
