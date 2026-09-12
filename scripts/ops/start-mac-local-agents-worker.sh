#!/usr/bin/env bash
# Persistent Mac infrastructure worker. It consumes only the existing local-agents
# BullMQ queue. AI runtimes themselves are created per task by Session Manager/tmux.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

export OPSLY_ORCHESTRATOR_ROLE=worker
export OPSLY_WORKER_ALLOWLIST=local-agents
export OPSLY_LOCAL_AGENT_UNIFIED_ONLY=true

# Persistent autonomous/experimental loops are intentionally disabled.
export OPSLY_AUTONOMOUS_SCHEDULER_ENABLED=false
export OPSLY_HELP_BRIDGE_ENABLED=false
export OPSLY_CORTEX_ENABLED=false
export OPSLY_SUPER_ORCHESTRATOR_WORKER_ENABLED=false
export OPSLY_AGENT_CLASSIFIER_WORKER_ENABLED=false
export OPSLY_SANDBOX_WORKER_ENABLED=false
export OPSLY_AGENT_FARM_WORKER_ENABLED=false
export OPSLY_APPROVAL_GATE_WORKER_ENABLED=false
export OPSLY_SIGMA_HARNESS_WORKER_ENABLED=false

if [[ -z "${REDIS_URL:-}" ]]; then
  echo "[mac-worker] REDIS_URL is required" >&2
  exit 3
fi
if [[ -z "${OPSLY_CLI_AGENT_TOKEN:-}" ]]; then
  echo "[mac-worker] OPSLY_CLI_AGENT_TOKEN is required for fail-closed bridges" >&2
  exit 3
fi

echo "[mac-worker] role=worker allowlist=local-agents execution=ephemeral-tmux"
npm run build --workspace=@intcloudsysops/orchestrator
exec npm run start --workspace=@intcloudsysops/orchestrator
