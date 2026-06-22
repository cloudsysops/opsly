#!/bin/bash
set -euo pipefail

###############################################################################
# Peskids Remote Validation via GitHub Actions
#
# Dispara validación en GitHub Actions sin necesidad SSH local
# Funciona desde cualquier lugar (no necesita Tailscale, solo GitHub CLI)
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

TASK="validate-vps"
ENV="prd"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Peskids Remote Validation — GitHub Actions (No SSH)           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --task) TASK="$2"; shift 2;;
    --env) ENV="$2"; shift 2;;
    -h|--help)
      cat <<EOF
Usage: bash scripts/peskids-remote-validate.sh --task <task> [--env prd|staging]

Tasks: validate-vps, health-check, deploy-vps, smoke-test
Environment: prd (default) or staging

Prerequisites:
  - GitHub CLI: brew install gh
  - GitHub auth: gh auth login (one-time)

Example:
  bash scripts/peskids-remote-validate.sh --task validate-vps --env prd

EOF
      exit 0
      ;;
    *) log_error "Unknown option: $1"; exit 1;;
  esac
done

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
  log_error "GitHub CLI not found. Install: brew install gh (macOS) or apt install gh (Linux)"
  exit 1
fi
log_success "GitHub CLI available"

# Verify auth
if ! gh auth status >/dev/null 2>&1; then
  log_error "Not authenticated. Run: gh auth login"
  exit 1
fi
log_success "GitHub authenticated"

log_info "Triggering GitHub Actions workflow..."
echo "  Task: $TASK"
echo "  Environment: $ENV"
echo ""

# Trigger workflow
if gh workflow run peskids-validate-remote.yml \
  -f task="$TASK" \
  -f environment="$ENV" 2>/dev/null; then

  log_success "Workflow triggered!"
  echo ""
  echo "View results:"
  echo "  GitHub UI: https://github.com/cloudsysops/opsly/actions/workflows/peskids-validate-remote.yml"
  echo "  Or run: gh run list --workflow peskids-validate-remote.yml"
  echo ""
else
  log_error "Failed to trigger workflow. Ensure it exists at .github/workflows/peskids-validate-remote.yml"
  echo ""
  echo "Create it manually:"
  echo "  1. https://github.com/cloudsysops/opsly → Actions → New Workflow"
  echo "  2. Copy content from docs/WORKFLOW-PESKIDS-VALIDATE-REMOTE.yml"
  exit 1
fi
