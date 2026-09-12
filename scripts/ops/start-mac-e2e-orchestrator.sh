#!/usr/bin/env bash
# Start the Opsly orchestrator in isolated Mac E2E smoke mode.
# Only the unified local-agents BullMQ worker is allowed to run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

export OPSLY_ORCHESTRATOR_ROLE=worker
export OPSLY_WORKER_ALLOWLIST=local-agents
export OPSLY_LOCAL_AGENT_UNIFIED_ONLY=true
export OPSLY_AUTONOMOUS_SCHEDULER_ENABLED=false
export OPSLY_HELP_BRIDGE_ENABLED=false
export OPSLY_CORTEX_ENABLED=false
export OPSLY_SUPER_ORCHESTRATOR_WORKER_ENABLED=false
export OPSLY_AGENT_CLASSIFIER_WORKER_ENABLED=false
export OPSLY_SANDBOX_WORKER_ENABLED=false
export OPSLY_AGENT_FARM_WORKER_ENABLED=false
export OPSLY_APPROVAL_GATE_WORKER_ENABLED=false
export OPSLY_SIGMA_HARNESS_WORKER_ENABLED=false

echo "[mac-e2e] role=$OPSLY_ORCHESTRATOR_ROLE"
echo "[mac-e2e] workers=$OPSLY_WORKER_ALLOWLIST"
echo "[mac-e2e] starting orchestrator on health port ${ORCHESTRATOR_HEALTH_PORT:-3011}"

exec npm run dev --workspace=@intcloudsysops/orchestrator
