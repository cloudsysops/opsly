#!/bin/bash
# ADR-024 Diagnostic — Check current phase completion status
# Source: docs/PLAN-OLLAMA-WORKER-2026-04-14.md
# Date: 2026-04-14

set -e

echo "=== ADR-024 Ollama Local Worker Integration — Diagnostic ==="
echo ""

# ============================================
# PHASE STATUS CHECK
# ============================================

echo "📋 FASE 1: Doppler Configuration"
if grep -q "OLLAMA_URL=" /opt/opsly/.env && \
   grep -q "REDIS_EXPORT_BIND=" /opt/opsly/.env && \
   grep -q "LLM_GATEWAY_EXPORT_BIND=" /opt/opsly/.env && \
   grep -q "OLLAMA_MODEL=" /opt/opsly/.env; then
  echo "  ✅ COMPLETE: All 4 Doppler vars present in .env"
  echo "     OLLAMA_URL=$(grep OLLAMA_URL /opt/opsly/.env | cut -d= -f2)"
  echo "     OLLAMA_MODEL=$(grep OLLAMA_MODEL /opt/opsly/.env | cut -d= -f2)"
else
  echo "  ❌ INCOMPLETE: Missing Doppler vars. Run FASE 1 commands:"
  echo "     doppler secrets set OLLAMA_URL=http://100.80.41.29:11434 --project ops-intcloudsysops --config prd"
  exit 1
fi

echo ""
echo "📋 FASE 2: Worker Mac 2011 Setup"
echo "  ⚠️  REQUIRES SSH to opslyquantum@100.80.41.29"
echo ""
echo "  Checks to run:"
echo "    2.1 ssh opslyquantum@100.80.41.29 'hostname && uptime'"
echo "    2.2 ssh opslyquantum@100.80.41.29 'curl -sf http://127.0.0.1:11434/api/tags | jq .models | length'"
echo "    2.3 ssh opslyquantum@100.80.41.29 'docker exec opslyquantum-ollama ollama list | grep llama3.2'"
echo "    2.4 ssh opslyquantum@100.80.41.29 'ls -la ~/opsly/.env.worker && cat ~/opsly/.env.worker | grep OPSLY_ORCHESTRATOR_MODE'"
echo "    2.5 ssh opslyquantum@100.80.41.29 'ps aux | grep orchestrator | grep -v grep'"
echo ""

echo "📋 FASE 3: VPS Control Plane Configuration"
echo "  ⚠️  REQUIRES SSH to vps-dragon@100.120.151.91 (via Tailscale)"
echo ""
echo "  Checks to run:"
echo "    3.1 ssh vps-dragon@100.120.151.91 'cd /opt/opsly && source .env && echo OLLAMA_URL=\$OLLAMA_URL'"
echo "    3.2 ssh vps-dragon@100.120.151.91 'grep OPSLY_ORCHESTRATOR_MODE /opt/opsly/.env'"
echo "    3.3 ssh vps-dragon@100.120.151.91 'docker ps --format \"{{.Names}}\t{{.Status}}\" | grep orchestrator'"
echo ""

echo "📋 FASE 4: Validation"
echo "  ⚠️  REQUIRES SSH access and running services"
echo ""
echo "  Quick validation checks:"
echo "    4.1 curl -sf --max-time 5 http://100.80.41.29:11434/api/tags | jq .models"
echo "    4.2 ssh vps-dragon@100.120.151.91 'curl -sf http://127.0.0.1:3010/health | jq .providers.llama_local'"
echo "    4.3 cd /opt/opsly && npm run type-check"
echo ""

echo "=== SUMMARY ==="
echo "✅ FASE 1: Ready"
echo "⏳ FASE 2: Requires SSH to worker (100.80.41.29)"
echo "⏳ FASE 3: Requires SSH to VPS (100.120.151.91)"
echo "⏳ FASE 4: Requires both SSH + running worker"
echo ""
echo "📝 Next: Run this diagnostic with SSH keys loaded, then execute FASE 2-4"
