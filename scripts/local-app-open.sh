#!/usr/bin/env bash
# Open only approved local apps for Opsly work.
# macOS TCC (Accessibility, Automation for AppleScript, etc.): see
# docs/04-infrastructure/MACOS-LOCAL-AI-AUTOMATION.md — the human must grant these.
set -euo pipefail

APP="${1:-}"

case "$APP" in
  cursor)
    open -a Cursor "$HOME/opsly-workspace/opsly"
    ;;
  vscode|code)
    open -a "Visual Studio Code" "$HOME/opsly-workspace/opsly"
    ;;
  iterm|iterm2)
    exec "$(dirname "$0")/local-iterm-open.sh" "${2:-}"
    ;;
  docker)
    open -a Docker
    ;;
  obs)
    open -a OBS
    ;;
  ableton)
    open -a "Ableton Live"
    ;;
  *)
    echo "Usage: $0 {cursor|vscode|iterm|docker|obs|ableton} [iterm-command]" >&2
    exit 2
    ;;
esac
