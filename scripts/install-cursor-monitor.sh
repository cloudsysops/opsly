#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST_DIR="${HOME}/Library/LaunchAgents"
PLIST_PATH="${PLIST_DIR}/com.opsly.cursor-prompt-monitor.plist"
LOG_DIR="${ROOT_DIR}/runtime/logs"

mkdir -p "${LOG_DIR}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "install-cursor-monitor: non-macOS host detected; skipping launchd install."
  echo "install-cursor-monitor: monitor script is available at ${ROOT_DIR}/scripts/cursor-prompt-monitor.sh"
  exit 0
fi

if [[ ! -x "${ROOT_DIR}/scripts/cursor-prompt-monitor.sh" ]]; then
  chmod +x "${ROOT_DIR}/scripts/cursor-prompt-monitor.sh"
fi

mkdir -p "${PLIST_DIR}"
cat > "${PLIST_PATH}" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.opsly.cursor-prompt-monitor</string>
  <key>ProgramArguments</key>
  <array>
    <string>${ROOT_DIR}/scripts/cursor-prompt-monitor.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${ROOT_DIR}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/cursor-prompt-monitor.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/cursor-prompt-monitor.err.log</string>
</dict>
</plist>
PLIST

launchctl unload "${PLIST_PATH}" 2>/dev/null || true
launchctl load "${PLIST_PATH}"
echo "install-cursor-monitor: installed ${PLIST_PATH}"
