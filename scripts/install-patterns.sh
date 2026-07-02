#!/usr/bin/env bash
# Validate Opsly pattern catalog and optionally install upstream Sigma rules.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WITH_SIGMA=false
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/install-patterns.sh [--with-sigma] [--dry-run]

Validates config/patterns/index.json and all referenced pattern files.
With --with-sigma, also runs scripts/install-sigma-rules.sh for harness context.

Env:
  OPSLY_ROOT  Override repo root (default: parent of scripts/)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-sigma)
      WITH_SIGMA=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

cd "$REPO_ROOT"

echo "==> Validating pattern catalog"
node --import tsx <<'NODE'
import { validatePatternIndex, listPatterns } from './lib/pattern-catalog/src/index.ts';

const errors = validatePatternIndex();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const counts = { harness: 0, tenant: 0, opsly: 0 };
for (const kind of ['harness', 'tenant', 'opsly'] as const) {
  counts[kind] = listPatterns(kind).length;
}
console.log('Pattern catalog OK:', JSON.stringify(counts));
NODE

if [[ "$WITH_SIGMA" == true ]]; then
  echo "==> Installing Sigma rules (upstream context for harness)"
  if [[ "$DRY_RUN" == true ]]; then
    bash "$REPO_ROOT/scripts/install-sigma-rules.sh" --dry-run
  else
    bash "$REPO_ROOT/scripts/install-sigma-rules.sh"
  fi
fi

echo "Done. List patterns: npm run patterns:list"
