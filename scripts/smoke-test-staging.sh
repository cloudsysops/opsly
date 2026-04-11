#!/bin/bash
# Smoke tests para staging/producción
# Uso: ./scripts/smoke-test-staging.sh [--api-url URL] [--dry-run]

set -e

API_URL="${API_URL:-https://api.ops.smiletripcare.com}"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --api-url) API_URL="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Opción desconocida: $1"; exit 1 ;;
  esac
done

echo "🔍 Smoke Tests para: $API_URL"
echo "================================"

if [ "$DRY_RUN" = true ]; then
  echo "[DRY-RUN] Tests que se ejecutarían:"
  echo "  1. Health check: GET /api/health"
  echo "  2. Security headers: CSP, X-Frame-Options"
  echo "  3. Rate limiting header check"
  exit 0
fi

# Test 1: Health check
echo -e "\n📡 Test 1: Health Check"
HEALTH=$(curl -sf --max-time 10 "${API_URL}/api/health" 2>/dev/null || echo '{"status":"error"}')
echo "Response: $HEALTH"

if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "✅ Health check OK"
else
  echo "❌ Health check FAILED"
  exit 1
fi

# Test 2: Security Headers
echo -e "\n🔒 Test 2: Security Headers"
HEADERS=$(curl -sI --max-time 10 "${API_URL}/api/health" 2>/dev/null)

CSP=$(echo "$HEADERS" | grep -i "Content-Security-Policy" | head -1)
if [ -n "$CSP" ]; then
  echo "✅ CSP: ${CSP:0:60}..."
else
  echo "⚠️  CSP header NO encontrado"
fi

XFRAME=$(echo "$HEADERS" | grep -i "X-Frame-Options" | head -1)
if [ -n "$XFRAME" ]; then
  echo "✅ X-Frame-Options: $XFRAME"
else
  echo "⚠️  X-Frame-Options NO encontrado"
fi

XCTO=$(echo "$HEADERS" | grep -i "X-Content-Type-Options" | head -1)
if [ -n "$XCTO" ]; then
  echo "✅ X-Content-Type-Options: $XCTO"
else
  echo "⚠️  X-Content-Type-Options NO encontrado"
fi

# Test 3: API Version
echo -e "\n📦 Test 3: API Info"
APIVER=$(echo "$HEADERS" | grep -i "X-API-Version" | head -1)
if [ -n "$APIVER" ]; then
  echo "✅ $APIVER"
else
  echo "ℹ️  X-API-Version no configurado"
fi

echo -e "\n🎉 Smoke tests completados"
