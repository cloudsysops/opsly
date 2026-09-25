#!/usr/bin/env bash
# Arranca el agente AI DJ (servicio HTTP 5013) en el Mac.
# Uso: ./service.sh [config.json]   (correr desde apps/ai-dj)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV="${OPSLY_AI_DJ_VENV:-$HOME/opsly-ai-dj/venv}"

export OPSLY_AI_DJ_AGENT_URL="${OPSLY_AI_DJ_AGENT_URL:-http://localhost:5013}"
export OPSLY_ROOT="${OPSLY_ROOT:-$ROOT}"

if [ -x "$VENV/bin/python" ]; then
  PY="$VENV/bin/python"
else
  PY="${PYTHON:-python3}"
fi

exec "$PY" "$ROOT/apps/ai-dj/src/ai_dj_service.py" "$@"