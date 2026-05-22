#!/usr/bin/env bash
# Open iTerm2 in the Opsly workspace (AppleScript).
#
# Usage:
#   scripts/local-iterm-open.sh
#   scripts/local-iterm-open.sh "tmux attach -t opsly-agents"
#
# Permissions: docs/04-infrastructure/MACOS-LOCAL-AI-AUTOMATION.md
set -euo pipefail

WORKSPACE_ROOT="${OPSLY_LOCAL_WORKSPACE:-$HOME/opsly-workspace/opsly}"
DEFAULT_COMMAND='pwd && git status --short && tmux list-sessions 2>/dev/null || true'
COMMAND_TO_RUN="${1:-$DEFAULT_COMMAND}"

if [[ ! -d "$WORKSPACE_ROOT" ]]; then
  echo "local-iterm-open: workspace not found: $WORKSPACE_ROOT" >&2
  echo "  mkdir -p \"\$HOME/opsly-workspace\" && ln -s \"<CLONE>\" \"\$HOME/opsly-workspace/opsly\"" >&2
  exit 1
fi

case "$WORKSPACE_ROOT" in
  "$HOME/opsly-workspace"/*) ;;
  *)
    echo "local-iterm-open: refusing workspace outside ~/opsly-workspace: $WORKSPACE_ROOT" >&2
    exit 1
    ;;
esac

osascript <<OSA
tell application "iTerm"
  activate
  create window with default profile
  tell current session of current window
    write text "cd \"$WORKSPACE_ROOT\" && $COMMAND_TO_RUN"
  end tell
end tell
OSA
