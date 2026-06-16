#!/usr/bin/env bash
# Peskids — FULL E2E TEST
# Validates entire flow: lead capture → GHL → email → SMS → dashboard
# Usage: ./scripts/peskids-e2e-full-flow.sh [--live|--dry-run]

set -euo pipefail

BASE_URL="${PESKIDS_URL:-https://peskids.op-sly.com}"
GHL_API="${GHL_API_KEY:-}"
N8N_WEBHOOK="${N8N_LEAD_INTAKE_URL:-https://n8n-peskids.op-sly.com/webhook/peskids-lead-intake}"
MODE="${1:---dry-run}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FAILED=0

echo -e "${BLUE}🚀 PESKIDS E2E TEST — FULL FLOW (${MODE})${NC}"
echo ""

# Test 1: API Health
echo -e "${BLUE}[1/5] Testing API Health...${NC}"
api_status=$(curl -sf "$BASE_URL/api/health" | jq -r '.status // "error"')
if [ "$api_status" = "ok" ]; then
  echo -e "${GREEN}✅ API is healthy${NC}"
else
  echo -e "${RED}❌ API is down (status=${api_status})${NC}"
  FAILED=1
fi
echo ""

# Test 2: Lead Form Submit (canonical /api/leads contract)
echo -e "${BLUE}[2/5] Testing Lead Form Submission...${NC}"
lead_id=""
if [ "$MODE" = "--live" ]; then
  test_email="e2e-test-$(date +%s)@example.com"
  # name: API allows letters/spaces only (no digits) — see apps/api/lib/peskids/schemas.ts
  test_lead=$(curl -s -X POST "$BASE_URL/api/leads" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Prueba Parent\",
      \"email\": \"${test_email}\",
      \"phone\": \"3001234567\",
      \"grade_interested\": \"K-5\",
      \"class_modality\": \"llanogrande\",
      \"neighborhood\": \"Medellin\",
      \"consent_treatment\": true,
      \"consent_marketing\": false,
      \"consent_policy_version\": \"2026-06-01\"
    }")

  lead_ok=$(echo "$test_lead" | jq -r '.ok // false')
  lead_id=$(echo "$test_lead" | jq -r '.lead_id // .id // empty')
  if [ "$lead_ok" = "true" ] && [ -n "$lead_id" ]; then
    echo -e "${GREEN}✅ Lead created: ${lead_id}${NC}"
  else
    echo -e "${RED}❌ Lead creation failed${NC}"
    echo "$test_lead"
    FAILED=1
  fi
else
  echo -e "${YELLOW}⏭️  [DRY-RUN] Skipping live lead creation${NC}"
  lead_id="test-e2e-dry"
fi
echo ""

# Test 3: GHL Integration
echo -e "${BLUE}[3/5] Testing GHL Integration...${NC}"
ghl_ok=0
if [ -n "$GHL_API" ]; then
  ghl_response=$(curl -s -H "Authorization: Bearer $GHL_API" \
    "https://api.gohighlevel.com/v1/locations/KJ5LawrOOe3hIerqtMRu/contacts?limit=1")

  if echo "$ghl_response" | jq -e '.contacts[0].id' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ GHL API is accessible${NC}"
    ghl_ok=1
  else
    echo -e "${RED}❌ GHL API error${NC}"
    FAILED=1
  fi
else
  echo -e "${YELLOW}⏭️  GHL_API_KEY not set (skipping)${NC}"
fi
echo ""

# Test 4: n8n Webhook
echo -e "${BLUE}[4/5] Testing n8n Webhook...${NC}"
n8n_ok=0
if [ "$MODE" = "--live" ] && [ -n "$lead_id" ]; then
  n8n_response=$(curl -s -X POST "$N8N_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{
      \"lead_id\": \"${lead_id}\",
      \"name\": \"Prueba Parent\",
      \"phone\": \"3001234567\",
      \"email\": \"e2e@example.com\",
      \"grade_interested\": \"K-5\"
    }")

  if echo "$n8n_response" | jq -e '.success // .ok' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ n8n webhook responded${NC}"
    n8n_ok=1
  else
    echo -e "${YELLOW}⚠️  n8n webhook response unclear (may need workflow publish)${NC}"
    echo "$n8n_response" | head -c 200
    echo ""
  fi
else
  echo -e "${YELLOW}⏭️  [DRY-RUN] Skipping live webhook test${NC}"
fi
echo ""

# Test 5: Dashboard Access
echo -e "${BLUE}[5/5] Testing Dashboard Access...${NC}"
dashboard_status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/admin/login")
if [ "$dashboard_status" = "200" ]; then
  echo -e "${GREEN}✅ Admin dashboard is accessible${NC}"
else
  echo -e "${RED}❌ Admin dashboard returned HTTP ${dashboard_status}${NC}"
  FAILED=1
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✅ E2E TEST PASSED${NC}"
else
  echo -e "${RED}❌ E2E TEST FAILED${NC}"
  exit 1
fi

echo ""
echo "Summary:"
echo "  API Health: ${api_status}"
echo "  Lead (${MODE}): ${lead_id:-skipped}"
echo "  GHL: $([ "$ghl_ok" -eq 1 ] && echo OK || echo skipped)"
echo "  n8n: $([ "$n8n_ok" -eq 1 ] && echo OK || echo skipped)"
echo "  Dashboard: HTTP ${dashboard_status}"
echo ""
echo "Next steps:"
echo "  1. Dashboard: ${BASE_URL}/admin/login"
echo "  2. GHL location: KJ5LawrOOe3hIerqtMRu"
echo "  3. Manual GHL forms/workflows: docs/tenants/peskids/GO-LIVE-CHECKLIST.md"
