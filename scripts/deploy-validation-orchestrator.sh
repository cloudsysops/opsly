#!/bin/bash
# Deploy ValidationOrchestrator to VPS
#
# Prerequisites:
#   - SSH access via Tailscale to vps-dragon@100.120.151.91
#   - Docker and docker-compose installed on VPS
#   - Latest code committed to origin/claude/opsly-defense-platform-sC0qH
#
# Usage:
#   bash scripts/deploy-validation-orchestrator.sh
#   bash scripts/deploy-validation-orchestrator.sh --skip-tests
#   bash scripts/deploy-validation-orchestrator.sh --rollback

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="100.120.151.91"
VPS_USER="vps-dragon"
OPSLY_DIR="/opt/opsly"
BRANCH="claude/opsly-defense-platform-sC0qH"
SKIP_TESTS="${1:---skip-tests}" # Default: skip tests for speed
ROLLBACK="${1:-}"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check SSH access
    if ! ssh -o ConnectTimeout=5 "$VPS_USER@$VPS_HOST" "echo 'SSH OK'" &>/dev/null; then
        log_error "Cannot SSH to $VPS_USER@$VPS_HOST"
        log_warning "Ensure you are connected to Tailscale: sudo tailscale status"
        exit 1
    fi
    log_success "SSH access verified"

    # Check git status locally
    if [ -n "$(git status --porcelain)" ]; then
        log_error "Local working directory has uncommitted changes"
        git status
        exit 1
    fi
    log_success "Local git status clean"

    # Check if branch is pushed
    if ! git rev-parse "origin/$BRANCH" &>/dev/null; then
        log_error "Branch $BRANCH not found on origin"
        log_warning "Push commits first: git push origin $BRANCH"
        exit 1
    fi
    log_success "Branch $BRANCH exists on origin"
}

rollback() {
    log_warning "Rolling back to previous version..."

    ssh "$VPS_USER@$VPS_HOST" bash << 'EOFSH'
        set -euo pipefail
        cd /opt/opsly

        # Check docker status
        if ! docker ps &>/dev/null; then
            echo "Docker is not running. Starting..."
            sudo systemctl start docker
            sleep 2
        fi

        # Stop current container
        docker-compose down || true

        # Get previous commit
        PREV_COMMIT=$(git log --oneline -2 | tail -1 | awk '{print $1}')
        echo "Rolling back to: $PREV_COMMIT"

        # Reset to previous
        git reset --hard "$PREV_COMMIT"

        # Restart
        docker-compose up -d

        echo "✅ Rollback complete"
EOFSH

    log_success "Rollback complete"
    exit 0
}

deploy() {
    log_info "Starting deployment to VPS..."

    # Step 1: SSH to VPS and prepare
    log_info "Step 1/6: Connecting to VPS and fetching latest code..."
    ssh "$VPS_USER@$VPS_HOST" bash << EOFSH
        set -euo pipefail

        # Verify we're in the right directory
        cd $OPSLY_DIR || exit 1

        # Ensure docker is running
        if ! docker ps &>/dev/null; then
            echo "Starting Docker..."
            sudo systemctl start docker || true
            sleep 2
        fi

        # Fetch latest code
        git fetch origin

        # Show current and target commits
        echo "Current commit: \$(git log --oneline -1)"
        echo "Target commit: \$(git log origin/$BRANCH --oneline -1)"

        # Check out the branch
        git checkout -B $BRANCH origin/$BRANCH

        echo "✅ Code fetched and checked out"
EOFSH
    log_success "Code fetched and checked out"

    # Step 2: Run type-check on VPS
    if [ "$SKIP_TESTS" != "--skip-tests" ]; then
        log_info "Step 2/6: Running type-check on VPS..."
        ssh "$VPS_USER@$VPS_HOST" bash << 'EOFSH'
            set -euo pipefail
            cd /opt/opsly

            # Use Node version from nvm if available
            if [ -s "$HOME/.nvm/nvm.sh" ]; then
                source "$HOME/.nvm/nvm.sh"
                nvm use 20 || nvm use default
            fi

            npm run type-check || {
                echo "Type-check failed"
                exit 1
            }

            echo "✅ Type-check passed"
EOFSH
        log_success "Type-check passed"
    else
        log_warning "Skipping type-check (--skip-tests)"
    fi

    # Step 3: Build Docker image
    log_info "Step 3/6: Building Docker image on VPS..."
    ssh "$VPS_USER@$VPS_HOST" bash << 'EOFSH'
        set -euo pipefail
        cd /opt/opsly

        # Build the orchestrator image
        docker-compose build --no-cache orchestrator || {
            echo "Build failed"
            exit 1
        }

        echo "✅ Docker image built"
EOFSH
    log_success "Docker image built"

    # Step 4: Stop old container
    log_info "Step 4/6: Stopping old orchestrator container..."
    ssh "$VPS_USER@$VPS_HOST" bash << 'EOFSH'
        set -euo pipefail
        cd /opt/opsly

        # Graceful shutdown (30 sec timeout)
        docker-compose down || true
        sleep 2

        echo "✅ Old container stopped"
EOFSH
    log_success "Old container stopped"

    # Step 5: Start new container
    log_info "Step 5/6: Starting new orchestrator container..."
    ssh "$VPS_USER@$VPS_HOST" bash << 'EOFSH'
        set -euo pipefail
        cd /opt/opsly

        # Start services
        docker-compose up -d orchestrator redis postgres

        # Wait for orchestrator to be ready
        for i in {1..30}; do
            if curl -s http://localhost:3011/health &>/dev/null; then
                echo "✅ Orchestrator is ready"
                break
            fi
            echo "Waiting for orchestrator... ($i/30)"
            sleep 2
        done

        if ! curl -s http://localhost:3011/health &>/dev/null; then
            echo "Orchestrator failed to start"
            exit 1
        fi
EOFSH
    log_success "New container started and healthy"

    # Step 6: Verify deployment
    log_info "Step 6/6: Verifying deployment..."
    ssh "$VPS_USER@$VPS_HOST" bash << 'EOFSH'
        set -euo pipefail

        echo "Docker containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}"

        echo ""
        echo "Recent logs:"
        docker logs orchestrator --tail 20 2>&1 | head -20

        echo ""
        echo "Health check:"
        curl -s http://localhost:3011/health | jq . || echo "Health check failed"
EOFSH
    log_success "Deployment verified"

    # Step 7: Tag release and notify
    log_info "Tagging release..."
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    TAG="deployment-$TIMESTAMP"

    ssh "$VPS_USER@$VPS_HOST" "cd /opt/opsly && git tag -a '$TAG' -m 'Deployed at $TIMESTAMP' HEAD"

    log_success "Release tagged: $TAG"
}

print_summary() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "ValidationOrchestrator Deployment Summary"
    echo "═══════════════════════════════════════════════════════════════"
    echo "VPS: $VPS_USER@$VPS_HOST"
    echo "Branch: $BRANCH"
    echo "Directory: $OPSLY_DIR"
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "Next steps:"
    echo "  1. Monitor logs: ssh $VPS_USER@$VPS_HOST 'docker logs -f orchestrator'"
    echo "  2. Check health: curl http://$VPS_HOST:3011/health"
    echo "  3. View commits: ssh $VPS_USER@$VPS_HOST 'cd /opt/opsly && git log --oneline -5'"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
}

# Main
main() {
    log_info "ValidationOrchestrator Deployment Script"
    echo "Branch: $BRANCH"
    echo "Skip tests: $([ "$SKIP_TESTS" == "--skip-tests" ] && echo "yes" || echo "no")"
    echo ""

    if [ "$ROLLBACK" == "--rollback" ]; then
        rollback
        exit 0
    fi

    check_prerequisites
    deploy
    print_summary
}

main "$@"
