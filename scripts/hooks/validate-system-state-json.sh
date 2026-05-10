#!/bin/bash
# Valida system_state.json usando la ruta resuelta
# Usado por .githooks/pre-push y CI workflows

set -e

STATE_FILE=$(bash scripts/hooks/resolve-system-state.sh)

if [ ! -f "$STATE_FILE" ]; then
  echo "❌ system_state.json not found at $STATE_FILE"
  exit 1
fi

if ! python3 -m json.tool "$STATE_FILE" > /dev/null 2>&1; then
  echo "❌ system_state.json at $STATE_FILE is not valid JSON"
  exit 1
fi

echo "✅ system_state.json is valid JSON"
