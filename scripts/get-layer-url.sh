#!/usr/bin/env bash
# get-layer-url.sh - Get API URL for a specific layer
# Usage: ./scripts/get-layer-url.sh [sandbox|qa|prod]

set -euo pipefail

LAYER="${1:-qa}"

case "$LAYER" in
  sandbox)
    echo "https://api-sandbox.ops.smiletripcare.com"
    ;;
  qa)
    echo "https://api-qa.ops.smiletripcare.com"
    ;;
  prod|production)
    echo "https://api.ops.smiletripcare.com"
    ;;
  local|development)
    echo "http://localhost:3000"
    ;;
  *)
    echo "Unknown layer: $LAYER" >&2
    echo "Valid layers: sandbox, qa, prod, local" >&2
    exit 1
    ;;
esac