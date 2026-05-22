#!/bin/bash
# install-cursor-monitor.sh — Instala el LaunchAgent que activa Cursor cuando ACTIVE-PROMPT.md cambia
# Uso: ./scripts/install-cursor-monitor.sh
# Requiere: fswatch (brew install fswatch)

set -euo pipefail

REPO_DIR="${OPSLY_ROOT:-$HOME/opsly}"
PLIST_NAME="com.opsly.cursor-prompt-monitor"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"
MONITOR_SCRIPT="$REPO_DIR/scripts/cursor-prompt-trigger.sh"
LOG_DIR="$REPO_DIR/logs"

echo "📦 Opsly — Cursor Prompt Monitor Installer"
echo "Repo: $REPO_DIR"
echo ""

# Verificar fswatch
if ! command -v fswatch &>/dev/null; then
  echo "❌ fswatch no instalado. Ejecuta: brew install fswatch"
  exit 1
fi
echo "✅ fswatch disponible: $(fswatch --version 2>&1 | head -1)"

# Crear directorios
mkdir -p "$LOG_DIR"

# Crear el script trigger si no existe
if [[ ! -f "$MONITOR_SCRIPT" ]]; then
  cat > "$MONITOR_SCRIPT" << 'TRIGGER_SCRIPT'
#!/bin/bash
# cursor-prompt-trigger.sh — Activado por LaunchAgent cuando ACTIVE-PROMPT.md cambia
set -euo pipefail

REPO_DIR="${OPSLY_ROOT:-$HOME/opsly}"
PROMPT_FILE="$REPO_DIR/docs/ACTIVE-PROMPT.md"
LOG_FILE="$REPO_DIR/logs/cursor-prompt-trigger.log"

mkdir -p "$(dirname "$LOG_FILE")"
log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1" | tee -a "$LOG_FILE"; }

log "Cambio detectado en ACTIVE-PROMPT.md"

# Verificar que el archivo tiene una tarea nueva (no completada)
if grep -q "## STATUS: completado" "$PROMPT_FILE" 2>/dev/null; then
  log "STATUS ya completado — ignorando"
  exit 0
fi

if ! grep -qE "## Tarea:|## MÓDULO|## Job:" "$PROMPT_FILE" 2>/dev/null; then
  log "Sin tarea activa en ACTIVE-PROMPT.md — ignorando"
  exit 0
fi

log "Activando Cursor con nueva tarea..."

# Activar Cursor y abrir el archivo
osascript << 'APPLESCRIPT'
tell application "Cursor"
  activate
  delay 1
end tell
APPLESCRIPT

log "Cursor activado ✅"

# Notificar Discord si está disponible
DISCORD="${DISCORD_WEBHOOK_URL:-}"
if [[ -n "$DISCORD" ]]; then
  curl -s -X POST "$DISCORD" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"🖥️ cursor-prompt-monitor: nuevo prompt detectado, Cursor activado\"}" \
    2>/dev/null || true
fi
TRIGGER_SCRIPT
  chmod +x "$MONITOR_SCRIPT"
  echo "✅ Script trigger creado: $MONITOR_SCRIPT"
fi

# Crear LaunchAgent plist
cat > "$PLIST_PATH" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_NAME}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-c</string>
    <string>fswatch -o "${REPO_DIR}/docs/ACTIVE-PROMPT.md" | while read; do OPSLY_ROOT="${REPO_DIR}" bash "${MONITOR_SCRIPT}"; done</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>OPSLY_ROOT</key>
    <string>${REPO_DIR}</string>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/cursor-prompt-monitor.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/cursor-prompt-monitor-error.log</string>
</dict>
</plist>
PLIST

# Cargar el LaunchAgent
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo ""
echo "✅ cursor-prompt-monitor instalado y activo"
echo ""
echo "Vigila: $REPO_DIR/docs/ACTIVE-PROMPT.md"
echo "Log:    $LOG_DIR/cursor-prompt-monitor.log"
echo ""
echo "Para verificar: launchctl list | grep opsly"
echo "Para detener:   launchctl unload $PLIST_PATH"
