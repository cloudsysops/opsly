#!/usr/bin/env bash
# Dry-run validation for local-first runtime (Week 2 expands checks).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[validate-local-runtime] Running environment detector..."
profile_json="$(npm run runtime:detect --silent 2>/dev/null || npm run detect --workspace=@intcloudsysops/runtime --silent)"

if ! command -v node >/dev/null 2>&1; then
  echo "node is required" >&2
  exit 1
fi

node -e "
const p = JSON.parse(process.argv[1]);
const errs = [];
if (p.system.ramGb < 4) errs.push('RAM < 4GB');
if (p.system.diskFreeGb < 10) errs.push('disk < 10GB free');
if (!p.system.dockerAvailable && !p.system.colimaAvailable && !p.system.podmanAvailable) {
  errs.push('no container engine');
}
if (errs.length) {
  console.error('[validate-local-runtime] FAILED:', errs.join('; '));
  process.exit(1);
}
console.log('[validate-local-runtime] OK —', p.system.os, p.system.cpuCores + ' cores', p.system.ramGb + 'GB RAM');
" "$profile_json"
