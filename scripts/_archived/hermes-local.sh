#!/bin/bash
# scripts/hermes-local.sh - Run Hermes locally
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Starting Hermes locally..."

# Load env from Doppler if available
if command -v doppler &> /dev/null; then
  cd "$PROJECT_ROOT"
  eval "$(doppler secrets get --config=prd --plain --format=json | jq -r 'to_entries[] | "\(.key)=\(.value)"' 2>/dev/null || echo "")"
fi

# Run orchestrator build and tick
cd "$PROJECT_ROOT"
npm run build --workspace=@intcloudsysops/orchestrator
npm run hermes:tick --workspace=@intcloudsysops/orchestrator

echo "Hermes tick complete"
