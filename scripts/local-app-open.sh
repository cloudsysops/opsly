#!/usr/bin/env bash
# Open approved local apps for Opsly work.
# macOS TCC: docs/04-infrastructure/MACOS-LOCAL-AI-AUTOMATION.md
set -euo pipefail

APP="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${OPSLY_LOCAL_WORKSPACE:-$HOME/opsly-workspace/opsly}"

case "$APP" in
  cursor)
    open -a Cursor "$WORKSPACE"
    ;;
  vscode|code)
    open -a "Visual Studio Code" "$WORKSPACE"
    ;;
  ghostty)
    exec "${SCRIPT_DIR}/local-ghostty-open.sh" "${2:-}"
    ;;
  ghostty-agents)
    exec "${SCRIPT_DIR}/local-ghostty-agents.sh"
    ;;
  iterm|iterm2)
    exec "${SCRIPT_DIR}/local-iterm-open.sh" "${2:-}"
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
    echo "Usage: $0 {cursor|vscode|ghostty|ghostty-agents|iterm|docker|obs|ableton} [terminal-command]" >&2
    exit 2
    ;;
esac
