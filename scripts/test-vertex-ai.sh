#!/usr/bin/env bash
set -euo pipefail

echo "[Vertex AI Test] Starting..."

require_doppler_secret() {
  local name="$1"
  if ! doppler secrets get "$name" --plain >/dev/null 2>&1; then
    echo "❌ Missing Doppler secret: ${name}"
    exit 1
  fi
}

echo "✓ Checking Doppler secrets (project + service account)..."
require_doppler_secret "GCLOUD_PROJECT_ID"
require_doppler_secret "GCLOUD_SERVICE_ACCOUNT_JSON"
echo "✓ GCLOUD_PROJECT_ID / GCLOUD_SERVICE_ACCOUNT_JSON present"

if doppler secrets get GCLOUD_REGION --plain >/dev/null 2>&1; then
  echo "✓ GCLOUD_REGION set"
elif doppler secrets get VERTEX_AI_REGION --plain >/dev/null 2>&1; then
  echo "✓ VERTEX_AI_REGION set (alias)"
else
  echo "⚠️  GCLOUD_REGION / VERTEX_AI_REGION not set; client defaults to us-central1"
fi

echo "✓ Doppler checks OK (no values printed)"

echo ""
echo "Optional: verify pgvector + table on Supabase (requires DB URL / psql)."
echo "  Example: npx supabase db query --linked \"SELECT extname FROM pg_extension WHERE extname = 'vector';\""
echo "  After migrations: \\d platform.approval_gate_embeddings"
echo ""
echo "✅ Vertex AI preflight script finished."
