#!/usr/bin/env bash
# Smoke test for @intcloudsysops/sigma-harness (rule index + optional vendor tree).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QUERY="${SIGMA_SMOKE_QUERY:-powershell}"
LIMIT="${SIGMA_SMOKE_LIMIT:-5}"
DRY_RUN=false
SKIP_INSTALL=false

usage() {
  cat <<'EOF'
Usage: ./scripts/sigma-harness-smoke.sh [--dry-run] [--skip-install] [--query TERM]

Runs sigma-harness unit tests and searches rules (vendor/sigma if present, else fixtures only in tests).
Install vendor rules first: npm run sigma:install
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-install)
      SKIP_INSTALL=true
      shift
      ;;
    --query)
      QUERY="${2:?missing value for --query}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] npm test --workspace=@intcloudsysops/sigma-harness"
  echo "[dry-run] node searchRules query=$QUERY limit=$LIMIT"
  exit 0
fi

cd "$REPO_ROOT"

if [[ "$SKIP_INSTALL" != true ]] && [[ ! -d vendor/sigma/rules ]]; then
  echo "vendor/sigma missing — run: npm run sigma:install (or pass --skip-install for tests-only)"
fi

npm run test --workspace=@intcloudsysops/sigma-harness

node --import tsx <<NODE
import { searchRules, loadRuleIndex } from './lib/sigma-harness/src/index.ts';

const index = loadRuleIndex();
if (index.length === 0) {
  console.error('sigma-harness-smoke: rule index empty (install vendor/sigma?)');
  process.exit(1);
}

const hits = searchRules(process.env.SIGMA_SMOKE_QUERY ?? '${QUERY}', Number(process.env.SIGMA_SMOKE_LIMIT ?? '${LIMIT}'));
if (hits.length === 0) {
  console.error('sigma-harness-smoke: search returned 0 hits for query=${QUERY}');
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  indexSize: index.length,
  query: '${QUERY}',
  hits: hits.map((r) => ({ id: r.id, title: r.title, level: r.level })),
}, null, 2));
NODE

echo "sigma-harness-smoke: OK"
