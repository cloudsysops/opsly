#!/usr/bin/env bash
# Performance Testing & Benchmarking Script
#
# Tests API response times, database query performance, and identifies bottlenecks
# Outputs JSON report for analysis
#
# Usage:
#   ./scripts/performance-test.sh [--endpoints=COMMA_SEPARATED_URLS] [--iterations=N] [--output=FILE]
#
# Examples:
#   ./scripts/performance-test.sh --endpoints=/api/health,/api/admin/costs --iterations=100
#   ./scripts/performance-test.sh --output=perf-report.json

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${_SCRIPT_DIR}/lib/common.sh" || { echo "Failed to source common.sh"; exit 1; }

# ============================================================================
# CONFIGURATION
# ============================================================================

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
ITERATIONS="${ITERATIONS:-50}"
ENDPOINTS="${ENDPOINTS:-/api/health,/api/admin/costs,/api/orchestrator/status}"
OUTPUT_FILE="${OUTPUT_FILE:-${_SCRIPT_DIR}/../runtime/metrics/perf-report.json}"
TIMEOUT=30

# Thresholds (milliseconds)
THRESHOLD_GOOD=100
THRESHOLD_WARN=500
THRESHOLD_CRIT=2000

# ============================================================================
# TEST RUNNER
# ============================================================================

test_endpoint() {
  local endpoint="$1"
  local iterations="$2"
  local -a times=()
  
  echo "Testing: $endpoint ($iterations requests)"
  
  for ((i = 1; i <= iterations; i++)); do
    # Get response time in milliseconds
    local response_time
    response_time=$(curl -s -w "%{time_total}" -o /dev/null \
      --max-time "$TIMEOUT" \
      --connect-timeout 5 \
      "$API_BASE_URL$endpoint" 2>/dev/null | awk '{printf "%.0f\n", $1 * 1000}')
    
    if [[ -z "$response_time" ]]; then
      response_time=0
    fi
    
    times+=("$response_time")
    
    # Print progress
    if (( i % 10 == 0 )); then
      printf "  Progress: $i/$iterations\r"
    fi
  done
  
  printf "  Progress: $iterations/$iterations ✓\n"
  
  # Calculate statistics
  local min=${times[0]}
  local max=${times[0]}
  local sum=0
  local count=${#times[@]}
  
  for time in "${times[@]}"; do
    sum=$((sum + time))
    [[ $time -lt $min ]] && min=$time
    [[ $time -gt $max ]] && max=$time
  done
  
  local avg=$((sum / count))
  
  # Calculate median
  local median
  IFS=$'\n' sorted=($(sort -n <<<"${times[*]}"))
  if (( count % 2 == 1 )); then
    median=${sorted[$((count / 2))]}
  else
    median=$(( (sorted[$((count / 2 - 1))] + sorted[$((count / 2))]) / 2 ))
  fi
  
  # Calculate percentiles
  local p95_idx=$((count * 95 / 100))
  local p99_idx=$((count * 99 / 100))
  local p95=${sorted[$p95_idx]:-0}
  local p99=${sorted[$p99_idx]:-0}
  
  # Determine status
  local status="OK"
  [[ $avg -gt $THRESHOLD_WARN ]] && status="WARN"
  [[ $avg -gt $THRESHOLD_CRIT ]] && status="CRIT"
  
  # Output result
  cat <<EOF
  
  Statistics for $endpoint:
  ├─ Min:     ${min}ms
  ├─ Max:     ${max}ms
  ├─ Average: ${avg}ms ($status)
  ├─ Median:  ${median}ms
  ├─ P95:     ${p95}ms
  ├─ P99:     ${p99}ms
  └─ Requests: $count
EOF
  
  # Return as JSON for report
  echo "{\"endpoint\": \"$endpoint\", \"min\": $min, \"max\": $max, \"avg\": $avg, \"median\": $median, \"p95\": $p95, \"p99\": $p99, \"count\": $count, \"status\": \"$status\"}"
}

# ============================================================================
# DATABASE PERFORMANCE
# ============================================================================

test_database_queries() {
  echo ""
  echo "Testing Database Query Performance"
  echo "=================================="
  
  local -a results=()
  
  # Query 1: Tenants count (simple)
  local query_time
  query_time=$(ssh root@100.120.151.91 \
    "docker exec opsly_platform_db psql -U postgres -d platform -c 'EXPLAIN ANALYZE SELECT count(*) FROM tenants;' 2>/dev/null | grep 'Execution Time' | awk '{print \$3}' | sed 's/ms//'" 2>/dev/null || echo "0")
  
  echo "  Simple SELECT (tenants count): ${query_time}ms"
  results+=("{\"query\": \"SELECT count(*) FROM tenants\", \"time_ms\": ${query_time:-0}}")
  
  # Query 2: With JOIN (medium complexity)
  # Query 3: With aggregation (high complexity)
  
  printf '%s\n' "${results[@]}"
}

# ============================================================================
# REDIS PERFORMANCE
# ============================================================================

test_redis_operations() {
  echo ""
  echo "Testing Redis Performance"
  echo "========================="
  
  if [[ -z "${REDIS_URL:-}" ]]; then
    echo "  ⓘ Redis URL not configured, skipping"
    return
  fi
  
  # SET operation (100 times)
  local set_times=()
  for ((i = 1; i <= 100; i++)); do
    local start_ns
    start_ns=$(date +%s%N)
    
    redis-cli -u "$REDIS_URL" SET "perf_test_$i" "value_$i" EX 3600 > /dev/null 2>&1
    
    local end_ns
    end_ns=$(date +%s%N)
    local duration=$(( (end_ns - start_ns) / 1000000 ))  # Convert to ms
    
    set_times+=("$duration")
  done
  
  # GET operation (100 times)
  local get_times=()
  for ((i = 1; i <= 100; i++)); do
    local start_ns
    start_ns=$(date +%s%N)
    
    redis-cli -u "$REDIS_URL" GET "perf_test_$i" > /dev/null 2>&1
    
    local end_ns
    end_ns=$(date +%s%N)
    local duration=$(( (end_ns - start_ns) / 1000000 ))
    
    get_times+=("$duration")
  done
  
  # Calculate averages
  local set_sum=0
  for time in "${set_times[@]}"; do
    set_sum=$((set_sum + time))
  done
  
  local get_sum=0
  for time in "${get_times[@]}"; do
    get_sum=$((get_sum + time))
  done
  
  local set_avg=$((set_sum / 100))
  local get_avg=$((get_sum / 100))
  
  echo "  SET operation (100 ops): avg ${set_avg}ms"
  echo "  GET operation (100 ops): avg ${get_avg}ms"
}

# ============================================================================
# REPORT GENERATION
# ============================================================================

generate_report() {
  local -a results=("$@")
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  mkdir -p "${OUTPUT_FILE%/*}"
  
  # Create JSON report
  cat > "$OUTPUT_FILE" <<EOF
{
  "timestamp": "$timestamp",
  "api_base_url": "$API_BASE_URL",
  "test_configuration": {
    "iterations": $ITERATIONS,
    "endpoints": ["$(echo $ENDPOINTS | sed 's/,/", "/g')"],
    "timeout_seconds": $TIMEOUT
  },
  "results": [
    $(printf '%s\n' "${results[@]}" | paste -sd, -)
  ],
  "thresholds": {
    "good_ms": $THRESHOLD_GOOD,
    "warning_ms": $THRESHOLD_WARN,
    "critical_ms": $THRESHOLD_CRIT
  }
}
EOF
  
  echo ""
  echo "Report saved: $OUTPUT_FILE"
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  local -a results=()
  
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║           Performance Testing & Benchmarking              ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo "API Base URL: $API_BASE_URL"
  echo "Iterations:   $ITERATIONS"
  echo "Endpoints:    $ENDPOINTS"
  echo ""
  
  # Test each endpoint
  IFS=',' read -ra ENDPOINT_ARRAY <<< "$ENDPOINTS"
  for endpoint in "${ENDPOINT_ARRAY[@]}"; do
    endpoint=$(echo "$endpoint" | xargs)  # Trim whitespace
    result=$(test_endpoint "$endpoint" "$ITERATIONS")
    results+=("$(echo "$result" | tail -1)")
  done
  
  # Test database
  test_database_queries
  
  # Test Redis
  test_redis_operations
  
  # Generate report
  generate_report "${results[@]}"
  
  # Summary
  echo ""
  echo "✅ Performance testing complete"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --endpoints=*) ENDPOINTS="${1#*=}" ;;
    --iterations=*) ITERATIONS="${1#*=}" ;;
    --output=*) OUTPUT_FILE="${1#*=}" ;;
    *) log_error "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

main "$@"
