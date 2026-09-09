#!/usr/bin/env bash
# Canonical safe OBS WebSocket dispatcher for local/PC Gamer automation.
#
# Usage:
#   scripts/opsly-live-obs.sh '{"action":"get_version"}'
#
# The password is read from OBS_WEBSOCKET_PASSWORD or OBS_WEBSOCKET_PASSWORD_FILE.
# Streaming/publishing actions are intentionally blocked in dispatch.py.
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]}"
if command -v readlink >/dev/null 2>&1; then
  SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH" 2>/dev/null || printf '%s' "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV="${OPSLY_LIVE_AUTOMATION_VENV:-$ROOT/tools/live-automation/.venv}"
PY="$VENV/bin/python3"

if [[ ! -x "$PY" ]]; then
  python3 -m venv "$VENV"
fi

"$PY" -m pip install -q -r "$ROOT/tools/live-automation/requirements.txt"

if [[ -n "${OBS_WEBSOCKET_PASSWORD_FILE:-}" && -z "${OBS_WEBSOCKET_PASSWORD:-}" ]]; then
  if [[ ! -r "$OBS_WEBSOCKET_PASSWORD_FILE" ]]; then
    echo '{"ok":false,"error":"OBS_WEBSOCKET_PASSWORD_FILE is not readable"}' >&2
    exit 1
  fi
  export OBS_WEBSOCKET_PASSWORD="$(<"$OBS_WEBSOCKET_PASSWORD_FILE")"
fi

exec "$PY" "$ROOT/tools/live-automation/dispatch.py" "$@"
