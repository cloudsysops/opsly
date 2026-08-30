#!/usr/bin/env bash

# Hermes MCP Orchestrator CLI
# Interact with MCP Gateway and Agent Manager

set -euo pipefail

# Configuration
MCP_GATEWAY_URL="${MCP_GATEWAY_URL:-http://localhost:3001}"
AGENT_MANAGER_URL="${AGENT_MANAGER_URL:-http://localhost:3002}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Check if service is running
check_service() {
  local url=$1
  local name=$2
  
  if curl -s "$url/health" > /dev/null 2>&1; then
    log_success "$name is running"
    return 0
  else
    log_error "$name is not running"
    return 1
  fi
}

# Queue a task
queue_task() {
  local agent_id=$1
  local task_type=$2
  local description=$3
  local priority=${4:-medium}
  
  log_info "Queueing task for $agent_id..."
  
  local response=$(curl -s -X POST "$AGENT_MANAGER_URL/tasks/queue" \
    -H "Content-Type: application/json" \
    -d "{
      \"agent_id\": \"$agent_id\",
      \"type\": \"$task_type\",
      \"description\": \"$description\",
      \"priority\": \"$priority\"
    }")
  
  echo "$response" | jq '.'
}

# Get next task
get_next_task() {
  local agent_id=$1
  
  log_info "Getting next task for $agent_id..."
  
  local response=$(curl -s "$AGENT_MANAGER_URL/tasks/next/$agent_id")
  
  echo "$response" | jq '.'
}

# Complete task
complete_task() {
  local agent_id=$1
  local task_id=$2
  local result=$3
  
  log_info "Marking task $task_id as completed..."
  
  local response=$(curl -s -X POST "$AGENT_MANAGER_URL/tasks/complete" \
    -H "Content-Type: application/json" \
    -d "{
      \"agent_id\": \"$agent_id\",
      \"task_id\": \"$task_id\",
      \"result\": $result
    }")
  
  echo "$response" | jq '.'
}

# Call MCP tool
call_tool() {
  local agent_id=$1
  local tool_name=$2
  local tool_tier=$3
  local params=$4
  
  log_info "Calling tool: $tool_name for agent: $agent_id..."
  
  local response=$(curl -s -X POST "$MCP_GATEWAY_URL/mcp/call" \
    -H "Content-Type: application/json" \
    -d "{
      \"agent_id\": \"$agent_id\",
      \"tool_name\": \"$tool_name\",
      \"tool_tier\": \"$tool_tier\",
      \"params\": $params
    }")
  
  echo "$response" | jq '.'
}

# Get audit logs
audit_logs() {
  local agent_id=${1:-}
  
  log_info "Fetching audit logs..."
  
  local url="$MCP_GATEWAY_URL/audit-logs"
  
  if [ -n "$agent_id" ]; then
    url="$url?agent_id=$agent_id"
  fi
  
  curl -s "$url" | jq '.'
}

# Get agent stats
agent_stats() {
  local agent_id=$1
  
  log_info "Getting stats for agent: $agent_id..."
  
  curl -s "$AGENT_MANAGER_URL/agents/$agent_id/stats" | jq '.'
}

# List all tasks
list_tasks() {
  log_info "Listing all tasks..."
  
  curl -s "$AGENT_MANAGER_URL/tasks" | jq '.'
}

# Print usage
usage() {
  cat << 'EOF'

╔═════════════════════════════════════════════════════════════════╗
║                   MCP ORCHESTRATOR CLI                         ║
╚═════════════════════════════════════════════════════════════════╝

Usage: hermes-mcp [command] [options]

Commands:

  status                              Check if services are running
  
  task queue <agent> <type> <desc>    Queue a task
  task next <agent>                   Get next task for agent
  task complete <agent> <id> <result> Mark task as completed
  task list                           List all tasks
  
  tool call <agent> <tool> <tier>     Call a tool (READ/WRITE/SHELL)
           [params]                   
  
  logs [agent]                        View audit logs (optionally filtered by agent)
  stats <agent>                       Get agent statistics
  
  help                                Show this help message

Environment Variables:

  MCP_GATEWAY_URL       URL of MCP Gateway (default: http://localhost:3001)
  AGENT_MANAGER_URL     URL of Agent Manager (default: http://localhost:3002)

Examples:

  # Check if services are running
  hermes-mcp status

  # Queue a task
  hermes-mcp task queue developer implement "Add authentication" high

  # Call a READ tool (no approval needed)
  hermes-mcp tool call architect github.read_file READ '{"path": "package.json"}'

  # View audit logs
  hermes-mcp logs developer

  # Get agent statistics
  hermes-mcp stats developer

Agents:

  - architect   (design decisions, code review)
  - developer   (feature implementation, bugfixes)
  - qa          (testing, validation)
  - security    (vulnerability scanning)
  - docs        (documentation management)

EOF
}

# Main
main() {
  if [ $# -eq 0 ]; then
    usage
    exit 0
  fi
  
  local command=$1
  shift
  
  case "$command" in
    status)
      check_service "$MCP_GATEWAY_URL" "MCP Gateway"
      check_service "$AGENT_MANAGER_URL" "Agent Manager"
      ;;
    
    task)
      local subcommand=$1
      shift
      case "$subcommand" in
        queue)
          queue_task "$@"
          ;;
        next)
          get_next_task "$@"
          ;;
        complete)
          complete_task "$@"
          ;;
        list)
          list_tasks
          ;;
        *)
          log_error "Unknown task subcommand: $subcommand"
          exit 1
          ;;
      esac
      ;;
    
    tool)
      local subcommand=$1
      shift
      case "$subcommand" in
        call)
          call_tool "$@"
          ;;
        *)
          log_error "Unknown tool subcommand: $subcommand"
          exit 1
          ;;
      esac
      ;;
    
    logs)
      audit_logs "$@"
      ;;
    
    stats)
      agent_stats "$@"
      ;;
    
    help)
      usage
      ;;
    
    *)
      log_error "Unknown command: $command"
      usage
      exit 1
      ;;
  esac
}

main "$@"
