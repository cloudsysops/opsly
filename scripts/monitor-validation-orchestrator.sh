#!/bin/bash
# Monitor ValidationOrchestrator on VPS
#
# Continuously monitors:
#   - Orchestrator health status
#   - Job queue depth (enqueued vs completed)
#   - Git commit rate (auto-commit activity)
#   - Error rates
#   - Escalation rates
#
# Usage:
#   bash scripts/monitor-validation-orchestrator.sh
#   bash scripts/monitor-validation-orchestrator.sh --json (output metrics as JSON)
#   bash scripts/monitor-validation-orchestrator.sh --alert (trigger on errors)

set -euo pipefail

# Configuration
VPS_HOST="100.120.151.91"
VPS_USER="vps-dragon"
ORCHESTRATOR_URL="http://localhost:3011"
CHECK_INTERVAL=30 # seconds
ESCALATION_THRESHOLD=0.10 # 10% escalation rate = alert
ERROR_THRESHOLD=5 # more than 5 errors in last hour = alert
COMMIT_TIMEOUT=1800 # 30 min without commit = warning

# State tracking
STATE_FILE="/tmp/validation-orchestrator-state.json"
METRICS_FILE="/tmp/validation-orchestrator-metrics.json"
ALERT_LOG="/tmp/validation-orchestrator-alerts.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Utility functions
log_info() {
    echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} ℹ️  $1"
}

log_success() {
    echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} ✅ $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} ⚠️  $1"
}

log_error() {
    echo -e "${RED}[$(date +%H:%M:%S)]${NC} ❌ $1"
}

log_metric() {
    echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} 📊 $1"
}

record_alert() {
    local severity="$1"
    local message="$2"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    echo "{\"timestamp\": \"$timestamp\", \"severity\": \"$severity\", \"message\": \"$message\"}" >> "$ALERT_LOG"

    case "$severity" in
        "critical")
            log_error "$message"
            # Could trigger webhook here
            ;;
        "warning")
            log_warning "$message"
            ;;
        "info")
            log_info "$message"
            ;;
    esac
}

# Check orchestrator health
check_orchestrator_health() {
    local health_status=""
    local response=""

    response=$(ssh "$VPS_USER@$VPS_HOST" "curl -s http://localhost:3011/health" 2>/dev/null || echo "{}")

    if echo "$response" | jq -e '.status' &>/dev/null 2>&1; then
        health_status=$(echo "$response" | jq -r '.status // "unknown"')
        log_success "Orchestrator status: $health_status"
        return 0
    else
        log_error "Orchestrator not responding"
        record_alert "critical" "Orchestrator health check failed"
        return 1
    fi
}

# Count jobs in queue
get_queue_stats() {
    local stats=$(ssh "$VPS_USER@$VPS_HOST" bash << 'EOF'
        # Connect to Redis and get queue stats
        docker exec -i opsly-redis redis-cli --raw << 'REDIS'
        # Count jobs in different states
        DBSIZE
        KEYS "bull:local-agents:*" | wc -l
REDIS
EOF
    )

    log_metric "Queue depth: $stats"
}

# Count git commits (auto-commit activity)
get_git_commit_rate() {
    local commit_count=$(ssh "$VPS_USER@$VPS_HOST" "cd /opt/opsly && git log --oneline --since='30 minutes ago' | wc -l")
    local timestamp=$(date +%s)

    log_metric "Commits in last 30 min: $commit_count"

    # Check if there have been commits recently
    if [ "$commit_count" -eq 0 ]; then
        # Get time of last commit
        local last_commit=$(ssh "$VPS_USER@$VPS_HOST" "cd /opt/opsly && git log -1 --format=%ci" 2>/dev/null || echo "unknown")
        log_warning "No commits in last 30 minutes. Last commit: $last_commit"
    fi

    echo "$commit_count"
}

# Check Docker containers
check_containers() {
    local container_status=$(ssh "$VPS_USER@$VPS_HOST" "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'orchestrator|redis|postgres|local-'"* || true)

    if [ -z "$container_status" ]; then
        log_error "No Opsly containers running"
        record_alert "critical" "Docker containers not running"
        return 1
    fi

    echo "$container_status" | while read -r name status; do
        if [[ "$status" == "Up"* ]]; then
            log_success "$name: $status"
        else
            log_error "$name: $status"
            record_alert "critical" "Container $name is not running"
        fi
    done
}

# Check for errors in logs
check_error_logs() {
    local error_count=$(ssh "$VPS_USER@$VPS_HOST" "docker logs orchestrator --since=1h 2>&1 | grep -i 'error\|exception\|failed' | wc -l")

    log_metric "Errors in last hour: $error_count"

    if [ "$error_count" -gt "$ERROR_THRESHOLD" ]; then
        record_alert "warning" "High error rate detected: $error_count errors in last hour"

        # Show recent errors
        log_warning "Recent errors:"
        ssh "$VPS_USER@$VPS_HOST" "docker logs orchestrator --since=1h 2>&1 | grep -i 'error\|exception\|failed' | tail -5"
    fi
}

# Check escalation rate
check_escalation_rate() {
    local escalation_count=$(ssh "$VPS_USER@$VPS_HOST" "cd /opt/opsly && find .cursor/.validation -name '*.json' -type f | xargs grep -l '\"action\": \"escalate\"' 2>/dev/null | wc -l")
    local total_decisions=$(ssh "$VPS_USER@$VPS_HOST" "cd /opt/opsly && find .cursor/.validation -name '*.json' -type f | wc -l")

    if [ "$total_decisions" -gt 0 ]; then
        local escalation_rate=$(awk "BEGIN {printf \"%.2f\", $escalation_count / $total_decisions}")
        log_metric "Escalation rate: $escalation_rate ($escalation_count/$total_decisions)"

        if (( $(echo "$escalation_rate > $ESCALATION_THRESHOLD" | bc -l) )); then
            record_alert "warning" "High escalation rate: $escalation_rate (threshold: $ESCALATION_THRESHOLD)"
        fi
    else
        log_info "No validation decisions recorded yet"
    fi
}

# Generate metrics report
generate_metrics_report() {
  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  local commits=$(get_git_commit_rate)
  local orch_status
  orch_status=$(ssh "${VPS_USER}@${VPS_HOST}" 'curl -s http://localhost:3011/health | jq -r ".status // \"down\""')
  local container_count
  container_count=$(ssh "${VPS_USER}@${VPS_HOST}" 'docker ps | grep -c opsly || echo 0')

  cat > "$METRICS_FILE" << EOFM
{
  "timestamp": "$timestamp",
  "health": {
    "orchestrator": "$orch_status"
  },
  "metrics": {
    "commits_30min": $commits,
    "containers_running": $container_count
  }
}
EOFM

    if [ "$1" == "--json" ]; then
        cat "$METRICS_FILE"
    fi
}

# Main monitoring loop
monitor_loop() {
    log_info "Starting ValidationOrchestrator monitoring (interval: ${CHECK_INTERVAL}s)"
    log_info "Press Ctrl+C to stop"
    echo ""

    local iteration=0
    while true; do
        iteration=$((iteration + 1))
        echo "═══════════════════════════════════════════════════════════════"
        log_info "Health Check #$iteration at $(date)"
        echo "═══════════════════════════════════════════════════════════════"

        check_orchestrator_health || true
        check_containers || true
        check_error_logs || true
        check_escalation_rate || true
        get_commit_rate=$(get_git_commit_rate) || true

        generate_metrics_report

        echo ""
        log_info "Next check in ${CHECK_INTERVAL}s..."
        sleep "$CHECK_INTERVAL"
    done
}

# Parse arguments
if [ "${1:-}" == "--json" ]; then
    generate_metrics_report --json
    exit 0
fi

if [ "${1:-}" == "--once" ]; then
    check_orchestrator_health
    check_containers
    check_error_logs
    check_escalation_rate
    generate_metrics_report
    exit 0
fi

# Default: continuous monitoring
monitor_loop
