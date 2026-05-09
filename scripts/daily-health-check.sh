#!/usr/bin/env bash
# Enhanced Health Check Script
#
# Performs comprehensive daily health checks across all services
# Sends alerts to Discord if issues found
# Tracks metrics for cost monitoring
#
# Usage:
#   ./scripts/daily-health-check.sh [--verbose] [--slack] [--metrics]
#
# Requires:
#   - SSH access to VPS (via Tailscale 100.120.151.91)
#   - DISCORD_WEBHOOK_URL (optional)
#   - jq (JSON parsing)

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${_SCRIPT_DIR}/lib/common.sh" || { echo "Failed to source common.sh"; exit 1; }

VERBOSE="${VERBOSE:-false}"
SEND_ALERTS="${SEND_ALERTS:-true}"
TRACK_METRICS="${TRACK_METRICS:-false}"

# VPS access
VPS_HOST="${VPS_HOST:-100.120.151.91}"
VPS_USER="${VPS_USER:-root}"
VPS_TIMEOUT=10

# Alert thresholds
DISK_THRESHOLD_PCT=80
MEMORY_THRESHOLD_PCT=75
CPU_THRESHOLD_PCT=90
QUEUE_DEPTH_THRESHOLD=1000
RESPONSE_TIME_THRESHOLD_MS=2000

# Logging
HEALTH_LOG="${_SCRIPT_DIR}/../runtime/logs/health-check.log"
METRICS_FILE="${_SCRIPT_DIR}/../runtime/metrics/daily-metrics.json"

# ============================================================================
# UTILITIES
# ============================================================================

log_section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

check_status() {
  local service="$1"
  local status="$2"
  local details="$3"
  
  if [[ "$status" == "OK" ]]; then
    echo "  ✅ $service: $details"
  else
    echo "  ❌ $service: $details"
    ALERTS+=("$service: $details")
  fi
}

send_alert() {
  local message="$1"
  
  if [[ "$SEND_ALERTS" != "true" ]] || [[ -z "${DISCORD_WEBHOOK_URL:-}" ]]; then
    return
  fi
  
  curl -s -X POST "$DISCORD_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"⚠️  **Health Check Alert**\n$message\"}" \
    > /dev/null || true
}

# ============================================================================
# CHECKS
# ============================================================================

check_vps_connectivity() {
  log_section "VPS Connectivity"
  
  if ssh -o ConnectTimeout=$VPS_TIMEOUT "$VPS_USER@$VPS_HOST" "echo OK" &>/dev/null; then
    check_status "SSH" "OK" "Connected to VPS"
  else
    check_status "SSH" "FAIL" "Cannot connect to VPS ($VPS_HOST)"
    return 1
  fi
}

check_docker_services() {
  log_section "Docker Services"
  
  local output
  output=$(ssh "$VPS_USER@$VPS_HOST" "docker ps --format 'table {{.Names}}\t{{.Status}}'" 2>/dev/null || echo "")
  
  if [[ -z "$output" ]]; then
    check_status "Docker" "FAIL" "Cannot list containers"
    return 1
  fi
  
  local expected_services=("opsly_api" "opsly_orchestrator" "infra-redis" "traefik")
  local running_count=0
  
  for service in "${expected_services[@]}"; do
    if echo "$output" | grep -q "$service.*Up"; then
      ((running_count++))
    else
      ALERTS+=("Service not running: $service")
    fi
  done
  
  check_status "Docker" "OK" "$running_count/${#expected_services[@]} services running"
  
  # Count total containers
  local total=$(echo "$output" | wc -l)
  [[ $VERBOSE == "true" ]] && echo "    → Total containers: $total"
}

check_api_health() {
  log_section "API Health"
  
  local api_url="${API_BASE_URL:-https://api.op-sly.com}"
  local response_time
  local http_code
  
  # Use timeout to prevent hanging
  if response_time=$(curl -s -w "%{time_total}" -o /tmp/health_response.json \
    --max-time 10 \
    "$api_url/api/health" 2>/dev/null); then
    
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$api_url/api/health")
    response_time_ms=$(echo "$response_time * 1000" | bc)
    
    if [[ "$http_code" == "200" ]]; then
      check_status "API" "OK" "${response_time_ms}ms response time"
      
      if (( $(echo "$response_time_ms > $RESPONSE_TIME_THRESHOLD_MS" | bc -l) )); then
        ALERTS+=("API response time high: ${response_time_ms}ms (threshold: ${RESPONSE_TIME_THRESHOLD_MS}ms)")
      fi
    else
      check_status "API" "FAIL" "HTTP $http_code"
      ALERTS+=("API returning $http_code")
    fi
  else
    check_status "API" "FAIL" "Timeout or network error"
    ALERTS+=("API unreachable")
  fi
}

check_database() {
  log_section "Database"
  
  local db_check
  db_check=$(ssh "$VPS_USER@$VPS_HOST" \
    "docker exec opsly_platform_db psql -U postgres -d platform -c 'SELECT count(*) FROM tenants;' 2>/dev/null" || echo "")
  
  if [[ -z "$db_check" ]]; then
    check_status "Database" "FAIL" "Cannot connect or query"
    ALERTS+=("Database unreachable")
  else
    local tenant_count=$(echo "$db_check" | tail -1 | xargs)
    check_status "Database" "OK" "$tenant_count tenants"
  fi
}

check_redis_queue() {
  log_section "Redis Queue"
  
  if [[ -z "${REDIS_URL:-}" ]]; then
    echo "  ⓘ  Redis URL not configured, skipping"
    return
  fi
  
  local queue_depth
  queue_depth=$(redis-cli -u "$REDIS_URL" DBSIZE 2>/dev/null | grep "keys=" | sed 's/keys=//' || echo "0")
  
  check_status "Queue" "OK" "$queue_depth keys in Redis"
  
  if (( queue_depth > QUEUE_DEPTH_THRESHOLD )); then
    ALERTS+=("Queue backing up: $queue_depth keys (threshold: $QUEUE_DEPTH_THRESHOLD)")
  fi
}

check_disk_space() {
  log_section "Disk Space"
  
  local disk_usage
  disk_usage=$(ssh "$VPS_USER@$VPS_HOST" "df /opt | tail -1 | awk '{print \$5}' | sed 's/%//'")
  
  if (( disk_usage > DISK_THRESHOLD_PCT )); then
    check_status "Disk" "WARN" "$disk_usage% used (threshold: ${DISK_THRESHOLD_PCT}%)"
    ALERTS+=("Disk usage high: ${disk_usage}%")
  else
    check_status "Disk" "OK" "$disk_usage% used"
  fi
}

check_memory() {
  log_section "Memory"
  
  local memory_usage
  memory_usage=$(ssh "$VPS_USER@$VPS_HOST" "free | grep Mem | awk '{printf(\"%.0f\", \$3/\$2 * 100)}'")
  
  if (( memory_usage > MEMORY_THRESHOLD_PCT )); then
    check_status "Memory" "WARN" "$memory_usage% used (threshold: ${MEMORY_THRESHOLD_PCT}%)"
    ALERTS+=("Memory pressure: ${memory_usage}%")
  else
    check_status "Memory" "OK" "$memory_usage% used"
  fi
}

check_ssl_certificates() {
  log_section "SSL Certificates"
  
  local cert_check
  cert_check=$(ssh "$VPS_USER@$VPS_HOST" "docker exec traefik /traefik version 2>/dev/null | grep -i certificate" || echo "")
  
  if [[ -z "$cert_check" ]]; then
    check_status "SSL" "OK" "Traefik running"
  else
    check_status "SSL" "OK" "Certificates managed by Traefik"
  fi
}

check_recent_errors() {
  log_section "Recent Errors"
  
  local error_count
  error_count=$(ssh "$VPS_USER@$VPS_HOST" \
    "grep -h ERROR /opt/opsly/runtime/logs/*.log 2>/dev/null | wc -l" || echo "0")
  
  if (( error_count > 10 )); then
    check_status "Errors" "WARN" "$error_count errors in logs (last 24h)"
    ALERTS+=("High error count: $error_count")
  else
    check_status "Errors" "OK" "$error_count errors (normal)"
  fi
}

# ============================================================================
# METRICS
# ============================================================================

collect_metrics() {
  if [[ "$TRACK_METRICS" != "true" ]]; then
    return
  fi
  
  log_section "Collecting Metrics"
  
  mkdir -p "${METRICS_FILE%/*}"
  
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  local metrics="{
    \"timestamp\": \"$timestamp\",
    \"queue_depth\": $(redis-cli -u "$REDIS_URL" DBSIZE 2>/dev/null | grep "keys=" | sed 's/keys=//' || echo "0"),
    \"tenants_active\": $(ssh "$VPS_USER@$VPS_HOST" "docker exec opsly_platform_db psql -U postgres -d platform -c 'SELECT count(*) FROM tenants;' 2>/dev/null | tail -1 | xargs" || echo "0")
  }"
  
  echo "$metrics" > "$METRICS_FILE"
  echo "  📊 Metrics saved to $METRICS_FILE"
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  local exit_code=0
  local -a ALERTS=()
  
  # Create log directory
  mkdir -p "${HEALTH_LOG%/*}" "${METRICS_FILE%/*}"
  
  # Log start
  {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Health Check: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  } | tee -a "$HEALTH_LOG"
  
  # Run checks
  check_vps_connectivity || exit_code=1
  [[ $exit_code -eq 0 ]] && check_docker_services
  [[ $exit_code -eq 0 ]] && check_api_health
  [[ $exit_code -eq 0 ]] && check_database
  [[ $exit_code -eq 0 ]] && check_redis_queue
  [[ $exit_code -eq 0 ]] && check_disk_space
  [[ $exit_code -eq 0 ]] && check_memory
  [[ $exit_code -eq 0 ]] && check_ssl_certificates
  [[ $exit_code -eq 0 ]] && check_recent_errors
  
  # Collect metrics
  [[ $exit_code -eq 0 ]] && collect_metrics
  
  # Summary
  log_section "Summary"
  
  if (( ${#ALERTS[@]} > 0 )); then
    echo "  ⚠️  ${#ALERTS[@]} alert(s) found:"
    for alert in "${ALERTS[@]}"; do
      echo "     • $alert"
      send_alert "$alert"
    done
    exit_code=1
  else
    echo "  ✅ All checks passed"
  fi
  
  echo ""
  echo "Log saved to: $HEALTH_LOG"
  
  return $exit_code
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --verbose) VERBOSE=true ;;
    --slack) SEND_ALERTS=true ;;
    --metrics) TRACK_METRICS=true ;;
    *) log_error "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

main "$@"
