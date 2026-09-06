#!/usr/bin/env bash
# =============================================================================
# Opsly DB Assurance — start an ephemeral local Postgres for replay/RLS tests.
# =============================================================================
# Creates a throwaway cluster (trust auth, loopback only, non-default port) that
# holds NO real data. Destroy it with `--stop`. This exists so the DB assurance
# harness can run in CI or a sandbox without Docker.
#
# Requires: postgresql-16 and postgresql-16-pgvector
#   Debian/Ubuntu: apt-get install -y postgresql-16 postgresql-16-pgvector
#
# Usage: tools/db-assurance/start-local-pg.sh [--stop]
# =============================================================================
set -euo pipefail

PGPORT="${DBA_PGPORT:-55432}"
PGBIN="${DBA_PGBIN:-/usr/lib/postgresql/16/bin}"
BASE="${DBA_PGBASE:-/var/lib/postgresql/dbassurance}"
PGDATA="$BASE/pgdata"
export PATH="$PGBIN:$PATH"

# Run the server as an unprivileged user; Postgres refuses to start as root.
RUNAS="${DBA_PGUSER_OS:-postgres}"
as_pg() {
  if [[ "$(id -un)" == "$RUNAS" ]]; then env PATH="$PATH" "$@";
  else runuser -u "$RUNAS" -- env PATH="$PATH" "$@"; fi
}

if [[ "${1:-}" == "--stop" ]]; then
  as_pg pg_ctl -D "$PGDATA" -m immediate stop || true
  rm -rf "$BASE"
  echo "stopped and removed $BASE"
  exit 0
fi

if pg_isready -h 127.0.0.1 -p "$PGPORT" -q; then
  echo "Postgres already listening on 127.0.0.1:$PGPORT"
  exit 0
fi

rm -rf "$BASE"
mkdir -p "$BASE"
chown "$RUNAS":"$RUNAS" "$BASE"

as_pg initdb -D "$PGDATA" -U postgres --auth=trust -E UTF8 > "$BASE/initdb.log" 2>&1
as_pg pg_ctl -D "$PGDATA" \
  -o "-p $PGPORT -c listen_addresses=127.0.0.1" \
  -l "$BASE/pg.log" -w start

psql -h 127.0.0.1 -p "$PGPORT" -U postgres -tAc 'select version()'
