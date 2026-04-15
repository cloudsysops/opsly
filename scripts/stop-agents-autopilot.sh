#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PID_FILE="${PID_FILE:-logs/agents-autopilot.pid}"

if [[ ! -f "$PID_FILE" ]]; then
  echo "agents-autopilot no está corriendo (sin pid file)"
  exit 0
fi

pid="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ -z "$pid" ]]; then
  rm -f "$PID_FILE"
  echo "pid vacío; limpiado $PID_FILE"
  exit 0
fi

if kill -0 "$pid" 2>/dev/null; then
  kill "$pid"
  echo "agents-autopilot detenido pid=$pid"
else
  echo "pid $pid no estaba activo"
fi

rm -f "$PID_FILE"
