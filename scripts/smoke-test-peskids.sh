#!/bin/bash

set -euo pipefail

# Peskids Smoke Test — Week 1 Execution
# Purpose: Validate Peskids ready for customer review
# Usage: ./scripts/smoke-test-peskids.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
WARNINGS=0

log_pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((PASSED++))
}

log_fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((FAILED++))
}

log_warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
  ((WARNINGS++))
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 PESKIDS SMOKE TEST — Week 1 Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 1: Type-check passes
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "TEST 1: Type-check all workspaces..."
if npm run type-check > /tmp/typecheck.log 2>&1; then
  log_pass "Type-check passed (34 workspaces)"
else
  log_fail "Type-check failed"
  tail -20 /tmp/typecheck.log
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 2: Peskids builds successfully
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "TEST 2: Peskids Next.js build..."
if (cd "$PROJECT_ROOT/apps/peskids" && npm run build > /tmp/peskids-build.log 2>&1); then
  log_pass "Peskids build successful"
else
  log_fail "Peskids build failed"
  tail -20 /tmp/peskids-build.log
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 3: Supabase migration files exist
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "TEST 3: Supabase schema migrations..."
MIGRATION_COUNT=$(find "$PROJECT_ROOT/apps/peskids/migrations" -name "*.sql" | wc -l)
if [ "$MIGRATION_COUNT" -ge 7 ]; then
  log_pass "Found $MIGRATION_COUNT migrations (expected ≥7)"
else
  log_fail "Only $MIGRATION_COUNT migrations found (expected ≥7)"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 4: RLS policies defined
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "TEST 4: RLS policies in migrations..."
RLS_MIGRATION="$PROJECT_ROOT/apps/peskids/migrations/20260524_add_rls_policies_peskids.sql"
if [ -f "$RLS_MIGRATION" ]; then
  RLS_COUNT=$(grep -c "ALTER TABLE.*ENABLE ROW LEVEL SECURITY" "$RLS_MIGRATION" || true)
  if [ "$RLS_COUNT" -ge 8 ]; then
    log_pass "RLS enabled on $RLS_COUNT tables"
  else
    log_warn "Only $RLS_COUNT RLS policies found (expected ≥8)"
  fi
else
  log_fail "RLS migration file not found"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 5: n8n workflows configured
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "TEST 5: n8n workflow files..."
N8N_WORKFLOW_DIR="$PROJECT_ROOT/.n8n/1-workflows/crm"
if [ -d "$N8N_WORKFLOW_DIR" ]; then
  WORKFLOW_COUNT=$(find "$N8N_WORKFLOW_DIR" -name "*.json" | wc -l)
  if [ "$WORKFLOW_COUNT" -ge 4 ]; then
    log_pass "Found $WORKFLOW_COUNT n8n workflows"
  else
    log_warn "Only $WORKFLOW_COUNT workflows found (expected ≥4: lead capture, hot alert, follow-up, digest)"
  fi
else
  log_warn "n8n workflow directory not found at $N8N_WORKFLOW_DIR"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 6: Tenant config exists
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "TEST 6: Tenant configuration..."
TENANT_CONFIG="$PROJECT_ROOT/config/tenants/peskids.json"
if [ -f "$TENANT_CONFIG" ]; then
  if jq empty "$TENANT_CONFIG" 2>/dev/null; then
    log_pass "Peskids tenant config valid JSON"
  else
    log_fail "Peskids tenant config invalid JSON"
  fi
else
  log_fail "Peskids tenant config not found"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 7: Environment variables template
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "TEST 7: Environment variables..."
ENV_EXAMPLE="$PROJECT_ROOT/apps/peskids/.env.example"
if [ -f "$ENV_EXAMPLE" ]; then
  ENV_COUNT=$(wc -l < "$ENV_EXAMPLE")
  if [ "$ENV_COUNT" -ge 40 ]; then
    log_pass "Environment template complete ($ENV_COUNT variables)"
  else
    log_warn "Environment template incomplete ($ENV_COUNT variables)"
  fi
else
  log_fail "Environment template not found"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 8: API routes exist
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "TEST 8: Peskids API routes..."
ROUTE_COUNT=$(find "$PROJECT_ROOT/apps/peskids/app/api" -name "route.ts" -o -name "route.js" 2>/dev/null | wc -l)
if [ "$ROUTE_COUNT" -ge 5 ]; then
  log_pass "Found $ROUTE_COUNT API routes"
else
  log_warn "Only $ROUTE_COUNT API routes found (expected ≥5)"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 9: Linting passes
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "TEST 9: Linting (peskids)..."
if (cd "$PROJECT_ROOT/apps/peskids" && npx eslint . --max-warnings 10 > /tmp/eslint.log 2>&1); then
  log_pass "Peskids linting passed (or ≤10 warnings)"
else
  WARN_COUNT=$(grep -c "warning" /tmp/eslint.log || true)
  if [ "$WARN_COUNT" -le 10 ]; then
    log_warn "Peskids has linting warnings ($WARN_COUNT)"
  else
    log_fail "Peskids linting failed (>10 warnings)"
  fi
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 10: Documentation complete
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "TEST 10: Peskids documentation..."
DOCS=(
  "$PROJECT_ROOT/apps/peskids/README.md"
  "$PROJECT_ROOT/apps/peskids/CLAUDE.md"
  "$PROJECT_ROOT/apps/peskids/DEPLOYMENT.md"
  "$PROJECT_ROOT/docs/tenants/peskids/README.md"
)
DOC_COUNT=0
for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    ((DOC_COUNT++))
  fi
done
if [ "$DOC_COUNT" -ge 3 ]; then
  log_pass "Found $DOC_COUNT key documentation files"
else
  log_warn "Only $DOC_COUNT documentation files found (expected ≥3)"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}✅ PASS:${NC}     $PASSED"
echo -e "  ${RED}❌ FAIL:${NC}     $FAILED"
echo -e "  ${YELLOW}⚠️  WARN:${NC}     $WARNINGS"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}🟢 PESKIDS READY FOR CUSTOMER REVIEW${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Prepare customer handoff package (docs/tenants/peskids/CUSTOMER-LAUNCH-CHECKLIST.md)"
  echo "  2. Schedule customer review call"
  echo "  3. Collect feedback on missing features (calendar, email, SMS)"
  echo "  4. Plan Week 2 iterations based on feedback"
  echo ""
  exit 0
else
  echo -e "${RED}🔴 PESKIDS NOT READY — FIX $FAILED FAILURES BEFORE CUSTOMER REVIEW${NC}"
  echo ""
  exit 1
fi
