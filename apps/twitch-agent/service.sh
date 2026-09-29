#!/usr/bin/env bash
# Arranca el agente Twitch (servicio HTTP 5014).
# Uso: ./service.sh [config.json]   (correr desde apps/twitch-agent, o vía WSL en el PC gamer)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV="${OPSLY_TWITCH_AGENT_VENV:-$HOME/opsly-twitch-agent/venv}"

export OPSLY_TWITCH_AGENT_URL="${OPSLY_TWITCH_AGENT_URL:-http://localhost:5014}"
export OPSLY_ROOT="${OPSLY_ROOT:-$ROOT}"

if [ -x "$VENV/bin/python" ]; then
  PY="$VENV/bin/python"
else
  PY="${PYTHON:-python3}"
fi

cd "$ROOT"
exec "$PY" "$ROOT/apps/twitch-agent/src/twitch_agent_service.py" "$@"
