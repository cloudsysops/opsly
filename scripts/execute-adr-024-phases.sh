#!/bin/bash
# ADR-024 Ollama Worker Integration — Phase execution script
# Source: docs/PLAN-OLLAMA-WORKER-2026-04-14.md
# Status: REQUIRES HUMAN EXECUTION (SSH key auth needed)
# Date: 2026-04-14

set -e

echo "=== ADR-024: Ollama Local Worker Integration ==="
echo "Executing FASE 1-4 in sequence. Abort any phase with Ctrl+C."

# ============================================
# FASE 1: Doppler Configuration
# ============================================
echo ""
echo "📌 FASE 1: Doppler Configuration"
echo "Run these commands in order:"
echo ""

cat <<'EOF'
doppler secrets set OLLAMA_URL="http://100.80.41.29:11434" \
  --project ops-intcloudsysops --config prd

doppler secrets set REDIS_EXPORT_BIND="100.120.151.91" \
  --project ops-intcloudsysops --config prd

doppler secrets set LLM_GATEWAY_EXPORT_BIND="100.120.151.91" \
  --project ops-intcloudsysops --config prd

doppler secrets set OLLAMA_MODEL="llama3.2" \
  --project ops-intcloudsysops --config prd

echo "✅ FASE 1 complete. Proceed to FASE 2."
EOF

echo ""
echo "⏸️  Pausing. Run the commands above in your shell, then press Enter."
read -p "Press Enter to continue to FASE 2..."

# ============================================
# FASE 2: Worker Mac 2011 Setup
# ============================================
echo ""
echo "📌 FASE 2: Worker Mac 2011 Setup"
echo "Execute on worker machine (100.80.41.29):"
echo ""

cat <<'EOF'
# 2.1 Verify SSH access
ssh opslyquantum@100.80.41.29 "hostname && uptime"

# 2.2 Verify Ollama is running
ssh opslyquantum@100.80.41.29 "curl -sf http://127.0.0.1:11434/api/tags | jq '.[\"models\"] | length'"

# If Ollama not running:
# ssh opslyquantum@100.80.41.29 "cd ~/opsly && \
#   OLLAMA_ORIGINS='*' docker compose -f infra/docker-compose.opslyquantum.yml up -d ollama"

# 2.3 Ensure llama3.2 model exists
ssh opslyquantum@100.80.41.29 "docker exec opslyquantum-ollama ollama list | grep llama3.2 || \
  docker exec opslyquantum-ollama ollama pull llama3.2"

# 2.4 Configure orchestrator worker env
ssh opslyquantum@100.80.41.29 "cd ~/opsly && cat >> .env.worker <<'ENVEOF'
OPSLY_ORCHESTRATOR_MODE=worker-enabled
LLM_GATEWAY_URL=http://100.120.151.91:3010
ORCHESTRATOR_CURSOR_CONCURRENCY=1
ORCHESTRATOR_OLLAMA_CONCURRENCY=1
ORCHESTRATOR_N8N_CONCURRENCY=1
ORCHESTRATOR_DRIVE_CONCURRENCY=1
ORCHESTRATOR_NOTIFY_CONCURRENCY=2
ENVEOF"

# 2.5 Start orchestrator worker
ssh opslyquantum@100.80.41.29 "cd ~/opsly && \
  ./scripts/start-workers-mac2011.sh"

echo "✅ FASE 2 complete (worker running). Proceed to FASE 3."
EOF

echo ""
echo "⏸️  Pausing. Execute FASE 2 commands above on the worker, then press Enter."
read -p "Press Enter to continue to FASE 3..."

# ============================================
# FASE 3: VPS Control Plane Configuration
# ============================================
echo ""
echo "📌 FASE 3: VPS Control Plane Configuration"
echo "Execute on VPS (100.120.151.91):"
echo ""

cat <<'EOF'
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && \
  ./scripts/vps-bootstrap.sh"

# Verify Doppler vars are now in .env:
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && \
  source .env && \
  printf 'OLLAMA_URL=%s\nREDIS_EXPORT_BIND=%s\n' \"\$OLLAMA_URL\" \"\$REDIS_EXPORT_BIND\""

# Configure orchestrator in queue-only mode:
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && \
  perl -0pi -e 's/^OPSLY_ORCHESTRATOR_MODE=.*\n//mg; s/\z/\nOPSLY_ORCHESTRATOR_MODE=queue-only\n/s unless /OPSLY_ORCHESTRATOR_MODE=/' .env"

# Restart services:
ssh vps-dragon@100.120.151.91 "cd /opt/opsly/infra && \
  docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml up -d --force-recreate redis llm-gateway orchestrator"

echo "✅ FASE 3 complete (VPS updated). Proceed to FASE 4."
EOF

echo ""
echo "⏸️  Pausing. Execute FASE 3 commands on VPS, then press Enter."
read -p "Press Enter to continue to FASE 4 (Validation)..."

# ============================================
# FASE 4: Validation
# ============================================
echo ""
echo "📌 FASE 4: Validation"
echo ""

cat <<'EOF'
# 4.1 Health check Ollama from VPS:
ssh vps-dragon@100.120.151.91 "curl -sf --max-time 5 http://100.80.41.29:11434/api/tags | jq '.models | length'"

# 4.2 LLM Gateway health:
ssh vps-dragon@100.120.151.91 "curl -sf http://127.0.0.1:3010/health | jq '.providers.llama_local'"

# 4.3 Worker health:
ssh opslyquantum@100.80.41.29 "curl -sf http://127.0.0.1:3011/health | jq '.mode'"

# 4.4 Run type-check and tests:
cd /opt/opsly && npm run type-check
npm run test --workspace=@intcloudsysops/llm-gateway
npm run test --workspace=@intcloudsysops/orchestrator

# 4.5 Demo ollama job:
API_URL=https://api.ops.smiletripcare.com \
ADMIN_TOKEN=$(doppler secrets get PLATFORM_ADMIN_TOKEN --project ops-intcloudsysops --config prd --plain) \
TENANT=localrank \
./scripts/demo-ollama-workers.sh

echo "✅ FASE 4 Validation complete!"
EOF

echo ""
echo "⏸️  Execute all FASE 4 validation commands above."
read -p "Press Enter when all validations pass..."

# ============================================
# FASE 5: Update AGENTS.md
# ============================================
echo ""
echo "📌 FASE 5: Update AGENTS.md"
echo ""
echo "✅ All phases executed. Update AGENTS.md with completion status:"
echo ""
echo "| 2026-04-14 | ADR-024: Ollama Local + worker queue | ✅ Implemented | Worker Mac 2011 (100.80.41.29) routes simple tasks to llama3.2, VPS orchestrator queue-only |"
echo ""

exit 0
