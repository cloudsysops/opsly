#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

mkdir -p logs
PID_FILE="${PID_FILE:-logs/agents-autopilot.pid}"
LOG_FILE="${LOG_FILE:-logs/agents-autopilot.log}"

if [[ -f "$PID_FILE" ]]; then
  old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${old_pid}" ]] && kill -0 "${old_pid}" 2>/dev/null; then
    echo "agents-autopilot ya está corriendo pid=${old_pid}"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

chmod +x "$ROOT/scripts/agents-autopilot.sh"
nohup "$ROOT/scripts/agents-autopilot.sh" >>"$LOG_FILE" 2>&1 &
new_pid="$!"
echo "$new_pid" >"$PID_FILE"

echo "agents-autopilot iniciado pid=${new_pid}"
echo "log: $LOG_FILE"
echo "pid: $PID_FILE"
