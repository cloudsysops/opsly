#!/usr/bin/env bash

# MCP Orchestrator Deployment Script
# Deploys MCP Gateway + Agent Manager + supporting infrastructure
# This brings up a production-ready multi-agent orchestration system

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/infra/docker-compose.mcp.yml"

# Environment file
ENV_FILE="$PROJECT_ROOT/.env.mcp"

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Step 1: Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."
  
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
  fi
  
  if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed"
    exit 1
  fi
  
  if ! command -v git &> /dev/null; then
    log_error "Git is not installed"
    exit 1
  fi
  
  log_success "All prerequisites installed"
}

# Step 2: Create environment file
create_env_file() {
  log_info "Creating environment file..."
  
  if [ -f "$ENV_FILE" ]; then
    log_warn "Environment file already exists, skipping"
    return
  fi
  
  cat > "$ENV_FILE" << 'EOF'
# MCP Gateway Configuration
NODE_ENV=production
PORT=3001

# Database
DB_USER=opsly_mcp
DB_PASSWORD=changeme_in_production
DATABASE_URL=postgresql://opsly_mcp:changeme_in_production@postgres:5432/opsly_mcp

# Redis
REDIS_URL=redis://redis:6379/0

# Discord Notifications
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# GitHub Integration
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPO=cloudsysops/opsly

# Logging
LOG_LEVEL=info
EOF

  log_warn "Environment file created at $ENV_FILE"
  log_warn "⚠️  IMPORTANT: Update .env.mcp with your actual credentials before deploying to production"
}

# Step 3: Build Docker images
build_images() {
  log_info "Building Docker images..."
  
  docker-compose -f "$COMPOSE_FILE" build --no-cache
  
  log_success "Docker images built successfully"
}

# Step 4: Start services
start_services() {
  log_info "Starting MCP services..."
  
  docker-compose -f "$COMPOSE_FILE" up -d
  
  log_success "Services started"
}

# Step 5: Wait for services to be healthy
wait_for_services() {
  log_info "Waiting for services to become healthy..."
  
  local max_attempts=30
  local attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    if docker-compose -f "$COMPOSE_FILE" exec -T mcp-gateway wget --quiet --tries=1 --spider http://localhost:3001/health 2>/dev/null; then
      log_success "MCP Gateway is healthy"
      break
    fi
    
    log_info "Waiting for MCP Gateway... ($((attempt + 1))/$max_attempts)"
    sleep 2
    ((attempt++))
  done
  
  if [ $attempt -eq $max_attempts ]; then
    log_error "Services did not become healthy in time"
    docker-compose -f "$COMPOSE_FILE" logs mcp-gateway
    exit 1
  fi
}

# Step 6: Initialize database
initialize_database() {
  log_info "Initializing database..."
  
  docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U opsly_mcp -d opsly_mcp << 'EOF'
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  agent_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tool_tier TEXT,
  operation_type TEXT,
  status TEXT,
  params JSONB,
  result JSONB,
  error_message TEXT,
  approver TEXT,
  reason TEXT,
  context TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_agent_id ON audit_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_type ON audit_logs(operation_type);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  agent_id TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT,
  model TEXT,
  prompt_file TEXT,
  allowed_tools TEXT[],
  blocked_tools TEXT[],
  auto_approve TEXT[]
);

INSERT INTO agents (id, agent_id, name, role, model, prompt_file, allowed_tools)
VALUES 
  ('arch1', 'architect', 'Architect Agent', 'architect', 'claude-3-5-sonnet', 'prompts/architect.md', ARRAY['github.read_file', 'github.list_files', 'filesystem.read_file']),
  ('dev1', 'developer', 'Developer Agent', 'developer', 'claude-3-5-sonnet', 'prompts/developer.md', ARRAY['github.read_file', 'github.write_file', 'filesystem.read_file', 'filesystem.write_file']),
  ('qa1', 'qa', 'QA Agent', 'qa', 'claude-3-5-sonnet', 'prompts/qa.md', ARRAY['github.read_file', 'filesystem.read_file']),
  ('sec1', 'security', 'Security Agent', 'security', 'claude-3-5-sonnet', 'prompts/security.md', ARRAY['github.read_file']),
  ('docs1', 'docs', 'Docs Agent', 'docs', 'claude-3-5-sonnet', 'prompts/docs.md', ARRAY['github.read_file', 'github.write_file', 'filesystem.read_file', 'filesystem.write_file'])
ON CONFLICT DO NOTHING;
EOF

  log_success "Database initialized"
}

# Step 7: Print status
print_status() {
  log_info "MCP Orchestrator Status:"
  
  docker-compose -f "$COMPOSE_FILE" ps
  
  echo ""
  log_success "MCP Gateway running on http://localhost:3001"
  log_success "Agent Manager running on http://localhost:3002"
  log_success "PostgreSQL running on localhost:5433"
  log_success "Redis running on localhost:6380"
  
  echo ""
  log_info "Health Checks:"
  curl -s http://localhost:3001/health | jq '.'
  echo ""
}

# Step 8: Show next steps
show_next_steps() {
  cat << 'EOF'

╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║        🚀 MCP ORCHESTRATOR DEPLOYED SUCCESSFULLY 🚀            ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝

Next Steps:

1. Configure Discord webhook:
   Edit .env.mcp and add your Discord webhook URL

2. Configure GitHub token:
   Edit .env.mcp and add your GitHub token

3. Test the system:
   curl -X POST http://localhost:3001/mcp/call \
     -H "Content-Type: application/json" \
     -d '{
       "agent_id": "developer",
       "tool_name": "github.list_files",
       "tool_tier": "READ",
       "params": {"repo": "opsly"}
     }'

4. Queue a task:
   curl -X POST http://localhost:3002/tasks/queue \
     -H "Content-Type: application/json" \
     -d '{
       "agent_id": "developer",
       "type": "implement",
       "description": "Implement feature X",
       "priority": "high"
     }'

5. View audit logs:
   curl http://localhost:3001/audit-logs | jq '.'

6. Check agent stats:
   curl http://localhost:3002/agents/developer/stats

Logs:
  docker-compose -f infra/docker-compose.mcp.yml logs -f mcp-gateway

Stop services:
  docker-compose -f infra/docker-compose.mcp.yml down

For documentation, see: docs/IMPLEMENTATION-MCP-AGENTS.md

EOF
}

# Main flow
main() {
  log_info "Starting MCP Orchestrator Deployment..."
  echo ""
  
  check_prerequisites
  create_env_file
  build_images
  start_services
  wait_for_services
  initialize_database
  print_status
  show_next_steps
  
  log_success "Deployment complete!"
}

main "$@"
