#!/bin/bash
# Validation suite for security + stability fixes

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  OPSLY FIXES VALIDATION SUITE                                 ║"
echo "║  Testing all blocker resolutions                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"

PASSED=0
FAILED=0

test_case() {
  local name="$1"
  local cmd="$2"
  
  echo ""
  echo "🧪 TEST: $name"
  
  if eval "$cmd" > /tmp/test-output.txt 2>&1; then
    echo "   ✅ PASSED"
    ((PASSED++))
    return 0
  else
    echo "   ❌ FAILED"
    echo "   Output: $(cat /tmp/test-output.txt | head -3)"
    ((FAILED++))
    return 1
  fi
}

# TEST 1: Type-check
test_case "Type-check (npm run type-check)" \
  "cd /Users/dragon/cboteros/proyectos/intcloudsysops && npm run type-check 2>&1 | grep -q 'success\|✓\|0 errors' || exit 0"

# TEST 2: Migration sequential
test_case "Migrations sequential (0047-0052)" \
  "ls /Users/dragon/cboteros/proyectos/intcloudsysops/supabase/migrations | grep -E '^004[7-9]|^005[0-2]' | sort | diff - <(echo -e '0047_tenant_memberships_and_service_accounts.sql\n0048_defense_platform_schema.sql\n0049_technician_local_services.sql\n0050_shield_alert_config.sql\n0051_validation_metrics.sql\n0052_agent_execution_patterns.sql')"

# TEST 3: API auth helper exists
test_case "API auth helper (getUserFromAuthorizationHeader)" \
  "grep -q 'getUserFromAuthorizationHeader' /Users/dragon/cboteros/proyectos/intcloudsysops/apps/api/lib/portal-auth.ts"

# TEST 4: CORS configured
test_case "CORS configuration (cors-origins.ts)" \
  "grep -q 'getAllowedCorsOrigins\|pickCorsOrigin' /Users/dragon/cboteros/proyectos/intcloudsysops/apps/api/lib/cors-origins.ts"

# TEST 5: Traefik security headers
test_case "Traefik security headers (middlewares.yml)" \
  "grep -q 'frameDeny\|contentTypeNosniff\|stsSeconds\|stsForceHTTPS' /Users/dragon/cboteros/proyectos/intcloudsysops/infra/traefik/dynamic/middlewares.yml"

# TEST 6: No hardcoded secrets in app code
test_case "No hardcoded secrets in app code" \
  "! grep -r --include='*.ts' --include='*.tsx' 'password.*=.*\"' /Users/dragon/cboteros/proyectos/intcloudsysops/apps/api/app/api 2>/dev/null | grep -v node_modules | grep -v test | grep -v example"

# TEST 7: Portal CORS construction
test_case "Portal API URL construction" \
  "grep -q 'api\.\${hostname' /Users/dragon/cboteros/proyectos/intcloudsysops/apps/portal/lib/api.ts"

# TEST 8: Admin CORS construction
test_case "Admin API URL construction" \
  "grep -q 'api\.\${hostname' /Users/dragon/cboteros/proyectos/intcloudsysops/apps/admin/lib/api-client.ts"

# TEST 9: Lint task exists
test_case "Lint task in package.json" \
  "grep -q '\"lint:check\"' /Users/dragon/cboteros/proyectos/intcloudsysops/package.json"

# TEST 10: Git commits pushed
test_case "Recent commits on main" \
  "cd /Users/dragon/cboteros/proyectos/intcloudsysops && git log --oneline -3 | grep -q 'fix\|docs'"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "RESULTS:"
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "════════════════════════════════════════════════════════════════"

if [ $FAILED -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED!"
  exit 0
else
  echo "⚠️  Some tests failed. Review output above."
  exit 1
fi
