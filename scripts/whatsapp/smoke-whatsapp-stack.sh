#!/bin/bash

# Smoke Test: Complete WhatsApp Integration Stack
# Usage: ./scripts/whatsapp/smoke-whatsapp-stack.sh

set -e

echo "🚀 Peskids WhatsApp Stack Smoke Test"
echo "===================================="
echo ""

# Check required services
SERVICES=(
  "peskids:3004"
  "wacrm:3000"
  "twenty_peskids:3000"
  "n8n_peskids:5678"
  "opsly_orchestrator:3011"
)

echo "1️⃣  Checking service connectivity..."
for service in "${SERVICES[@]}"; do
  IFS=':' read -r name port <<< "$service"
  if docker exec "$name" curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
    echo "  ✅ $name (port $port)"
  else
    echo "  ❌ $name (port $port) - health check failed"
  fi
done

echo ""
echo "2️⃣  Checking Supabase connectivity..."
if npm run db:migrate --workspace=@intcloudsysops/migrations -- --dry-run > /dev/null 2>&1; then
  echo "  ✅ Supabase migrations accessible"
else
  echo "  ⚠️  Supabase migration check failed"
fi

echo ""
echo "3️⃣  Checking WhatsApp tables..."
if docker exec -i peskids psql "$SUPABASE_URL" -c "SELECT COUNT(*) FROM whatsapp_messages;" > /dev/null 2>&1; then
  echo "  ✅ WhatsApp tables exist"
else
  echo "  ⚠️  WhatsApp tables not found (run migrations)"
fi

echo ""
echo "4️⃣  Checking feature flags..."
if [[ "${PESKIDS_WHATSAPP_ENABLED}" == "true" ]]; then
  echo "  ✅ WhatsApp enabled"
else
  echo "  ℹ️  WhatsApp disabled (expected for sandbox mode)"
fi

if [[ "${WACRM_ENABLED}" == "true" ]]; then
  echo "  ✅ WACRM enabled"
else
  echo "  ℹ️  WACRM disabled (expected for sandbox mode)"
fi

echo ""
echo "5️⃣  Checking API endpoints..."
endpoints=(
  "GET /api/health/integrations"
  "GET /api/admin/peskids/peskids/integrations/whatsapp"
  "GET /api/admin/peskids/peskids/whatsapp/pending-approvals"
  "GET /api/public/integrations/whatsapp/meta/health"
  "GET /api/public/integrations/whatsapp/wacrm/health"
)

for endpoint in "${endpoints[@]}"; do
  IFS=' ' read -r method path <<< "$endpoint"
  if curl -sf "http://localhost:3000$path" > /dev/null 2>&1; then
    echo "  ✅ $method $path"
  else
    echo "  ⚠️  $method $path - unreachable"
  fi
done

echo ""
echo "6️⃣  Running webhook tests..."
chmod +x ./scripts/whatsapp/test-meta-webhook.sh
chmod +x ./scripts/whatsapp/test-wacrm-webhook.sh

./scripts/whatsapp/test-meta-webhook.sh challenge || true
./scripts/whatsapp/test-wacrm-webhook.sh health || true

echo ""
echo "✅ Smoke test complete!"
echo ""
echo "Next steps:"
echo "1. Review any ⚠️  warnings above"
echo "2. Enable WhatsApp flags in Doppler when ready: PESKIDS_WHATSAPP_ENABLED=true"
echo "3. Deploy WACRM for production integration"
echo "4. Configure n8n workflows with credentials"
