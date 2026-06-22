#!/bin/bash
set -euo pipefail

###############################################################################
# Peskids Orchestrator — Unified Operations Script
#
# Consolidates 29+ individual scripts into single CLI
# Usage: ./scripts/peskids-orchestrator.sh --task <task> [--env prd|staging]
#
# Tasks:
#   validate-vps      - SSH health check on VPS
#   deploy-vps        - Full deploy to VPS
#   rebuild-vps       - Rebuild API from source
#   setup-n8n         - Configure N8N workflows
#   setup-uptime      - Configure Uptime Kuma
#   smoke-test        - Run production smoke tests
#   health-check      - Check all endpoints
#   seed-demo         - Seed demo data
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
ENV="${ENV:-prd}"
TASK="${TASK:-help}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

###############################################################################
# VALIDATION — VPS SSH Health Check
###############################################################################
validate_vps() {
  local vps_host="${VPS_HOST:-100.120.151.91}"
  local vps_user="${VPS_USER:-root}"

  log_info "Validating VPS at $vps_user@$vps_host..."

  # Check SSH connectivity
  if ! ssh -q "$vps_user@$vps_host" "echo 'SSH OK'" 2>/dev/null; then
    log_error "SSH connection failed. Check:"
    echo "  - Tailscale status: \`tailscale status\`"
    echo "  - SSH key configured: \`ssh-keygen -l -f ~/.ssh/id_rsa\`"
    echo "  - VPS_HOST and VPS_USER environment variables"
    return 1
  fi
  log_success "SSH connectivity OK"

  # Check Docker
  if ! ssh -q "$vps_user@$vps_host" "docker --version" 2>/dev/null; then
    log_warn "Docker not found on VPS"
    return 1
  fi
  log_success "Docker available"

  # Check Opsly runtime
  if ! ssh -q "$vps_user@$vps_host" "test -d /opt/opsly && echo 'Opsly dir exists'" 2>/dev/null; then
    log_warn "Opsly directory not found at /opt/opsly"
    return 1
  fi
  log_success "Opsly directory exists"

  # Check running services
  log_info "Running services:"
  ssh "$vps_user@$vps_host" "docker ps --format 'table {{.Names}}\t{{.Status}}'" 2>/dev/null || log_warn "Could not list Docker containers"

  # Check API health
  log_info "Checking API health..."
  API_URL="${API_URL:-https://api.op-sly.com}"
  if curl -s "$API_URL/api/health" | grep -q '"status":"ok"'; then
    log_success "API health check passed"
  else
    log_warn "API health check failed or unreachable at $API_URL"
  fi

  # Check Peskids endpoint
  log_info "Checking Peskids health..."
  PESKIDS_HEALTH=$(curl -s "$API_URL/api/portal/health?slug=peskids" || echo "{}")
  if echo "$PESKIDS_HEALTH" | grep -q "n8n_peskids\|uptime_peskids"; then
    log_success "Peskids health endpoints configured"
  else
    log_warn "Peskids health endpoint not responding as expected"
  fi
}

###############################################################################
# DEPLOY — Full VPS Deployment
###############################################################################
deploy_vps() {
  local vps_host="${VPS_HOST:-100.120.151.91}"
  local vps_user="${VPS_USER:-root}"

  log_info "Starting VPS deployment to $vps_user@$vps_host..."

  # First validate
  if ! validate_vps; then
    log_error "VPS validation failed. Cannot proceed with deployment."
    return 1
  fi

  log_info "Pulling latest code..."
  ssh "$vps_user@$vps_host" "cd /opt/opsly && git pull --ff-only origin main" || log_warn "Git pull failed"

  log_info "Building API image..."
  ssh "$vps_user@$vps_host" "cd /opt/opsly && docker build -f apps/api/Dockerfile -t intcloudsysops-api:peskids-latest ." || log_error "Docker build failed"

  log_info "Restarting services..."
  ssh "$vps_user@$vps_host" "cd /opt/opsly && docker-compose restart app" || log_error "Service restart failed"

  log_info "Waiting for services to stabilize (15s)..."
  sleep 15

  log_success "Deployment complete. Running smoke tests..."
  smoke_test
}

###############################################################################
# REBUILD VPS — Full rebuild from source
###############################################################################
rebuild_vps() {
  local vps_host="${VPS_HOST:-100.120.151.91}"
  local vps_user="${VPS_USER:-root}"

  log_warn "REBUILD will restart all services. Continue? (y/N)"
  read -r confirm
  if [[ "$confirm" != "y" ]]; then
    log_info "Cancelled."
    return 0
  fi

  log_info "Rebuilding VPS..."
  ssh "$vps_user@$vps_host" "cd /opt/opsly && docker-compose down && git pull --ff-only && docker-compose up -d" || log_error "Rebuild failed"

  log_success "Rebuild complete"
  sleep 30
  validate_vps
}

###############################################################################
# SETUP N8N — Configure workflows
###############################################################################
setup_n8n() {
  log_info "Setting up N8N for Peskids..."

  # This requires manual workflow creation or API calls
  # For now, provide instructions
  echo ""
  echo "=== N8N Workflow Setup (Manual Steps) ==="
  echo ""
  echo "1. Access N8N at: https://n8n-peskids.op-sly.com"
  echo "2. Log in with credentials from Doppler (ops-intcloudsysops / prd)"
  echo "3. Create workflows:"
  echo "   - Lead Capture: Webhook → Supabase INSERT"
  echo "   - Hot Lead Alert: Supabase → Discord notification"
  echo "   - WhatsApp Integration: Jelou webhook → Supabase"
  echo ""
  echo "See docs/tenants/peskids/N8N-WORKFLOWS-GUIDE.md for details"
  echo ""
}

###############################################################################
# SETUP UPTIME — Configure monitoring
###############################################################################
setup_uptime() {
  log_info "Setting up Uptime Kuma for Peskids..."

  local vps_host="${VPS_HOST:-100.120.151.91}"
  local vps_user="${VPS_USER:-root}"

  log_info "Running bootstrap script..."
  ssh "$vps_user@$vps_host" "cd /opt/opsly && bash scripts/peskids-uptime-kuma-bootstrap.sh" || log_warn "Uptime bootstrap script failed or not found"

  log_info "Uptime Kuma available at: https://uptime-peskids.op-sly.com"
}

###############################################################################
# SMOKE TESTS — Production validation
###############################################################################
smoke_test() {
  log_info "Running smoke tests..."

  local base_url="${API_URL:-https://api.op-sly.com}"
  local failures=0

  # Test: API health
  if curl -s "$base_url/api/health" | grep -q '"status":"ok"'; then
    log_success "API health OK"
  else
    log_error "API health failed"
    ((failures++))
  fi

  # Test: Landing page
  if curl -s "https://peskids.op-sly.com" | grep -q "peskids\|Peskids"; then
    log_success "Landing page OK"
  else
    log_error "Landing page failed"
    ((failures++))
  fi

  # Test: Admin auth
  log_info "Admin auth (requires credentials, skipped in automated test)"

  # Test: Portal health
  if curl -s "$base_url/api/portal/health?slug=peskids" | jq . >/dev/null 2>&1; then
    log_success "Portal health endpoint OK"
  else
    log_error "Portal health endpoint failed"
    ((failures++))
  fi

  if [ $failures -eq 0 ]; then
    log_success "All smoke tests passed"
  else
    log_error "$failures smoke tests failed"
    return 1
  fi
}

###############################################################################
# HEALTH CHECK — All endpoints
###############################################################################
health_check() {
  log_info "Running comprehensive health checks..."

  local base_url="${API_URL:-https://api.op-sly.com}"

  echo ""
  echo "=== API Endpoints ==="
  log_info "GET $base_url/api/health"
  curl -s "$base_url/api/health" | jq . || echo "FAILED"

  echo ""
  echo "=== Peskids Portal ==="
  log_info "GET https://peskids.op-sly.com"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" "https://peskids.op-sly.com"

  echo ""
  echo "=== Monitoring ==="
  log_info "GET https://n8n-peskids.op-sly.com"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" "https://n8n-peskids.op-sly.com"

  log_info "GET https://uptime-peskids.op-sly.com"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" "https://uptime-peskids.op-sly.com"

  echo ""
  log_success "Health check complete"
}

###############################################################################
# SEED DEMO — Database seeding
###############################################################################
seed_demo() {
  log_info "Seeding demo data..."

  log_info "Running seed scripts..."
  bash "$SCRIPT_DIR/seed-peskids-demo-class.sh" || log_warn "Demo class seed failed"
  bash "$SCRIPT_DIR/seed-peskids-pools.sh" || log_warn "Pools seed failed"

  log_success "Demo data seeded"
}

###############################################################################
# HELP
###############################################################################
show_help() {
  cat <<EOF
Usage: $0 --task <task> [--env prd|staging]

Tasks:
  validate-vps      SSH health check + service status
  deploy-vps        Full deploy to VPS (validate → pull → build → restart)
  rebuild-vps       Full rebuild from source (careful!)
  setup-n8n         Configure N8N workflows (manual + guide)
  setup-uptime      Configure Uptime Kuma monitoring
  smoke-test        Run production smoke tests
  health-check      Comprehensive endpoint checks
  seed-demo         Seed demo data
  help              Show this message

Environment Variables:
  VPS_HOST          VPS IP/hostname (default: 100.120.151.91)
  VPS_USER          VPS username (default: root)
  API_URL           API base URL (default: https://api.op-sly.com)
  ENV               Environment: prd or staging (default: prd)

Examples:
  # Validate VPS before deploy
  ./scripts/peskids-orchestrator.sh --task validate-vps

  # Deploy to production
  ./scripts/peskids-orchestrator.sh --task deploy-vps --env prd

  # Check health after deploy
  ./scripts/peskids-orchestrator.sh --task health-check

EOF
}

###############################################################################
# MAIN
###############################################################################
main() {
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --task)
        TASK="$2"
        shift 2
        ;;
      --env)
        ENV="$2"
        shift 2
        ;;
      *)
        log_error "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done

  # Execute task
  case "$TASK" in
    validate-vps)
      validate_vps
      ;;
    deploy-vps)
      deploy_vps
      ;;
    rebuild-vps)
      rebuild_vps
      ;;
    setup-n8n)
      setup_n8n
      ;;
    setup-uptime)
      setup_uptime
      ;;
    smoke-test)
      smoke_test
      ;;
    health-check)
      health_check
      ;;
    seed-demo)
      seed_demo
      ;;
    help|--help|-h)
      show_help
      exit 0
      ;;
    *)
      log_error "Unknown task: $TASK"
      show_help
      exit 1
      ;;
  esac
}

main "$@"
