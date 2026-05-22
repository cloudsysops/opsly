#!/usr/bin/env bash
# Open a controlled iTerm2 window in the Opsly development workspace.
#
# Usage:
#   scripts/local-iterm-open.sh
#   scripts/local-iterm-open.sh "tmux attach -t openclaw"
#
# The command runs under ~/opsly-workspace/opsly, not from arbitrary paths.
# Requires AppleScript control of iTerm; see docs/04-infrastructure/MACOS-LOCAL-AI-AUTOMATION.md.
set -euo pipefail

WORKSPACE_ROOT="${OPSLY_LOCAL_WORKSPACE:-$HOME/opsly-workspace/opsly}"
DEFAULT_COMMAND='pwd && git status --short && tmux list-sessions 2>/dev/null || true'
COMMAND_TO_RUN="${1:-$DEFAULT_COMMAND}"

if [[ ! -d "$WORKSPACE_ROOT" ]]; then
  echo "local-iterm-open: workspace not found: $WORKSPACE_ROOT" >&2
  echo "Create the symlink (replace <CLONE> with the absolute path to your intcloudsysops clone):" >&2
  echo "  mkdir -p \"\$HOME/opsly-workspace\" && ln -s \"<CLONE>\" \"\$HOME/opsly-workspace/opsly\"" >&2
  echo "Or set OPSLY_LOCAL_WORKSPACE to that directory." >&2
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
