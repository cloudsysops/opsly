#!/usr/bin/env bash
# Run scope smoke + provision execute for Peskids (GHL).
# ICSO agency GHL cut over to Twenty — do not reprovision intcloudsysops here.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== ghl-reprovision-all: Peskids ==="
./scripts/ghl-scope-smoke.sh --tenant peskids
./scripts/ghl-provision-peskids.sh --execute

echo ""
echo "ghl-reprovision-all: complete (ICSO agency GHL retired — Twenty CRM)"
