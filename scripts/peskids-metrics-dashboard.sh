#!/usr/bin/env bash
# Peskids — Real-time metrics dashboard
# Usage: ./scripts/peskids-metrics-dashboard.sh [--interval 30]
# Shows: leads/day, trials, conversions, health

set -euo pipefail

INTERVAL="${1:-30}"
BASE_URL="${PESKIDS_URL:-https://peskids.op-sly.com}"
GHL_LOCATION="${GHL_LOCATION:-KJ5LawrOOe3hIerqtMRu}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  PESKIDS — REAL-TIME DASHBOARD${NC}"
  echo -e "${BLUE}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

health_check() {
  echo -e "${BLUE}🏥 HEALTH${NC}"

  # API health
  http_code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health" || echo "000")
  if [ "$http_code" = "200" ]; then
    echo -e "  API:              ${GREEN}✅ UP${NC}"
  else
    echo -e "  API:              ${RED}❌ DOWN (HTTP $http_code)${NC}"
  fi

  # Database health
  db_check=$(curl -s "$BASE_URL/api/health" | grep -q '"database":"ok"' && echo "ok" || echo "fail")
  if [ "$db_check" = "ok" ]; then
    echo -e "  Database:         ${GREEN}✅ UP${NC}"
  else
    echo -e "  Database:         ${RED}❌ DOWN${NC}"
  fi

  # GHL integration
  ghl_check=$(curl -s "$BASE_URL/api/health" | grep -q '"ghl":"ok"' && echo "ok" || echo "fail")
  if [ "$ghl_check" = "ok" ]; then
    echo -e "  GHL Integration:  ${GREEN}✅ CONNECTED${NC}"
  else
    echo -e "  GHL Integration:  ${YELLOW}⚠️  DEGRADED${NC}"
  fi

  # n8n workflows
  n8n_check=$(curl -s "$BASE_URL/api/health" | grep -q '"n8n":"ok"' && echo "ok" || echo "fail")
  if [ "$n8n_check" = "ok" ]; then
    echo -e "  n8n Workflows:    ${GREEN}✅ ACTIVE${NC}"
  else
    echo -e "  n8n Workflows:    ${RED}❌ INACTIVE${NC}"
  fi

  echo ""
}

metrics() {
  echo -e "${BLUE}📊 METRICS (TODAY)${NC}"

  # These would come from API in production
  # For now, showing format

  echo "  Leads captured:   $(curl -s "$BASE_URL/api/metrics?metric=leads_today" | jq '.value // 0') 📈"
  echo "  Trials booked:    $(curl -s "$BASE_URL/api/metrics?metric=trials_today" | jq '.value // 0') 📅"
  echo "  Trials completed: $(curl -s "$BASE_URL/api/metrics?metric=trials_completed_today" | jq '.value // 0') ✅"
  echo "  New enrollments:  $(curl -s "$BASE_URL/api/metrics?metric=enrollments_today" | jq '.value // 0') 🎓"
  echo "  Conversion rate:  $(curl -s "$BASE_URL/api/metrics?metric=conversion_rate" | jq '.value // 0')% 📊"

  echo ""
}

alerts() {
  echo -e "${BLUE}🚨 ALERTS${NC}"

  # Check for issues
  issues=0

  # No leads today
  leads=$(curl -s "$BASE_URL/api/metrics?metric=leads_today" | jq '.value // 0')
  if [ "$leads" -eq 0 ]; then
    echo -e "  ${YELLOW}⚠️  No leads captured today${NC}"
    issues=$((issues + 1))
  fi

  # Trial completion rate low
  completion_rate=$(curl -s "$BASE_URL/api/metrics?metric=trial_completion_rate" | jq '.value // 0')
  if [ "${completion_rate%.*}" -lt 70 ]; then
    echo -e "  ${YELLOW}⚠️  Trial completion rate < 70% ($completion_rate%)${NC}"
    issues=$((issues + 1))
  fi

  # Conversion rate low
  conversion=$(curl -s "$BASE_URL/api/metrics?metric=conversion_rate" | jq '.value // 0')
  if [ "${conversion%.*}" -lt 40 ]; then
    echo -e "  ${YELLOW}⚠️  Conversion rate < 40% ($conversion%)${NC}"
    issues=$((issues + 1))
  fi

  # Database errors
  db_errors=$(curl -s "$BASE_URL/api/metrics?metric=db_errors_today" | jq '.value // 0')
  if [ "$db_errors" -gt 0 ]; then
    echo -e "  ${RED}❌ Database errors: $db_errors${NC}"
    issues=$((issues + 1))
  fi

  # GHL sync failures
  ghl_failures=$(curl -s "$BASE_URL/api/metrics?metric=ghl_sync_failures_today" | jq '.value // 0')
  if [ "$ghl_failures" -gt 0 ]; then
    echo -e "  ${RED}❌ GHL sync failures: $ghl_failures${NC}"
    issues=$((issues + 1))
  fi

  if [ "$issues" -eq 0 ]; then
    echo -e "  ${GREEN}✅ No critical alerts${NC}"
  fi

  echo ""
}

queue_status() {
  echo -e "${BLUE}📮 QUEUE STATUS${NC}"

  pending=$(curl -s "$BASE_URL/api/metrics?metric=pending_jobs" | jq '.value // 0')
  failed=$(curl -s "$BASE_URL/api/metrics?metric=failed_jobs" | jq '.value // 0')

  echo "  Pending jobs:     $pending"
  echo "  Failed jobs:      $failed"

  if [ "$failed" -gt 0 ]; then
    echo -e "  ${YELLOW}Action: Review failed jobs in n8n${NC}"
  fi

  echo ""
}

footer() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}🔄 Refreshing in $INTERVAL seconds... (Ctrl+C to exit)${NC}"
  echo ""
}

# Main loop
while true; do
  header
  health_check
  metrics
  alerts
  queue_status
  footer

  sleep "$INTERVAL"
done
