#!/usr/bin/env bash
# Run scope smoke + provision execute for Peskids and Intcloudsysops (agency).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== ghl-reprovision-all: Peskids ==="
./scripts/ghl-scope-smoke.sh --tenant peskids
./scripts/ghl-provision-peskids.sh --execute

echo ""
echo "=== ghl-reprovision-all: Intcloudsysops ==="
if ! ./scripts/ghl-scope-smoke.sh --tenant intcloudsysops; then
  echo "ghl-reprovision-all: skipping agency execute until Doppler token has tag/customField scopes" >&2
  exit 1
fi
./scripts/ghl-provision-intcloudsysops.sh --execute

echo ""
echo "ghl-reprovision-all: complete"
