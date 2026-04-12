#!/bin/sh
set -eu
export ORCHESTRATOR_HEALTH_PORT="${ORCHESTRATOR_HEALTH_PORT:-3020}"
node /app/infra/hermes/hermes-register-repeat.cjs
exec node /app/infra/hermes/hermes-worker-standalone.cjs
