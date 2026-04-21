#!/usr/bin/env bash
# run-layer-tests.sh - Run tests for specific layer
# Usage: ./scripts/run-layer-tests.sh [sandbox|qa|prod|all] [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

LAYER="${1:-qa}"
DRY_RUN="${2:-}"

run_cmd() {
  local cmd="$1"
  if [ "$DRY_RUN" = "--dry-run" ]; then
    echo "[DRY-RUN] $cmd"
    return 0
  fi
  eval "$cmd"
}

run_workspace_tests() {
  local workspace="$1"
  echo "Running tests for workspace: $workspace"
  run_cmd "npm run test --workspace=$workspace"
}

run_layer_suite() {
  local layer_name="$1"
  case "$layer_name" in
    sandbox)
      run_workspace_tests "@intcloudsysops/mcp"
      run_workspace_tests "@intcloudsysops/context-builder"
      ;;
    qa)
      run_workspace_tests "@intcloudsysops/llm-gateway"
      run_workspace_tests "@intcloudsysops/orchestrator"
      ;;
    prod)
      run_workspace_tests "@intcloudsysops/api"
      run_workspace_tests "@intcloudsysops/admin"
      run_workspace_tests "@intcloudsysops/portal"
      ;;
    *)
      echo "Unknown layer: $layer_name" >&2
      echo "Valid layers: sandbox, qa, prod, all" >&2
      exit 1
      ;;
  esac
}

echo "┌─────────────────────────────────────────────"
echo "│  Running layer tests: $LAYER"
echo "└─────────────────────────────────────────────"

if [ "$LAYER" = "all" ]; then
  run_layer_suite "sandbox"
  run_layer_suite "qa"
  run_layer_suite "prod"
else
  run_layer_suite "$LAYER"
fi

echo ""
echo "✅ Layer tests completed: $LAYER"
