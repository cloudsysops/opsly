#!/usr/bin/env bash
# Verifica schema sandbox en Postgres y artefactos del clasificador (sin secretos en logs).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "🔍 Verifying agent training sandbox..."

db_url="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [[ -z "${db_url}" ]]; then
  echo "❌ Set DATABASE_URL or SUPABASE_DB_URL (Postgres connection string)."
  exit 1
fi

if ! psql "$db_url" -v ON_ERROR_STOP=1 -c "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'sandbox';" | grep -q '1'; then
  echo "❌ Schema 'sandbox' not found. Apply migration: npx supabase db push"
  exit 1
fi
echo "✅ Schema 'sandbox' exists"

if ! psql "$db_url" -v ON_ERROR_STOP=1 -c "\dt sandbox.*" | grep -q 'agent_'; then
  echo "❌ Expected sandbox.agent_* tables missing"
  exit 1
fi
echo "✅ sandbox tables present"

CLASSIFIER="$ROOT/apps/ml/agents/classifier"
if [[ -f "$CLASSIFIER/models/model.pkl" ]]; then
  echo "✅ model.pkl present"
else
  echo "⚠️  model.pkl not found — run: cd apps/ml/agents/classifier && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && python3 train.py"
fi

if [[ -f "$CLASSIFIER/models/metrics.json" ]]; then
  if command -v jq >/dev/null 2>&1; then
    acc="$(jq -r '.accuracy // empty' "$CLASSIFIER/models/metrics.json")"
    echo "✅ metrics.json accuracy=${acc}"
  else
    echo "✅ metrics.json present (install jq to print accuracy)"
  fi
else
  echo "⚠️  metrics.json missing (train first)"
fi

echo ""
echo "✅ verify-sandbox checks completed"
