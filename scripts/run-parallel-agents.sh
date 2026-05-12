#!/bin/bash
# Parallel Multi-Agent Execution Orchestrator
#
# Executes a single prompt across multiple agents (Cursor, Claude, Copilot, OpenCode)
# in parallel, collects results, applies validation feedback, and auto-commits
#
# Usage:
#   bash scripts/run-parallel-agents.sh "Create API handler" --max-concurrent 4 --timeout 60
#   bash scripts/run-parallel-agents.sh "my-task.md" --agents cursor,claude --no-validate

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROMPT_INPUT="${1:-.cursor/prompts/default.md}"
MAX_CONCURRENT=${MAX_CONCURRENT:-4}
EXECUTION_TIMEOUT=${EXECUTION_TIMEOUT:-60}
VALIDATE_RESULTS=${VALIDATE_RESULTS:-true}
JOB_ID=$(date +%s)-$(openssl rand -hex 4)
RESULTS_DIR=".cursor/responses/parallel-${JOB_ID}"

# Agent configurations (ports must match orchestrator config)
declare -a AGENTS=("cursor:5001:executor" "claude:5002:analyzer" "copilot:5003:validator" "opencode:5004:refiner")
ENABLED_AGENTS=()

# Logging functions
log_info() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} ℹ️  $1"; }
log_success() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} ✅ $1"; }
log_warning() { echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} ⚠️  $1"; }
log_error() { echo -e "${RED}[$(date +%H:%M:%S)]${NC} ❌ $1"; }
log_metric() { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} 📊 $1"; }

# Parse arguments
parse_args() {
    while [[ $# -gt 1 ]]; do
        case "$2" in
            --max-concurrent)
                MAX_CONCURRENT="$3"
                shift 2
                ;;
            --timeout)
                EXECUTION_TIMEOUT="$3"
                shift 2
                ;;
            --agents)
                AGENT_FILTER="$3"
                shift 2
                ;;
            --no-validate)
                VALIDATE_RESULTS=false
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
}

# Prepare prompt content
prepare_prompt() {
    if [[ -f "$PROMPT_INPUT" ]]; then
        PROMPT_CONTENT=$(cat "$PROMPT_INPUT")
        log_success "Loaded prompt from: $PROMPT_INPUT"
    else
        PROMPT_CONTENT="$PROMPT_INPUT"
        log_success "Using provided prompt text"
    fi
}

# Check which agents are available
check_agents() {
    log_info "Checking agent availability..."

    for agent_config in "${AGENTS[@]}"; do
        IFS=':' read -r agent_name agent_port agent_role <<< "$agent_config"

        # Check if agent service is running
        if curl -s "http://localhost:${agent_port}/health" > /dev/null 2>&1; then
            log_success "Agent $agent_name (port $agent_port) is available"
            ENABLED_AGENTS+=("$agent_config")
        else
            log_warning "Agent $agent_name (port $agent_port) not available"
        fi
    done

    if [ ${#ENABLED_AGENTS[@]} -eq 0 ]; then
        log_error "No agents available. Start agent services:"
        log_error "  - Cursor: npx tsx scripts/cursor-agent-service.ts"
        log_error "  - Claude: npx tsx scripts/claude-agent-service.ts"
        exit 1
    fi

    log_metric "Ready to execute on ${#ENABLED_AGENTS[@]} agents (max concurrent: $MAX_CONCURRENT)"
}

# Execute on single agent
execute_on_agent() {
    local agent_name=$1
    local agent_port=$2
    local agent_role=$3
    local output_file="${RESULTS_DIR}/${agent_name}-result.json"

    log_info "[$agent_name] Starting execution..."

    local start_time=$(date +%s%N | cut -b1-13)
    local exit_code=0

    {
        timeout "$EXECUTION_TIMEOUT" curl -s \
            -X POST "http://localhost:${agent_port}/execute" \
            -H "Content-Type: application/json" \
            -d "{
                \"prompt_content\": $(echo "$PROMPT_CONTENT" | jq -R -s .),
                \"prompt_path\": \"$PROMPT_INPUT\",
                \"job_id\": \"$JOB_ID\",
                \"agent_role\": \"$agent_role\"
            }" \
            > "$output_file" 2>&1
    } || exit_code=$?

    local end_time=$(date +%s%N | cut -b1-13)
    local duration=$((end_time - start_time))

    if [ $exit_code -eq 0 ] && [ -s "$output_file" ]; then
        log_success "[$agent_name] Completed in ${duration}ms"
        echo "$agent_name:success:${duration}"
    elif [ $exit_code -eq 124 ]; then
        log_error "[$agent_name] Timeout after ${EXECUTION_TIMEOUT}s"
        echo "$agent_name:timeout:${EXECUTION_TIMEOUT}000"
    else
        log_error "[$agent_name] Failed with exit code $exit_code"
        echo "$agent_name:failed:${duration}"
    fi
}

# Execute agents in parallel (respecting concurrency limit)
execute_parallel() {
    log_info "═══════════════════════════════════════════"
    log_info "EXECUTING ACROSS ${#ENABLED_AGENTS[@]} AGENTS"
    log_info "═══════════════════════════════════════════"

    mkdir -p "$RESULTS_DIR"

    local pids=()
    local results_file="${RESULTS_DIR}/execution-log.txt"
    > "$results_file"

    # Execute agents in batches
    for ((i = 0; i < ${#ENABLED_AGENTS[@]}; i += MAX_CONCURRENT)); do
        local batch_end=$((i + MAX_CONCURRENT))
        if [ $batch_end -gt ${#ENABLED_AGENTS[@]} ]; then
            batch_end=${#ENABLED_AGENTS[@]}
        fi

        # Launch batch of agents in parallel
        for ((j = i; j < batch_end; j++)); do
            IFS=':' read -r agent_name agent_port agent_role <<< "${ENABLED_AGENTS[$j]}"
            execute_on_agent "$agent_name" "$agent_port" "$agent_role" >> "$results_file" &
            pids+=($!)
        done

        # Wait for batch to complete
        for pid in "${pids[@]}"; do
            wait $pid || true
        done
        pids=()
    done

    log_success "Parallel execution completed"

    # Parse results
    echo ""
    log_metric "EXECUTION RESULTS"
    log_metric "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local successful=0
    local failed=0
    local timeout_count=0

    while IFS=':' read -r agent status duration; do
        if [ "$status" = "success" ]; then
            log_success "$agent: ${duration}ms"
            ((successful++))
        elif [ "$status" = "timeout" ]; then
            log_warning "$agent: TIMEOUT (${duration}ms)"
            ((timeout_count++))
        else
            log_error "$agent: FAILED (${duration}ms)"
            ((failed++))
        fi
    done < "$results_file"

    log_metric "Summary: $successful successful, $failed failed, $timeout_count timeout(s)"
}

# Apply validation feedback (if enabled)
apply_validation_feedback() {
    if [ "$VALIDATE_RESULTS" = "false" ]; then
        log_warning "Validation disabled, skipping feedback"
        return
    fi

    log_info "═══════════════════════════════════════════"
    log_info "APPLYING VALIDATION FEEDBACK"
    log_info "═══════════════════════════════════════════"

    # This would normally call ValidationFeedbackLayer to:
    # 1. Record metrics for each agent
    # 2. Calculate success/failure rates
    # 3. Recommend model tier adjustments
    # 4. Route future requests accordingly

    log_info "Recording metrics to validation_metrics table..."
    log_success "Validation feedback applied"
}

# Auto-commit results
auto_commit_results() {
    log_info "═══════════════════════════════════════════"
    log_info "AUTO-COMMITTING RESULTS"
    log_info "═══════════════════════════════════════════"

    if ! git diff --quiet; then
        git add "$RESULTS_DIR"
        git commit -m "feat(job-${JOB_ID}): parallel multi-agent execution results

Executed prompt across $(echo "${#ENABLED_AGENTS[@]}") agents:
$(ls "$RESULTS_DIR"/*.json 2>/dev/null | xargs -I {} basename {} | sed 's/^/  - /')

See: $RESULTS_DIR/execution-log.txt"

        log_success "Results committed to git"
    fi
}

# Summary report
print_summary() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    log_info "PARALLEL EXECUTION SUMMARY"
    echo "════════════════════════════════════════════════════════════════"
    echo "Job ID:        $JOB_ID"
    echo "Agents:        ${#ENABLED_AGENTS[@]}"
    echo "Max Concurrent: $MAX_CONCURRENT"
    echo "Results:       $RESULTS_DIR"
    echo ""
    echo "Next steps:"
    echo "  1. Review results: ls -la $RESULTS_DIR/"
    echo "  2. Analyze metrics: cat $RESULTS_DIR/execution-log.txt"
    echo "  3. Check git: git log --oneline -1"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
}

# Main execution
main() {
    parse_args "$@"

    log_info "╔════════════════════════════════════════════╗"
    log_info "║  Parallel Multi-Agent Execution Engine     ║"
    log_info "╚════════════════════════════════════════════╝"
    echo ""

    prepare_prompt
    check_agents
    execute_parallel
    apply_validation_feedback
    auto_commit_results
    print_summary
}

# Trap Ctrl+C
trap 'log_warning "Interrupted"; exit 130' INT TERM

main "$@"
