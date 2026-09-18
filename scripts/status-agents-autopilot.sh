#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PID_FILE="${PID_FILE:-runtime/logs/agents-autopilot.pid}"

echo "status=deprecated"
echo "execution_model=ephemeral-tmux-per-agent-task"

if [[ -f "$PID_FILE" ]]; then
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "legacy_process=running pid=$pid"
    echo "action=run ./scripts/stop-agents-autopilot.sh"
    exit 1
  fi
  echo "legacy_pid_file=stale"
  echo "action=remove stale pid file or run stop script"
  exit 1
fi

if command -v tmux >/dev/null 2>&1; then
  count="$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep -c '^opsly-task-' || true)"
  echo "active_ephemeral_sessions=$count"
fi

exit 0
