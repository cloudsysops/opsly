#!/usr/bin/env bash
# Elimina schema sandbox (destructivo). Uso: ./scripts/agent-training/rollback-sandbox.sh --confirm
set -euo pipefail

if [[ "${1:-}" != "--confirm" ]]; then
  echo "Refusing to drop schema without --confirm"
  echo "Usage: $0 --confirm"
  exit 1
fi

db_url="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [[ -z "${db_url}" ]]; then
  echo "Set DATABASE_URL or SUPABASE_DB_URL"
  exit 1
fi

psql "$db_url" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS sandbox CASCADE;"
echo "✅ Dropped schema sandbox"
