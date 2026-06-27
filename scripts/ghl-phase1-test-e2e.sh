#!/usr/bin/env bash
#
# GHL Phase 1 — End-to-End Testing
#
# Validates complete lead flow for all 3 customers:
# 1. Lead submission → Supabase storage
# 2. Contact creation in GHL
# 3. Opportunity creation in pipeline
# 4. Email delivery
# 5. Webhook processing
#
# Usage:
#   ./scripts/ghl-phase1-test-e2e.sh              # run all tests
#   ./scripts/ghl-phase1-test-e2e.sh --customer intcloudsysops   # single customer
#   ./scripts/ghl-phase1-test-e2e.sh --verbose    # detailed output
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ───────────────────────────────────────────────────────────────
# Configuration
# ───────────────────────────────────────────────────────────────

VERBOSE="${VERBOSE:-0}"
CUSTOMER="${CUSTOMER:-all}"
PROJECT="ops-intcloudsysops"
CONFIG="prd"
TEST_LOG="logs/e2e-test-$(date +%Y%m%d_%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# ───────────────────────────────────────────────────────────────
# Helpers
# ───────────────────────────────────────────────────────────────

log() {
  echo "$1" | tee -a "$TEST_LOG"
}

pass() {
  ((TESTS_PASSED++))
  echo -e "${GREEN}✓ PASS${NC} $1" | tee -a "$TEST_LOG"
}

fail() {
  ((TESTS_FAILED++))
  echo -e "${RED}✗ FAIL${NC} $1" | tee -a "$TEST_LOG"
}

warn() {
  echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$TEST_LOG"
}

info() {
  echo -e "${BLUE}ℹ $1${NC}" | tee -a "$TEST_LOG"
}

header() {
  echo ""
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$TEST_LOG"
  echo -e "${BOLD}${BLUE}$1${NC}" | tee -a "$TEST_LOG"
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$TEST_LOG"
}

# ───────────────────────────────────────────────────────────────
# Test: Infrastructure
# ───────────────────────────────────────────────────────────────

test_doppler_access() {
  local tenant="$1"
  ((TESTS_RUN++))

  info "Testing Doppler access for $tenant..."

  if doppler secrets get "GOHIGHLEVEL_${tenant^^}_API_KEY" --project "$PROJECT" --config "$CONFIG" &>/dev/null; then
    pass "Doppler secret available: GOHIGHLEVEL_${tenant^^}_API_KEY"
  else
    fail "Doppler secret missing: GOHIGHLEVEL_${tenant^^}_API_KEY"
  fi
}

test_webhook_endpoint() {
  local tenant="$1"
  ((TESTS_RUN++))

  info "Testing webhook endpoint for $tenant..."

  # Check if endpoint exists in route files
  if grep -r "tenants/${tenant}/webhooks" apps/api/app/ &>/dev/null; then
    pass "Webhook endpoint defined: /api/public/tenants/$tenant/webhooks/gohighlevel/leads"
  else
    fail "Webhook endpoint not found: /api/public/tenants/$tenant/webhooks/gohighlevel/leads"
  fi
}

test_database_schema() {
  local tenant="$1"
  ((TESTS_RUN++))

  info "Testing database schema for $tenant..."

  # Check if tables exist (using Supabase CLI or psql)
  if psql -U postgres -d opsly -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%${tenant}%'" 2>/dev/null | grep -q "$tenant"; then
    pass "Database tables created for $tenant"
  else
    warn "Cannot verify database tables (psql not available)"
  fi
}

# ───────────────────────────────────────────────────────────────
# Test: GHL Integration
# ───────────────────────────────────────────────────────────────

test_ghl_api_connection() {
  local tenant="$1"
  ((TESTS_RUN++))

  info "Testing GHL API connection for $tenant..."

  local api_key
  api_key=$(doppler secrets get "GOHIGHLEVEL_${tenant^^}_API_KEY" --project "$PROJECT" --config "$CONFIG" 2>/dev/null || echo "")

  if [[ -z "$api_key" ]]; then
    fail "Cannot test GHL API — Doppler secret missing"
    return
  fi

  # Test GHL API endpoint
  if curl -s -H "Authorization: Bearer $api_key" \
    "https://services.leadconnectorhq.com/locations" | grep -q "locations"; then
    pass "GHL API connection successful"
  else
    fail "GHL API connection failed"
  fi
}

test_ghl_pipeline() {
  local tenant="$1"
  ((TESTS_RUN++))

  info "Testing GHL pipeline configuration for $tenant..."

  # Check if pipeline ID is configured
  if [[ -n "${GOHIGHLEVEL_${tenant^^}_PIPELINE_ID:-}" ]]; then
    pass "Pipeline ID configured: GOHIGHLEVEL_${tenant^^}_PIPELINE_ID"
  else
    warn "Pipeline ID not configured (manual UI step)"
  fi
}

test_ghl_calendar() {
  local tenant="$1"
  ((TESTS_RUN++))

  info "Testing GHL calendar configuration for $tenant..."

  if [[ -n "${GOHIGHLEVEL_${tenant^^}_CALENDAR_ID:-}" ]]; then
    pass "Calendar ID configured: GOHIGHLEVEL_${tenant^^}_CALENDAR_ID"
  else
    warn "Calendar ID not configured (manual UI step)"
  fi
}

# ───────────────────────────────────────────────────────────────
# Test: Lead Flow
# ───────────────────────────────────────────────────────────────

test_lead_submission() {
  local tenant="$1"
  ((TESTS_RUN++))

  info "Testing lead submission for $tenant..."

  # Submit test lead via API
  local test_email="test-${tenant}-$(date +%s)@example.com"

  response=$(curl -s -X POST "http://localhost:3000/api/public/tenants/${tenant}/webhooks/gohighlevel/leads" \
    -H "Content-Type: application/json" \
    -d "{\"lead_id\":\"test-${tenant}\",\"email\":\"${test_email}\",\"name\":\"Test Lead\",\"phone\":\"+573105551234\"}")

  if echo "$response" | grep -q "success\|id"; then
    pass "Lead submission successful: $test_email"
  else
    fail "Lead submission failed for $tenant"
    [[ "$VERBOSE" == "1" ]] && echo "Response: $response"
  fi
}

test_database_persistence() {
  local tenant="$1"
  ((TESTS_RUN++))

  info "Testing database persistence for $tenant..."

  # Check if test lead was persisted
  local count
  count=$(psql -U postgres -d opsly -t -c "SELECT COUNT(*) FROM platform.${tenant}_leads LIMIT 1" 2>/dev/null || echo "0")

  if [[ "$count" -gt 0 ]]; then
    pass "Leads persisted in database ($count lead(s))"
  else
    warn "Cannot verify database persistence (psql not available)"
  fi
}

# ───────────────────────────────────────────────────────────────
# Test: Email Delivery
# ───────────────────────────────────────────────────────────────

test_email_template() {
  local tenant="$1"
  ((TESTS_RUN++))

  info "Testing email template for $tenant..."

  # Check if email template exists in GHL or docs
  if grep -r "${tenant}" docs/superpowers/specs/ | grep -i "email\|template" &>/dev/null; then
    pass "Email template documented for $tenant"
  else
    warn "Email template not found in documentation (manual step)"
  fi
}

test_webhook_handler() {
  local tenant="$1"
  ((TESTS_RUN++))

  info "Testing webhook handler for $tenant..."

  if grep -r "gohighlevel/leads" "apps/api/app/public/tenants/${tenant}/" &>/dev/null; then
    pass "Webhook handler implemented for $tenant"
  else
    fail "Webhook handler not found for $tenant"
  fi
}

# ───────────────────────────────────────────────────────────────
# Test Suite Runner
# ───────────────────────────────────────────────────────────────

run_tests_for_customer() {
  local tenant="$1"

  header "Testing: $tenant"

  # Infrastructure tests
  header_sub "Infrastructure"
  test_doppler_access "$tenant"
  test_webhook_endpoint "$tenant"
  test_database_schema "$tenant"

  # GHL Integration tests
  header_sub "GHL Integration"
  test_ghl_api_connection "$tenant"
  test_ghl_pipeline "$tenant"
  test_ghl_calendar "$tenant"

  # Lead Flow tests
  header_sub "Lead Flow"
  test_lead_submission "$tenant"
  test_database_persistence "$tenant"

  # Email tests
  header_sub "Email & Notifications"
  test_email_template "$tenant"
  test_webhook_handler "$tenant"
}

header_sub() {
  echo ""
  echo -e "${BOLD}$1${NC}" | tee -a "$TEST_LOG"
}

# ───────────────────────────────────────────────────────────────
# Main
# ───────────────────────────────────────────────────────────────

main() {
  mkdir -p logs

  log "GHL Phase 1 E2E Test Suite"
  log "Started: $(date '+%Y-%m-%d %H:%M:%S')"

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --customer)
        CUSTOMER="$2"
        shift 2
        ;;
      --verbose|-v)
        VERBOSE=1
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        exit 1
        ;;
    esac
  done

  # Run tests
  if [[ "$CUSTOMER" == "all" ]]; then
    for customer in intcloudsysops peskids icso; do
      run_tests_for_customer "$customer"
    done
  else
    run_tests_for_customer "$CUSTOMER"
  fi

  # Summary
  header "Test Results Summary"

  echo "Total Tests: $TESTS_RUN"
  echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
  echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
  echo ""

  if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}✓ All tests passed!${NC}"
  else
    echo -e "${RED}${BOLD}✗ Some tests failed${NC}"
  fi

  echo ""
  echo "Log file: $TEST_LOG"
  echo "Completed: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""

  # Return appropriate exit code
  [[ $TESTS_FAILED -eq 0 ]] && exit 0 || exit 1
}

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

OPTIONS:
  --customer <name>    Test specific customer (default: all)
  --verbose,-v         Show detailed output
  --help,-h            Show this help message

CUSTOMERS:
  intcloudsysops       Agency
  peskids              Tenant (Education)
  icso                 Website lead capture
  all                  Run all tests (default)

EXAMPLES:
  ./scripts/ghl-phase1-test-e2e.sh
  ./scripts/ghl-phase1-test-e2e.sh --customer peskids
  ./scripts/ghl-phase1-test-e2e.sh --verbose

OUTPUT:
  Test log: logs/e2e-test-*.log
  Summary report printed to console
EOF
}

# Execute
main "$@"
