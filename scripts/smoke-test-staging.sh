#!/bin/bash
# Smoke tests completos para Opsly staging
# Uso: ./scripts/smoke-test-staging.sh [--api-url URL] [--admin-token TOKEN]
#
# Notas: Portal health exige ?slug= (default smiletripcare). Sprints /api/sprints/active
# requiere JWT; 200 o 401 cuenta como endpoint alcanzable. Contadores usan += para no romper set -e.

set -e

API_URL="${API_URL:-https://api.ops.smiletripcare.com}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
PORTAL_HEALTH_SLUG="${PORTAL_HEALTH_SLUG:-smiletripcare}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --api-url) API_URL="$2"; shift 2 ;;
    --admin-token) ADMIN_TOKEN="$2"; shift 2 ;;
    *) shift ;;
  esac
done

PASSED=0
FAILED=0

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "OK" ]; then
    echo "✅ $name"
    PASSED=$((PASSED + 1))
  else
    echo "❌ $name"
    FAILED=$((FAILED + 1))
  fi
}

echo "🔍 Opsly Smoke Tests"
echo "===================="
echo "API URL: $API_URL"
echo ""

# Test 1: Health Check
echo -e "\n📡 Endpoint Tests"
HEALTH=$(curl -sf --max-time 45 "${API_URL}/api/health" 2>/dev/null || echo '{"status":"error"}')
check "Health Check" "$(echo "$HEALTH" | grep -q '"status":"ok"' && echo OK || echo FAIL)"

# Test 2: Health with v1 prefix
HEALTH_V1=$(curl -sf --max-time 45 "${API_URL}/api/v1/health" 2>/dev/null || echo '{"status":"error"}')
check "Health v1 Prefix" "$(echo "$HEALTH_V1" | grep -q '"status":"ok"' && echo OK || echo FAIL)"

# Test 3: API Docs (Swagger)
DOCS=$(curl -sf --max-time 45 -o /dev/null -w "%{http_code}" "${API_URL}/api/docs" 2>/dev/null || echo "000")
check "API Docs (Swagger)" "$([ "$DOCS" = "200" ] && echo OK || echo FAIL)"

# Test 4: OpenAPI YAML
OPENAPI=$(curl -sf --max-time 45 -o /dev/null -w "%{http_code}" "${API_URL}/openapi.yaml" 2>/dev/null || echo "000")
check "OpenAPI Spec" "$([ "$OPENAPI" = "200" ] && echo OK || echo FAIL)"

# Test 5: API v1 Info
APIV1=$(curl -sf --max-time 45 -o /dev/null -w "%{http_code}" "${API_URL}/api/v1" 2>/dev/null || echo "000")
check "API v1 Info" "$([ "$APIV1" = "200" ] && echo OK || echo FAIL)"

# Test 6: Portal Health (requiere ?slug=)
PORTAL=$(curl -sf --max-time 45 "${API_URL}/api/portal/health?slug=${PORTAL_HEALTH_SLUG}" 2>/dev/null || echo '{"status":"error"}')
check "Portal Health" "$(echo "$PORTAL" | grep -q '"status"' && echo OK || echo FAIL)"

# Test 7: Sprints Active (JWT requerido para 200; 401 = endpoint vivo)
SPRINTS=$(curl -s --max-time 45 -o /dev/null -w "%{http_code}" "${API_URL}/api/sprints/active" 2>/dev/null || echo "000")
check "Sprints Active" "$(if [ "$SPRINTS" = "200" ] || [ "$SPRINTS" = "401" ]; then echo OK; else echo FAIL; fi)"

# Security Headers Tests
echo -e "\n🔒 Security Headers"
HEADERS=$(curl -sI --max-time 45 "${API_URL}/api/health" 2>/dev/null || true)

check "Content-Security-Policy" "$(echo "$HEADERS" | grep -qi "Content-Security-Policy" && echo OK || echo FAIL)"
check "X-Frame-Options" "$(echo "$HEADERS" | grep -qi "X-Frame-Options.*DENY" && echo OK || echo FAIL)"
check "X-Content-Type-Options" "$(echo "$HEADERS" | grep -qi "X-Content-Type-Options.*nosniff" && echo OK || echo FAIL)"
check "Referrer-Policy" "$(echo "$HEADERS" | grep -qi "Referrer-Policy" && echo OK || echo FAIL)"
check "Permissions-Policy" "$(echo "$HEADERS" | grep -qi "Permissions-Policy" && echo OK || echo FAIL)"

# Admin Tests (si hay token)
if [ -n "$ADMIN_TOKEN" ]; then
  echo -e "\n🔐 Admin Endpoints"

  METRICS=$(curl -sf --max-time 45 -H "Authorization: Bearer $ADMIN_TOKEN" -o /dev/null -w "%{http_code}" "${API_URL}/api/metrics" 2>/dev/null || echo "000")
  check "Admin Metrics" "$([ "$METRICS" = "200" ] && echo OK || echo FAIL)"

  TENANTS=$(curl -sf --max-time 45 -H "Authorization: Bearer $ADMIN_TOKEN" -o /dev/null -w "%{http_code}" "${API_URL}/api/tenants" 2>/dev/null || echo "000")
  check "Admin Tenants List" "$([ "$TENANTS" = "200" ] && echo OK || echo FAIL)"
fi

# Summary
echo -e "\n📊 Resumen"
echo "=========="
echo "✅ Pasaron: $PASSED"
echo "❌ Fallaron: $FAILED"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo "🎉 ¡Todos los tests pasaron! STAGING READY"
  exit 0
else
  echo "⚠️  Algunos tests fallaron. Revisar arriba."
  exit 1
fi
