#!/usr/bin/env bash
# Ensure tools/live-automation venv and run osc_send.py (same args as script).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV="$ROOT/tools/live-automation/.venv"
REQ="$ROOT/tools/live-automation/requirements.txt"
PY="$VENV/bin/python3"
OSC="$ROOT/tools/live-automation/osc_send.py"

if [[ ! -x "$PY" ]]; then
  python3 -m venv "$VENV"
fi
"$PY" -m pip install -q -r "$REQ"
exec "$PY" "$OSC" "$@"
