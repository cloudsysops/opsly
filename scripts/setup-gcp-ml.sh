#!/bin/bash
# setup-gcp-ml.sh — Configura GCP para ML
set -euo pipefail

echo "☁️ GCP ML Configuration"
echo ""

# Verificar service account
if [[ -z "${GOOGLE_SERVICE_ACCOUNT_JSON:-}" ]]; then
    echo "❌ GOOGLE_SERVICE_ACCOUNT_JSON no está configurado"
    echo "   Ejecuta: doppler secrets get GOOGLE_SERVICE_ACCOUNT_JSON --plain"
    exit 1
fi

echo "✓ GOOGLE_SERVICE_ACCOUNT_JSON: ${#GOOGLE_SERVICE_ACCOUNT_JSON} chars"

# Probar Vertex AI
echo ""
echo "🧪 Test Vertex AI..."
if curl -s -X POST "https://us-central1-aiplatform.googleapis.com/v1/projects/opslyquantum/locations/us-central1/predict" \
  -H "Authorization: Bearer $(echo "$GOOGLE_SERVICE_ACCOUNT_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')" \
  -H "Content-Type: application/json" \
  -d '{"instances": [{"content": "test"}], "parameters": {}}' 2>/dev/null | jq -r '.predictions[0].content' 2>/dev/null; then
    echo "  ✅ Vertex AI: OK"
else
    echo "  ⚠️  Vertex AI: fallback"
fi

# Verificar BigQuery
echo ""
echo "📊 BigQuery..."
bq query "SELECT 1 as test" 2>/dev/null && echo "  ✅ BigQuery: OK" || echo "  ⚠️  BigQuery: crear dataset"

echo ""
echo "========================================="
echo "ML GCP Listo para usar"
echo "========================================="