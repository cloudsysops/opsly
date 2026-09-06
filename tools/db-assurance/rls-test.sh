#!/usr/bin/env bash
# =============================================================================
# Opsly DB Assurance — negative RLS test runner
# =============================================================================
# Replays the migration chains into an ephemeral local database, seeds two
# tenants, then runs every case in tests/02-rls-negative.sql as an unprivileged
# Supabase role (`anon` / `authenticated`) — never as `service_role`.
#
# Exit codes:
#   0  every case behaved as expected (KNOWN-BAD cases still reported)
#   1  at least one FAIL, ERROR, or UNEXPECTED-PASS
#   3  safety guard tripped
#
# Usage: tools/db-assurance/rls-test.sh [--strict]
#   --strict also fails the run on KNOWN-BAD cases. Use it once the underlying
#            policy defects are fixed, so they cannot silently return.
# =============================================================================
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGPORT="${DBA_PGPORT:-55432}"
DB="opsly_rls_test"
STRICT=0
[[ "${1:-}" == "--strict" ]] && STRICT=1

env_name="$(printf '%s' "${ENVIRONMENT:-${NODE_ENV:-local}}" | tr 'A-Z' 'a-z')"
case "$env_name" in
  prod|production|prd|live)
    echo "REFUSING: rls-test.sh must never run against a production environment." >&2
    exit 3 ;;
esac

if ! pg_isready -h 127.0.0.1 -p "$PGPORT" -q; then
  echo "No local Postgres on 127.0.0.1:$PGPORT. Run tools/db-assurance/start-local-pg.sh" >&2
  exit 1
fi

P() { psql -h 127.0.0.1 -p "$PGPORT" -U postgres "$@"; }

echo "==> Replaying migrations into $DB"
"$REPO_ROOT/tools/db-assurance/replay.sh" --chain resolve --db "$DB" --quiet >/dev/null 2>&1 || true

echo "==> Seeding fixtures"
P -d "$DB" -q -v ON_ERROR_STOP=1 -f "$REPO_ROOT/tools/db-assurance/tests/01-fixtures.sql" >/dev/null || {
  echo "FATAL: fixtures failed" >&2; exit 1; }

echo "==> Running negative RLS cases"
P -d "$DB" -q -v ON_ERROR_STOP=1 -f "$REPO_ROOT/tools/db-assurance/tests/02-rls-negative.sql" >/dev/null || {
  echo "FATAL: test suite failed to execute" >&2; exit 1; }

echo "==> Running schema integrity cases"
P -d "$DB" -q -v ON_ERROR_STOP=1 -f "$REPO_ROOT/tools/db-assurance/tests/03-integrity.sql" >/dev/null || {
  echo "FATAL: integrity suite failed to execute" >&2; exit 1; }

echo
P -d "$DB" -P pager=off -c \
  "SELECT status, name, persona, expected AS exp, actual AS act
     FROM dba_test.results
    ORDER BY CASE status WHEN 'FAIL' THEN 0 WHEN 'UNEXPECTED-PASS' THEN 1
                         WHEN 'KNOWN-BAD' THEN 2 ELSE 3 END, name"

read -r pass known bad < <(P -d "$DB" -tAc \
  "SELECT count(*) FILTER (WHERE status='PASS'),
          count(*) FILTER (WHERE status='KNOWN-BAD'),
          count(*) FILTER (WHERE status NOT IN ('PASS','KNOWN-BAD'))
     FROM dba_test.results" | tr '|' ' ')

echo
echo "==> RLS results: $pass pass, $known known-bad (documented defects), $bad failing"

if [[ "$known" -gt 0 ]]; then
  echo
  echo "Known defects still present:"
  P -d "$DB" -tAc "SELECT '  - '||name||': '||rationale FROM dba_test.results WHERE status='KNOWN-BAD'"
fi

[[ "$bad" -gt 0 ]] && exit 1
[[ $STRICT -eq 1 && "$known" -gt 0 ]] && exit 1
exit 0
