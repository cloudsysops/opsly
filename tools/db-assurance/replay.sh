#!/usr/bin/env bash
# =============================================================================
# Opsly DB Assurance — migration replay harness
# =============================================================================
# Replays Opsly's SQL migration chains into a LOCAL, EPHEMERAL Postgres
# database, on top of a Supabase compatibility shim, and reports which
# migrations apply cleanly from a clean database.
#
# Opsly has TWO migration chains:
#   supabase/  -> supabase/migrations/*.sql        (Supabase CLI managed)
#   peskids/   -> apps/peskids/migrations/*.sql    (applied out-of-band)
# `--chain combined` replays peskids-before-supabase, which is the only order
# in which the supabase chain's Peskids-dependent migrations can resolve.
#
# SAFETY INVARIANT: this script only ever talks to a loopback database and
# hard-refuses to run in a production-looking environment. See guard_local_only.
#
# Usage:
#   tools/db-assurance/replay.sh [--chain supabase|peskids|combined]
#                                [--db NAME] [--quiet] [--twice]
#
# Exit codes: 0 = chain replayed clean, 1 = one or more migrations failed,
#             2 = bad usage, 3 = safety guard tripped.
# =============================================================================
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGHOST="${DBA_PGHOST:-127.0.0.1}"
PGPORT="${DBA_PGPORT:-55432}"
PGUSER="${DBA_PGUSER:-postgres}"
DB_NAME="opsly_replay"
CHAIN="supabase"
QUIET=0
TWICE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --chain) CHAIN="$2"; shift 2 ;;
    --db)    DB_NAME="$2"; shift 2 ;;
    --quiet) QUIET=1; shift ;;
    --twice) TWICE=1; shift ;;
    *)       echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

# -----------------------------------------------------------------------------
# Safety guard: local-only, never production.
# -----------------------------------------------------------------------------
guard_local_only() {
  local env_name="${ENVIRONMENT:-${NODE_ENV:-${APP_ENV:-local}}}"
  case "$(printf '%s' "$env_name" | tr 'A-Z' 'a-z')" in
    prod|production|prd|live)
      echo "REFUSING: replay.sh must never run with ENVIRONMENT/NODE_ENV=production." >&2
      exit 3
      ;;
  esac
  case "$PGHOST" in
    127.0.0.1|localhost|::1|/var/run/postgresql) ;;
    *)
      echo "REFUSING: replay.sh only targets loopback. Got host='$PGHOST'." >&2
      exit 3
      ;;
  esac
  if [[ -n "${DATABASE_URL:-}" && "$DATABASE_URL" == *"supabase.co"* ]]; then
    echo "REFUSING: DATABASE_URL points at a hosted Supabase project." >&2
    exit 3
  fi
}
guard_local_only

psql_q() { psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -v ON_ERROR_STOP=1 "$@"; }

# Ordered file list for a chain.
chain_files() {
  case "$1" in
    supabase) ls "$REPO_ROOT"/supabase/migrations/*.sql | sort ;;
    peskids)  ls "$REPO_ROOT"/apps/peskids/migrations/*.sql | sort ;;
    combined|resolve)
              ls "$REPO_ROOT"/apps/peskids/migrations/*.sql | sort
              ls "$REPO_ROOT"/supabase/migrations/*.sql | sort ;;
    *) echo "unknown chain: $1" >&2; exit 2 ;;
  esac
}

# -----------------------------------------------------------------------------
# `resolve` mode: repeatedly sweep the union of both chains, retrying whatever
# failed, until a whole sweep makes no further progress (a fixpoint). Anything
# still failing at the fixpoint cannot be explained by migration ORDER — it is
# a genuine, order-independent defect in the SQL. This is what separates
# "the two chains are interleaved wrong" from "this migration is broken".
# -----------------------------------------------------------------------------
resolve_mode() {
  local -a pending=()
  while IFS= read -r f; do pending+=("$f"); done < <(chain_files resolve)
  local pass=0
  while :; do
    pass=$((pass + 1))
    local -a still=()
    local progressed=0
    for f in "${pending[@]}"; do
      local name; name="$(basename "$f")"
      local out; out="$(psql_q -d "$DB_NAME" -q -f "$f" 2>&1)"
      if [[ $? -eq 0 ]]; then
        progressed=1
        [[ $QUIET -eq 0 ]] && echo "ok(p$pass)  $name"
      else
        still+=("$f")
        LAST_ERR["$name"]="$(echo "$out" | grep -m1 'ERROR')"
      fi
    done
    pending=("${still[@]:-}")
    [[ ${#still[@]} -eq 0 ]] && break
    [[ $progressed -eq 0 ]] && break
  done
  echo
  echo "==> Fixpoint reached after $pass sweep(s). Order-independent failures: ${#pending[@]}"
  for f in "${pending[@]:-}"; do
    [[ -z "$f" ]] && continue
    local name; name="$(basename "$f")"
    echo "  BROKEN  $name"
    echo "          ${LAST_ERR[$name]}"
  done
  [[ ${#pending[@]} -gt 0 && -n "${pending[0]:-}" ]] && return 1
  return 0
}
declare -A LAST_ERR

FAILED=0; APPLIED=0; FAIL_LIST=()

apply_pass() {
  local label="$1"
  echo "==> Pass: $label"
  while IFS= read -r f; do
    local name; name="$(basename "$f")"
    local out; out="$(psql_q -d "$DB_NAME" -q -f "$f" 2>&1)"; local rc=$?
    if [[ $rc -ne 0 ]]; then
      FAILED=$((FAILED + 1)); FAIL_LIST+=("$name")
      echo "FAIL  $name"
      echo "$out" | grep -E 'ERROR' | head -2 | sed 's/^/      /'
    else
      APPLIED=$((APPLIED + 1))
      [[ $QUIET -eq 0 ]] && echo "ok    $name"
    fi
  done < <(chain_files "$CHAIN")
}

echo "==> Recreating ephemeral database '$DB_NAME' on $PGHOST:$PGPORT (chain=$CHAIN)"
psql_q -d postgres -q -c "DROP DATABASE IF EXISTS $DB_NAME WITH (FORCE);" >/dev/null
psql_q -d postgres -q -c "CREATE DATABASE $DB_NAME;" >/dev/null

echo "==> Applying Supabase compatibility shim"
psql_q -d "$DB_NAME" -q -f "$REPO_ROOT/tools/db-assurance/sql/00-supabase-shim.sql" >/dev/null || {
  echo "FATAL: shim failed to apply" >&2; exit 1; }

if [[ "$CHAIN" == "resolve" ]]; then
  resolve_mode
  exit $?
fi

apply_pass "1 (clean database)"

if [[ $TWICE -eq 1 ]]; then
  # Idempotency check: re-applying the whole chain over an already-migrated
  # database must not error. Any failure here is a non-re-runnable migration.
  FIRST_FAILED=$FAILED; FAILED=0; APPLIED=0; FAIL_LIST=()
  echo
  apply_pass "2 (re-apply over migrated database — idempotency check)"
  echo
  echo "==> Idempotency summary: $APPLIED re-applied clean, $FAILED failed on second pass"
  [[ $FAILED -gt 0 ]] && printf '    non-idempotent: %s\n' "${FAIL_LIST[@]}"
  [[ $FIRST_FAILED -gt 0 || $FAILED -gt 0 ]] && exit 1
  exit 0
fi

echo
echo "==> Replay summary (chain=$CHAIN): $APPLIED applied, $FAILED failed"
if [[ $FAILED -gt 0 ]]; then
  printf '    failed: %s\n' "${FAIL_LIST[@]}"
  exit 1
fi
exit 0
