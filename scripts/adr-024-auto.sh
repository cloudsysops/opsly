#!/bin/bash
# ADR-024 Auto-Detect and Execute — Intelligent phase progression
# Date: 2026-04-14

set -e

WORKER_HOST="opslyquantum@100.80.41.29"
VPS_HOST="vps-dragon@100.120.151.91"
OPSLY_ROOT="/opt/opsly"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_step() { echo -e "\n${GREEN}→${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# ============================================
# FASE 1 Verification
# ============================================
log_step "Verifying FASE 1 (Doppler Configuration)..."

if ! grep -q "OLLAMA_URL=" $OPSLY_ROOT/.env; then
  log_error "FASE 1 incomplete. Run:"
  echo "  doppler secrets set OLLAMA_URL=http://100.80.41.29:11434 --project ops-intcloudsysops --config prd"
  exit 1
fi

OLLAMA_URL=$(grep "OLLAMA_URL=" $OPSLY_ROOT/.env | cut -d= -f2 | tr -d '"')
OLLAMA_MODEL=$(grep "OLLAMA_MODEL=" $OPSLY_ROOT/.env | cut -d= -f2 | tr -d '"')
echo "✓ FASE 1 verified: OLLAMA_URL=$OLLAMA_URL, MODEL=$OLLAMA_MODEL"

# ============================================
# FASE 2 Check — Worker SSH connectivity
# ============================================
log_step "Checking FASE 2 (Worker Mac 2011) status..."

check_worker() {
  if timeout 3 ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $WORKER_HOST "hostname" &>/dev/null 2>&1; then
    return 0
  fi
  return 1
}

if check_worker; then
  echo "✓ Worker SSH accessible"

  # Check if Ollama is running
  if ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $WORKER_HOST \
      "curl -sf --max-time 2 http://127.0.0.1:11434/api/tags" &>/dev/null 2>&1; then
    echo "✓ Ollama running on worker"
    OLLAMA_MODELS=$(ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $WORKER_HOST \
      "curl -sf --max-time 2 http://127.0.0.1:11434/api/tags | jq '.models | length // 0'" 2>/dev/null)
    echo "  $OLLAMA_MODELS models available"
  else
    log_warn "Ollama not responding on worker (may need to start Docker compose)"
  fi

  # Check if orchestrator worker is running
  if ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $WORKER_HOST \
      "grep OPSLY_ORCHESTRATOR_MODE ~/opsly/.env.worker 2>/dev/null" &>/dev/null 2>&1; then
    echo "✓ Worker .env.worker configured"
  else
    log_warn "Worker .env.worker not configured yet (setup in progress)"
  fi
else
  log_warn "Worker SSH not accessible (may not have Tailscale SSH keys loaded)"
  echo "  Manual FASE 2: Run worker setup commands manually via SSH"
fi

# ============================================
# FASE 3 Check — VPS SSH connectivity
# ============================================
log_step "Checking FASE 3 (VPS Control Plane) status..."

check_vps() {
  if timeout 3 ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $VPS_HOST "echo ok" &>/dev/null 2>&1; then
    return 0
  fi
  return 1
}

if check_vps; then
  echo "✓ VPS SSH accessible"

  # Check if Doppler vars are in VPS .env
  if ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $VPS_HOST \
      "grep OLLAMA_URL /opt/opsly/.env" &>/dev/null 2>&1; then
    echo "✓ VPS .env has OLLAMA_URL"
  else
    log_warn "VPS .env doesn't have OLLAMA_URL yet (will load via vps-bootstrap.sh)"
  fi

  # Check orchestrator mode
  if ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $VPS_HOST \
      "grep 'OPSLY_ORCHESTRATOR_MODE=queue-only' /opt/opsly/.env" &>/dev/null 2>&1; then
    echo "✓ VPS orchestrator in queue-only mode"
  else
    log_warn "VPS orchestrator not yet in queue-only mode (will configure in FASE 3)"
  fi

  # Check if services are healthy
  ORCHESTRATOR_STATUS=$(ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $VPS_HOST \
    "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep orchestrator | head -1" 2>/dev/null || echo "not running")
  echo "  Orchestrator: $ORCHESTRATOR_STATUS"

else
  log_warn "VPS SSH not accessible (may not have Tailscale SSH keys loaded)"
  echo "  Manual FASE 3: Run VPS config commands manually via SSH"
fi

# ============================================
# Execution Decision
# ============================================
echo ""
echo "=== EXECUTION PLAN ==="

if check_worker && check_vps; then
  echo ""
  log_step "Full remote execution AVAILABLE. Proceeding with FASE 2-4..."
  echo ""
  exec $OPSLY_ROOT/scripts/adr-024-execute.sh

elif check_vps; then
  echo ""
  log_step "Partial execution: VPS reachable (FASE 3 can run), worker not reachable (FASE 2 manual)"
  echo ""
  echo "FASE 2 Status: Manual execution required (worker SSH not available)"
  echo "FASE 3 Status: Ready for auto-execution"
  echo ""
  echo "Options:"
  echo "  1. Load SSH keys and run adr-024-auto.sh again for full execution"
  echo "  2. Run FASE 2 manually on worker, then run adr-024-execute.sh"
  echo ""
  read -p "Continue with FASE 3 auto-execution? (y/N) " -r
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    exec $OPSLY_ROOT/scripts/adr-024-execute.sh
  fi

else
  echo ""
  log_warn "Remote SSH not accessible. Manual execution required."
  echo ""
  echo "Options:"
  echo "  1. Load SSH keys (Tailscale) and run adr-024-auto.sh again"
  echo "  2. Run the commands manually from $OPSLY_ROOT/docs/PLAN-OLLAMA-WORKER-2026-04-14.md"
  echo "  3. Review diagnostic: $OPSLY_ROOT/scripts/adr-024-diagnose.sh"
  echo ""
fi

echo ""
echo "=== SUMMARY ==="
echo "FASE 1: ✓ Complete (Doppler vars in .env)"
echo "FASE 2: $(check_worker && echo '✓ SSH ready' || echo '⚠ SSH needed')"
echo "FASE 3: $(check_vps && echo '✓ SSH ready' || echo '⚠ SSH needed')"
echo "FASE 4: $(check_vps && check_worker && echo '✓ Ready' || echo '⚠ Depends on 2-3')"
echo ""

exit 0
