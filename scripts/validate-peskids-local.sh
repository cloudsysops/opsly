#!/bin/bash
set -euo pipefail

###############################################################################
# Peskids Validation — Local Execution
#
# Run this from your LOCAL machine (where you have SSH + Tailscale)
# Not from Claude Code remote environment
#
# Usage: bash scripts/validate-peskids-local.sh
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Peskids Validation — Run from YOUR LOCAL MACHINE              ║"
echo "║  (This script must run where you have SSH + Tailscale)         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check prerequisites
log_info "Checking prerequisites..."

if ! command -v ssh &> /dev/null; then
  log_error "SSH not found. Install SSH client first."
  exit 1
fi
log_success "SSH available"

if ! command -v curl &> /dev/null; then
  log_error "curl not found. Install curl first."
  exit 1
fi
log_success "curl available"

# Step 2: Check Tailscale
log_info "Checking Tailscale..."
if ! command -v tailscale &> /dev/null; then
  log_warn "Tailscale command not found. Verify VPN is active:"
  echo "  macOS: System Settings → VPN → Tailscale"
  echo "  Linux: systemctl status tailscale"
  echo "  Windows: System Tray → Tailscale"
else
  if tailscale status | grep -q "100.120.151.91"; then
    log_success "Tailscale connected to VPS"
  else
    log_warn "Tailscale may not be connected to VPS node"
    echo "Run: tailscale status"
  fi
fi

# Step 3: Test SSH connectivity
log_info "Testing SSH to VPS (100.120.151.91)..."
if ssh -q root@100.120.151.91 "echo 'SSH OK'" 2>/dev/null; then
  log_success "SSH connection successful"
else
  log_error "SSH failed. Troubleshoot:"
  echo "  1. Check Tailscale: tailscale status"
  echo "  2. Check SSH key: ssh-keygen -l -f ~/.ssh/id_rsa"
  echo "  3. Try verbose: ssh -vvv root@100.120.151.91"
  exit 1
fi

# Step 4: Run orchestrator script
log_info "Running validation via orchestrator..."
echo ""

# Call the main orchestrator script
# We need to be in repo root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ -f "scripts/peskids-orchestrator.sh" ]; then
  bash scripts/peskids-orchestrator.sh --task validate-vps
else
  log_error "peskids-orchestrator.sh not found"
  exit 1
fi

echo ""
log_success "Validation complete!"
echo ""
echo "Next steps:"
echo "  1. If all checks passed → proceed to deploy:"
echo "     bash scripts/peskids-orchestrator.sh --task deploy-vps"
echo ""
echo "  2. If any check failed → review VPS-VALIDATION-GUIDE.md:"
echo "     docs/VPS-VALIDATION-GUIDE.md"
echo ""
