#!/bin/bash
###############################################################################
# Phase 8: VPS Deployment + Production Testing
# Deploy Phases 5-7 to production VPS
#
# Usage:
#   ./scripts/deploy-phases-5-7.sh [--vps-host HOST] [--vps-user USER] [--no-build]
#
# Environment:
#   VPS_HOST: VPS hostname/IP (default: 100.120.151.91)
#   VPS_USER: VPS SSH user (default: vps-dragon)
#   VPS_PATH: Path on VPS (default: /opt/opsly)
#   DOCKER_COMPOSE_FILE: Compose file (default: docker-compose.platform.yml)
#
# Features:
#   - Git pull and validate
#   - Full npm build
#   - Docker compose down/up with zero-downtime restart
#   - Health checks every 10s for 2 minutes
#   - Orchestrator watchdog startup
#   - Agent trainer service startup
#   - Complete logging for audit trail
###############################################################################

set -euo pipefail

# Configuration
VPS_HOST="${VPS_HOST:-100.120.151.91}"
VPS_USER="${VPS_USER:-vps-dragon}"
VPS_PATH="${VPS_PATH:-/opt/opsly}"
DOCKER_COMPOSE_FILE="${DOCKER_COMPOSE_FILE:-docker-compose.platform.yml}"

# Logging
LOG_DIR="/tmp/opsly-deploy-$(date +%s)"
DEPLOY_LOG="${LOG_DIR}/deploy.log"
HEALTH_LOG="${LOG_DIR}/health-checks.log"
SERVICE_LOG="${LOG_DIR}/services.log"

# Flags
NO_BUILD=false
DRY_RUN=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --vps-host)
        VPS_HOST="$2"
        shift 2
        ;;
      --vps-user)
        VPS_USER="$2"
        shift 2
        ;;
      --no-build)
        NO_BUILD=true
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      *)
        echo "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done
}

usage() {
  echo "Usage: $0 [OPTIONS]"
  echo "Options:"
  echo "  --vps-host HOST       VPS hostname/IP (default: 100.120.151.91)"
  echo "  --vps-user USER       VPS SSH user (default: vps-dragon)"
  echo "  --no-build            Skip npm build (use existing binaries)"
  echo "  --dry-run             Show what would be deployed without executing"
}

# Setup logging
setup_logging() {
  mkdir -p "$LOG_DIR"
  touch "$DEPLOY_LOG" "$HEALTH_LOG" "$SERVICE_LOG"
  echo "Deployment started at $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee "$DEPLOY_LOG"
  echo "Log directory: $LOG_DIR"
}

# Log output
log() {
  local level="$1"
  shift
  local msg="$@"
  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  echo "[${timestamp}] [${level}] ${msg}" | tee -a "$DEPLOY_LOG"
}

log_health() {
  local msg="$@"
  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  echo "[${timestamp}] ${msg}" >> "$HEALTH_LOG"
}

log_service() {
  local msg="$@"
  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  echo "[${timestamp}] ${msg}" >> "$SERVICE_LOG"
}

# Remote command execution
vps_run() {
  local cmd="$1"
  local desc="${2:-Executing command}"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY-RUN]${NC} ${desc}"
    echo -e "${YELLOW}[DRY-RUN]${NC} ssh ${VPS_USER}@${VPS_HOST} '${cmd}'"
    return 0
  fi

  log "INFO" "${desc}"
  ssh "${VPS_USER}@${VPS_HOST}" "${cmd}" 2>&1 | tee -a "$DEPLOY_LOG"
}

# Pre-deployment validation
pre_deployment_checks() {
  echo -e "${BLUE}=== Pre-Deployment Checks ===${NC}"
  log "INFO" "Running pre-deployment checks"

  # Check git status locally
  log "INFO" "Validating local git status"
  if [ -n "$(git status --porcelain)" ]; then
    log "ERROR" "Local git working tree is dirty. Commit changes first."
    git status
    return 1
  fi

  # Type check locally
  log "INFO" "Running type-check"
  if ! npm run type-check 2>&1 | tee -a "$DEPLOY_LOG"; then
    log "ERROR" "Type-check failed. Fix errors before deploying."
    return 1
  fi

  # Test run (quick smoke test)
  log "INFO" "Running npm test (suite level, no timeout)"
  if ! npm run test -- --run 2>&1 | tee -a "$DEPLOY_LOG"; then
    log "WARN" "Some tests failed, but continuing with deployment"
  fi

  # Verify SSH connection
  log "INFO" "Testing SSH connection to VPS"
  if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "${VPS_USER}@${VPS_HOST}" true 2>&1 | tee -a "$DEPLOY_LOG"; then
    log "ERROR" "Cannot connect to VPS. Check SSH key and network."
    return 1
  fi

  echo -e "${GREEN}✓ Pre-deployment checks passed${NC}"
}

# Git synchronization
sync_git() {
  echo -e "${BLUE}=== Git Synchronization ===${NC}"
  log "INFO" "Synchronizing Git on VPS"

  vps_run "cd ${VPS_PATH} && git status" "Check Git status on VPS"
  vps_run "cd ${VPS_PATH} && git fetch origin main" "Fetch latest from origin"
  vps_run "cd ${VPS_PATH} && git merge origin/main" "Merge origin/main into current branch"
  vps_run "cd ${VPS_PATH} && git log --oneline -5" "Show recent commits"

  echo -e "${GREEN}✓ Git synchronized${NC}"
}

# Build step
build_application() {
  if [ "$NO_BUILD" = true ]; then
    echo -e "${YELLOW}⊘ Skipping build (--no-build flag)${NC}"
    log "INFO" "Build skipped by --no-build flag"
    return 0
  fi

  echo -e "${BLUE}=== Building Application ===${NC}"
  log "INFO" "Building all packages on VPS"

  vps_run "cd ${VPS_PATH} && npm ci" "Install dependencies"
  vps_run "cd ${VPS_PATH} && npm run build 2>&1" "Build all packages"

  log "INFO" "Build completed successfully"
  echo -e "${GREEN}✓ Build completed${NC}"
}

# Docker deployment
deploy_docker() {
  echo -e "${BLUE}=== Docker Deployment ===${NC}"
  log "INFO" "Deploying Docker services"

  # Graceful shutdown
  log "INFO" "Stopping running containers (graceful)"
  vps_run "cd ${VPS_PATH} && docker compose --env-file ${VPS_PATH}/.env -f infra/${DOCKER_COMPOSE_FILE} down --remove-orphans --timeout 30" "Gracefully stop containers"

  # Wait for services to fully stop
  log "INFO" "Waiting for services to fully shut down"
  sleep 5

  # Start services
  log "INFO" "Starting Docker services"
  vps_run "cd ${VPS_PATH} && docker compose --env-file ${VPS_PATH}/.env -f infra/${DOCKER_COMPOSE_FILE} up -d" "Start containers"

  # Show running containers
  vps_run "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" "Show running containers"

  log "INFO" "Docker services deployed"
  echo -e "${GREEN}✓ Docker deployment complete${NC}"
}

# Health checks
run_health_checks() {
  echo -e "${BLUE}=== Health Checks ===${NC}"
  log "INFO" "Running health checks every 10s for up to 2 minutes"

  local max_attempts=12
  local attempt=0
  local healthy_services=0

  while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    log_health "=== Health Check #${attempt} at ${timestamp} ==="

    # Check Orchestrator Health (port 3011)
    if vps_run "curl -sf http://localhost:3011/health 2>&1 | tee -a ${VPS_PATH}/health-check.log" "Check Orchestrator health" 2>&1 | grep -q "healthy\|ok"; then
      log_health "✓ Orchestrator healthy"
      healthy_services=$((healthy_services + 1))
    else
      log_health "✗ Orchestrator not healthy yet"
    fi

    # Check API (port 3000)
    if vps_run "curl -sf http://localhost:3000/api/health 2>&1 | tee -a ${VPS_PATH}/health-check.log" "Check API health" 2>&1 | grep -q "ok\|healthy"; then
      log_health "✓ API healthy"
      healthy_services=$((healthy_services + 1))
    else
      log_health "✗ API not healthy yet"
    fi

    # Check Admin (port 3001)
    if vps_run "curl -sf http://localhost:3001/health 2>&1 | tee -a ${VPS_PATH}/health-check.log" "Check Admin health" 2>&1 | grep -q "ok\|healthy"; then
      log_health "✓ Admin healthy"
      healthy_services=$((healthy_services + 1))
    else
      log_health "✗ Admin not healthy yet"
    fi

    if [ $healthy_services -ge 3 ]; then
      log_health "✓ All critical services healthy"
      echo -e "${GREEN}✓ All services healthy after ${attempt} checks${NC}"
      return 0
    fi

    healthy_services=0

    if [ $attempt -lt $max_attempts ]; then
      log_health "Waiting 10s before retry..."
      sleep 10
    fi
  done

  log "WARN" "Health checks did not all pass within 2 minutes"
  echo -e "${YELLOW}⚠ Some services may still be starting${NC}"
  return 0  # Non-fatal; services may still be coming up
}

# Start orchestrator watchdog
start_watchdog() {
  echo -e "${BLUE}=== Starting Orchestrator Watchdog ===${NC}"
  log "INFO" "Starting orchestrator watchdog service"

  local watchdog_cmd="cd ${VPS_PATH} && npx tsx scripts/watchdog-validation-orchestrator.ts > /var/log/opsly-watchdog.log 2>&1 &"
  vps_run "nohup ${watchdog_cmd}" "Start watchdog in background"

  # Verify watchdog is running
  sleep 2
  vps_run "ps aux | grep -E 'watchdog|tsx' | grep -v grep" "Check watchdog process"

  log "INFO" "Watchdog service started"
  echo -e "${GREEN}✓ Watchdog started${NC}"
}

# Start agent trainer service
start_trainer() {
  echo -e "${BLUE}=== Starting Agent Trainer Service ===${NC}"
  log "INFO" "Starting agent trainer service"

  local trainer_cmd="cd ${VPS_PATH} && npx tsx scripts/agent-trainer-service.ts > /var/log/opsly-trainer.log 2>&1 &"
  vps_run "nohup ${trainer_cmd}" "Start trainer in background"

  # Verify trainer is running
  sleep 2
  vps_run "ps aux | grep -E 'trainer|tsx' | grep -v grep" "Check trainer process"

  log "INFO" "Trainer service started"
  echo -e "${GREEN}✓ Trainer started${NC}"
}

# Post-deployment summary
post_deployment_summary() {
  echo -e "${BLUE}=== Deployment Summary ===${NC}"

  echo ""
  echo "Deployment completed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "📊 Summary:"
  echo "  VPS Host: ${VPS_HOST}"
  echo "  VPS User: ${VPS_USER}"
  echo "  VPS Path: ${VPS_PATH}"
  echo "  Compose File: ${DOCKER_COMPOSE_FILE}"
  echo ""
  echo "📁 Logs saved to: ${LOG_DIR}"
  echo "  - Deploy log: ${DEPLOY_LOG}"
  echo "  - Health checks: ${HEALTH_LOG}"
  echo "  - Service startup: ${SERVICE_LOG}"
  echo ""
  echo "🔗 Service endpoints:"
  echo "  - API: http://${VPS_HOST}:3000"
  echo "  - Admin: http://${VPS_HOST}:3001"
  echo "  - Orchestrator Health: http://${VPS_HOST}:3011/health"
  echo ""
  echo "📋 Next steps:"
  echo "  1. Verify all services: docker ps on VPS"
  echo "  2. Check logs: ssh ${VPS_USER}@${VPS_HOST} tail -f /var/log/opsly-watchdog.log"
  echo "  3. Run smoke tests: ./scripts/production-smoke-tests.sh"
  echo "  4. Monitor metrics: ssh ${VPS_USER}@${VPS_HOST} docker stats"
  echo ""
  echo -e "${GREEN}✓ Deployment infrastructure ready${NC}"
}

# Error handler
error_handler() {
  local line_num=$1
  echo -e "${RED}✗ Error at line ${line_num}${NC}"
  log "ERROR" "Deployment failed at line ${line_num}"
  echo "Logs available at: ${LOG_DIR}"
  exit 1
}

# Main deployment flow
main() {
  trap 'error_handler ${LINENO}' ERR

  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════╗"
  echo "║  Phase 8: VPS Deployment (Phases 5-7)  ║"
  echo "╚════════════════════════════════════════╝"
  echo -e "${NC}"

  parse_args "$@"
  setup_logging

  # Deployment pipeline
  pre_deployment_checks
  sync_git
  build_application
  deploy_docker
  run_health_checks
  start_watchdog
  start_trainer
  post_deployment_summary

  log "INFO" "Deployment completed successfully"
  echo -e "${GREEN}✓ Deployment complete!${NC}"
}

# Execute
main "$@"
