#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
node --import tsx <<'NODE'
import { listPatterns } from './lib/pattern-catalog/src/index.ts';
for (const kind of ['harness', 'tenant', 'opsly'] as const) {
  console.log('[' + kind + ']');
  for (const p of listPatterns(kind)) {
    console.log('  -', p.id + ':', p.title);
  }
}
NODE
