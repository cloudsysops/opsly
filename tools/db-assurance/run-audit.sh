#!/usr/bin/env bash
# =============================================================================
# Opsly DB Assurance — one-shot audit
# =============================================================================
# Boots an ephemeral local Postgres (if one is not already listening), replays
# both migration chains to a fixpoint, dumps the resulting schema, and
# regenerates docs/database/{EXPECTED-SCHEMA,RLS-MATRIX,SCHEMA-FINDINGS}.md.
#
# LOCAL ONLY. Never point this at a hosted database — replay.sh enforces that.
#
# Usage: tools/db-assurance/run-audit.sh
# Requires: postgresql-16 + postgresql-16-pgvector, node >= 20.
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGPORT="${DBA_PGPORT:-55432}"
OUT_DIR="$REPO_ROOT/docs/database"
WORK="${DBA_WORK:-${TMPDIR:-/tmp}/opsly-db-assurance}"
mkdir -p "$WORK"

if ! pg_isready -h 127.0.0.1 -p "$PGPORT" -q; then
  echo "==> No Postgres on 127.0.0.1:$PGPORT — start one first, e.g.:"
  echo "    tools/db-assurance/start-local-pg.sh"
  exit 1
fi

echo "==> Replaying migration chains to a fixpoint"
"$REPO_ROOT/tools/db-assurance/replay.sh" --chain resolve --quiet || true

echo "==> Dumping resulting schema"
psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d opsly_replay -q -t -A \
  -v ON_ERROR_STOP=1 -f "$REPO_ROOT/tools/db-assurance/sql/10-inventory.sql" \
  2>/dev/null | grep -v '^Output' > "$WORK/inventory.json"

echo "==> Rendering docs into $OUT_DIR"
node "$REPO_ROOT/tools/db-assurance/analyze.mjs" "$WORK/inventory.json" "$OUT_DIR"
