#!/usr/bin/env bash
# Create or attach to the Opsly agent tmux session on the local operator machine.
#
# Usage:
#   ./scripts/opsly-agents-tmux.sh
#
# Session layout:
#   - router
#   - planner
#   - executor
#   - reviewer
#   - qa
#   - ops
#
set -euo pipefail

SESSION="${OPSLY_AGENTS_TMUX_SESSION:-opsly-agents}"
WORKSPACE_ROOT="${OPSLY_LOCAL_WORKSPACE:-$HOME/opsly-workspace/opsly}"
SHELL_BIN="${SHELL:-/bin/zsh}"

if ! command -v tmux >/dev/null 2>&1; then
  echo "opsly-agents-tmux: tmux is not installed" >&2
  exit 1
fi

if [[ ! -d "$WORKSPACE_ROOT" ]]; then
  echo "opsly-agents-tmux: workspace not found: $WORKSPACE_ROOT" >&2
  echo "  mkdir -p \"\$HOME/opsly-workspace\" && ln -s \"<CLONE>\" \"\$HOME/opsly-workspace/opsly\"" >&2
  exit 1
fi

case "$WORKSPACE_ROOT" in
  "$HOME/opsly-workspace"/*) ;;
  *)
    echo "opsly-agents-tmux: refusing workspace outside ~/opsly-workspace: $WORKSPACE_ROOT" >&2
    exit 1
    ;;
esac

if tmux has-session -t "${SESSION}" 2>/dev/null; then
  echo "opsly-agents-tmux: session '${SESSION}' already exists. Attach with: tmux attach -t ${SESSION}"
  exit 0
fi

tmux new-session -d -s "${SESSION}" -n router -c "${WORKSPACE_ROOT}" "${SHELL_BIN}" -l
tmux new-window -t "${SESSION}" -n planner -c "${WORKSPACE_ROOT}" "${SHELL_BIN}" -l
tmux new-window -t "${SESSION}" -n executor -c "${WORKSPACE_ROOT}" "${SHELL_BIN}" -l
tmux new-window -t "${SESSION}" -n reviewer -c "${WORKSPACE_ROOT}" "${SHELL_BIN}" -l
tmux new-window -t "${SESSION}" -n qa -c "${WORKSPACE_ROOT}" "${SHELL_BIN}" -l
tmux new-window -t "${SESSION}" -n ops -c "${WORKSPACE_ROOT}" "${SHELL_BIN}" -l

tmux select-window -t "${SESSION}:router"

echo "opsly-agents-tmux: created session '${SESSION}'."
echo "  attach: tmux attach -t ${SESSION}"
