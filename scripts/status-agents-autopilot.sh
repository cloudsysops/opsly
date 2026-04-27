#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PID_FILE="${PID_FILE:-runtime/logs/agents-autopilot.pid}"
LOG_FILE="${LOG_FILE:-runtime/logs/agents-autopilot.log}"

if [[ ! -f "$PID_FILE" ]]; then
  echo "status=stopped"
  echo "pid_file=$PID_FILE"
  exit 0
fi

pid="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ -z "$pid" ]]; then
  echo "status=unknown pid_file_empty"
  exit 1
fi

if kill -0 "$pid" 2>/dev/null; then
  echo "status=running pid=$pid"
  echo "log=$LOG_FILE"
  exit 0
fi

echo "status=stale pid=$pid"
exit 1
