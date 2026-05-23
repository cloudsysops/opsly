#!/usr/bin/env bash
# Open Ghostty in the Opsly workspace (macOS: open -na Ghostty.app).
#
# Usage:
#   scripts/local-ghostty-open.sh
#   scripts/local-ghostty-open.sh "tmux attach -t opsly-agents"
#
# Requires Ghostty + config (scripts/install-ghostty-config.sh).
# Permissions: docs/04-infrastructure/MACOS-LOCAL-AI-AUTOMATION.md
set -euo pipefail

WORKSPACE_ROOT="${OPSLY_LOCAL_WORKSPACE:-$HOME/opsly-workspace/opsly}"
DEFAULT_COMMAND='pwd && git status --short && tmux list-sessions 2>/dev/null || true'
COMMAND_TO_RUN="${1:-$DEFAULT_COMMAND}"

if [[ ! -d "$WORKSPACE_ROOT" ]]; then
  echo "local-ghostty-open: workspace not found: $WORKSPACE_ROOT" >&2
  echo "  mkdir -p \"\$HOME/opsly-workspace\" && ln -s \"<CLONE>\" \"\$HOME/opsly-workspace/opsly\"" >&2
  exit 1
fi

case "$WORKSPACE_ROOT" in
  "$HOME/opsly-workspace"/*) ;;
  *)
    echo "local-ghostty-open: refusing workspace outside ~/opsly-workspace: $WORKSPACE_ROOT" >&2
    exit 1
    ;;
esac

if [[ ! -d "/Applications/Ghostty.app" ]]; then
  echo "local-ghostty-open: Ghostty.app not installed" >&2
  exit 1
fi

# Escape for a single zsh -lc argument
escaped_ws="${WORKSPACE_ROOT//\"/\\\"}"
escaped_cmd="${COMMAND_TO_RUN//\"/\\\"}"

open -na Ghostty.app --args -e /bin/zsh -l "-lc" "cd \"${escaped_ws}\" && ${escaped_cmd}"
