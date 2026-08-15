#!/usr/bin/env bash
# Worker BullMQ en esta Mac: solo cola local-agents → Cursor/OpenCode en localhost.
# No arranca workers de prod (n8n, drive, etc.). Pensado para launchd + doppler run.
#
# Usage:
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/ops/start-mac-local-agents-worker.sh
#   ./scripts/ops/start-mac-local-agents-worker.sh --dry-run
#
set -euo pipefail

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT"

export OPSLY_ORCHESTRATOR_MODE="${OPSLY_ORCHESTRATOR_MODE:-worker-enabled}"
export OPSLY_ORCHESTRATOR_ROLE="${OPSLY_ORCHESTRATOR_ROLE:-worker}"
export OPSLY_WORKER_ALLOWLIST="${OPSLY_WORKER_ALLOWLIST:-local-agents}"
export OPSLY_LOCAL_AGENT_UNIFIED_ONLY="${OPSLY_LOCAL_AGENT_UNIFIED_ONLY:-true}"
export OPSLY_CURSOR_AGENT_URL="http://127.0.0.1:5001"
export OPSLY_OPENCODE_AGENT_URL="${OPSLY_OPENCODE_AGENT_URL:-http://127.0.0.1:5004}"
export WORKER_ID="${WORKER_ID:-mac-local-agents-01}"
# El VPS ya publica :3011; este proceso solo consume cola.
export ORCHESTRATOR_HEALTH_PORT="${ORCHESTRATOR_HEALTH_PORT:-3018}"

# Doppler prd usa hostname Docker `redis`. En Mac hay que ir al bind Tailscale.
redis_host="${OPSLY_REDIS_HOST:-100.120.151.91}"
if [[ "${REDIS_URL:-}" == *@redis:* || "${REDIS_URL:-}" == *@redis/* ]]; then
  REDIS_URL="${REDIS_URL/@redis/@${redis_host}}"
  export REDIS_URL
  echo "[mac-local-agents] REDIS_URL host → ${redis_host} (Doppler trae hostname docker)"
fi
export REDIS_HOST="${REDIS_HOST:-$redis_host}"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] MODE=$OPSLY_ORCHESTRATOR_MODE ALLOWLIST=$OPSLY_WORKER_ALLOWLIST"
  echo "[dry-run] CURSOR=$OPSLY_CURSOR_AGENT_URL OPENCODE=$OPSLY_OPENCODE_AGENT_URL"
  echo "[dry-run] REDIS_URL set=$([[ -n ${REDIS_URL:-} ]] && echo yes || echo no) host=${redis_host}"
  echo "[dry-run] HEALTH_PORT=$ORCHESTRATOR_HEALTH_PORT"
  echo "[dry-run] would build @intcloudsysops/orchestrator then npm run start"
  exit 0
fi

if [[ -z "${REDIS_URL:-}" ]]; then
  echo "[mac-local-agents] ERROR: REDIS_URL not set — run via doppler run" >&2
  exit 1
fi

if ! curl -sf --max-time 2 http://127.0.0.1:5001/health >/dev/null; then
  echo "[mac-local-agents] aviso: Cursor bridge :5001 no responde — los jobs cursor fallarán hasta que launchd lo levante" >&2
fi

# Rebuild so OPSLY_WORKER_ALLOWLIST from this branch is in dist (never start stale prod workers).
if [[ "${SKIP_ORCHESTRATOR_BUILD:-}" != "true" ]]; then
  npm run build --workspace=@intcloudsysops/orchestrator
fi
exec npm run start --workspace=@intcloudsysops/orchestrator
