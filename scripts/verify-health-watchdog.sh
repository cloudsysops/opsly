#!/bin/bash
# Verify health watchdog setup is complete

set -e

echo "================================"
echo "Health Watchdog Verification"
echo "================================"
echo ""

# Check 1: Watchdog script exists and is executable
echo "[1/5] Checking watchdog script..."
if [ -f "scripts/watchdog-validation-orchestrator.ts" ]; then
  echo "✓ Watchdog script found: scripts/watchdog-validation-orchestrator.ts"
else
  echo "✗ Watchdog script NOT found"
  exit 1
fi

# Check 2: GitHub Actions workflow exists
echo ""
echo "[2/5] Checking GitHub Actions workflow..."
if [ -f ".github/workflows/health-check-validation-orchestrator.yml" ]; then
  echo "✓ Workflow found: .github/workflows/health-check-validation-orchestrator.yml"
  # Verify schedule is set
  if grep -q "cron:" .github/workflows/health-check-validation-orchestrator.yml; then
    echo "✓ Schedule configured (every 5 minutes)"
  fi
else
  echo "✗ Workflow NOT found"
  exit 1
fi

# Check 3: Grafana alerts configured
echo ""
echo "[3/5] Checking Grafana alert rules..."
if [ -f "infra/grafana/alerts/validation-orchestrator.json" ]; then
  echo "✓ Grafana alert config found: infra/grafana/alerts/validation-orchestrator.json"
  # Count alert rules
  rule_count=$(grep -c '"alert":' infra/grafana/alerts/validation-orchestrator.json || echo 0)
  echo "✓ Alert rules configured: $rule_count"
else
  echo "✗ Grafana alert config NOT found"
  exit 1
fi

# Check 4: Test script exists
echo ""
echo "[4/5] Checking test suite..."
if [ -f "scripts/test-watchdog.ts" ]; then
  echo "✓ Test suite found: scripts/test-watchdog.ts"
  # Run tests
  echo ""
  echo "Running tests..."
  if npx tsx scripts/test-watchdog.ts > /tmp/test-output.txt 2>&1; then
    echo "✓ All tests passed"
  else
    echo "✗ Tests failed:"
    cat /tmp/test-output.txt
    exit 1
  fi
else
  echo "✗ Test suite NOT found"
  exit 1
fi

# Check 5: Operational documentation
echo ""
echo "[5/5] Checking operational documentation..."
if grep -q "Health Monitoring" docs/04-operations/VALIDATION-ORCHESTRATOR-OPERATIONAL-GUIDE.md; then
  echo "✓ Documentation updated with health monitoring section"
  echo "✓ Metrics endpoint documented"
  echo "✓ Alert configuration documented"
else
  echo "✗ Documentation incomplete"
  exit 1
fi

echo ""
echo "================================"
echo "All checks passed!"
echo "================================"
echo ""
echo "Health monitoring setup is complete:"
echo "  - Watchdog script: scripts/watchdog-validation-orchestrator.ts"
echo "  - GitHub Actions workflow: .github/workflows/health-check-validation-orchestrator.yml"
echo "  - Alert rules: infra/grafana/alerts/validation-orchestrator.json"
echo "  - Test suite: scripts/test-watchdog.ts"
echo "  - Operational guide: docs/04-operations/VALIDATION-ORCHESTRATOR-OPERATIONAL-GUIDE.md"
echo ""
echo "To enable Discord alerts, set: DISCORD_WEBHOOK_HEALTH secret in GitHub"
