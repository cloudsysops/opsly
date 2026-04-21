#!/bin/sh
set -eu
export ORCHESTRATOR_HEALTH_PORT="${ORCHESTRATOR_HEALTH_PORT:-3020}"

# Start health server in background before workers
node /app/apps/orchestrator/dist/health-server.js &
HEALTH_PID=$!
sleep 2

# Verify health server is running
if curl -sf http://127.0.0.1:3020/health >/dev/null 2>&1; then
  echo "[entrypoint] Health server ready on port 3020"
else
  echo "[entrypoint] Warning: Health server not responding yet"
fi

# Register repeatable and start worker (keep health server running)
node /app/infra/hermes/hermes-register-repeat.cjs &
exec node /app/infra/hermes/hermes-worker-standalone.cjs
