#!/usr/bin/env bash
# PESKIDS QUICK START
# One script to launch all diagnostics + start running
# Usage: ./scripts/peskids-quick-start.sh

set -euo pipefail

BASE_URL="${PESKIDS_URL:-https://peskids.op-sly.com}"

cat << 'BANNER'

   ___          _    _     _     
  / _ \___  ___| | _(_) __| |___ 
 / /_)/ _ \/ __| |/ / |/ _` / __|
/ ___/  __/\__ \   <| | (_| \__ \
\_/  \___|_|___/_|\_\_|\__,_|___/

QUICK START — Let's get Peskids running
Version: 1.0
Updated: 2026-06-15

BANNER

echo ""
echo "📋 PESKIDS SETUP CHECKLIST"
echo ""

# Check 1: VPS Deploy
echo "1️⃣ Checking VPS deployment..."
if curl -s "$BASE_URL/api/health" | jq -e '.status' > /dev/null 2>&1; then
  echo "   ✅ Peskids is running"
else
  echo "   ❌ Peskids is DOWN — need to run deploy fix"
  echo "   👉 Run: bash scripts/peskids-auto-fix-deploy.sh"
  echo ""
fi

# Check 2: GHL Config
echo "2️⃣ Checking GHL configuration..."
if command -v jq &> /dev/null; then
  echo "   ⚠️  Need manual GHL setup (cannot check from CLI)"
  echo "   👉 Go to: https://app.gohighlevel.com/v2/location/KJ5LawrOOe3hIerqtMRu/dashboard"
  echo "   👉 Follow: docs/tenants/peskids/GO-LIVE-CHECKLIST.md (FASE 2)"
else
  echo "   ⚠️  jq not installed"
fi

# Check 3: Documentation
echo ""
echo "3️⃣ Documentation ready:"
echo "   📖 Daily runbook:  docs/tenants/peskids/OPERATOR-DAILY-RUNBOOK.md"
echo "   ✅ Go-live list:   docs/tenants/peskids/GO-LIVE-CHECKLIST.md"
echo "   📊 Data model:     docs/tenants/peskids/DATA-MODEL.md"
echo ""

# Check 4: Scripts available
echo "4️⃣ Testing scripts ready:"
echo "   🧪 E2E Full Flow:  scripts/peskids-e2e-full-flow.sh [--live]"
echo "   📊 Metrics:        scripts/peskids-metrics-dashboard.sh"
echo "   🔍 Diagnose:       scripts/peskids-deploy-vps-diagnose.sh"
echo "   🆘 Emergency:      scripts/peskids-emergency-deploy.sh"
echo ""

# Check 5: Quick access
echo "5️⃣ Quick access links:"
echo "   🌐 Website:        https://peskids.op-sly.com"
echo "   🔐 Admin Login:    https://peskids.op-sly.com/admin/login"
echo "   📋 GHL Dashboard:  https://app.gohighlevel.com/v2/location/KJ5LawrOOe3hIerqtMRu/dashboard"
echo "   🔧 n8n Workflows:  https://n8n-peskids.op-sly.com"
echo "   ⏱️  Uptime Monitor: https://uptime-peskids.op-sly.com"
echo ""

# Next steps
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 NEXT STEPS (in order):"
echo ""
echo "1️⃣  Deploy to VPS (if not running)"
echo "    bash scripts/peskids-auto-fix-deploy.sh"
echo ""
echo "2️⃣  Configure GHL (30-45 min)"
echo "    Open: docs/tenants/peskids/GO-LIVE-CHECKLIST.md"
echo "    Follow: FASE 1, 2, 3, 4"
echo ""
echo "3️⃣  Validate everything"
echo "    bash scripts/peskids-e2e-full-flow.sh --live"
echo ""
echo "4️⃣  Start operations"
echo "    Read: docs/tenants/peskids/OPERATOR-DAILY-RUNBOOK.md"
echo "    Login: https://peskids.op-sly.com/admin/login"
echo ""
echo "5️⃣  Go live!"
echo "    Announce to clients"
echo "    Monitor: bash scripts/peskids-metrics-dashboard.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "❓ Questions? Check #peskids-support on Slack"
echo "📧 Need help? support@intcloudsysops.com"
echo ""
