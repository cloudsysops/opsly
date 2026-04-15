#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=false
TENANT_SLUG="${TENANT_SLUG:-smiletripcare}"
GOAL="${GOAL:-Mantener superagentes activos y eficientes}"
PLAN="${PLAN:-business}"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *)
      echo "Unknown flag: $arg" >&2
      echo "Usage: $0 [--dry-run]" >&2
      exit 1
      ;;
  esac
done

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

log() { echo "[superagents:up] $*"; }

main() {
  chmod +x scripts/start-agents-autopilot.sh scripts/status-agents-autopilot.sh

  log "Arrancando autopilot de agentes (Hermes/Ollama squad)."
  run TENANT_SLUG="$TENANT_SLUG" \
    GOAL="$GOAL" \
    PLAN="$PLAN" \
    PROFILE=production \
    INTERVAL_SECONDS=300 \
    ITERATIONS=0 \
    ENABLE_HERMES_TICK=true \
    ENABLE_WORKER_SMOKE=true \
    USE_DOPPLER=true \
    ./scripts/start-agents-autopilot.sh

  run ./scripts/status-agents-autopilot.sh

  log "Tip: para MCP stdio usa: MCP_TRANSPORT=stdio npm run start --workspace=@intcloudsysops/mcp"
}

main "$@"
