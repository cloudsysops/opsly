#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "🧪 Hermes stack integration smoke"
echo "================================"

echo ""
echo "1. Type-check @intcloudsysops/orchestrator..."
npm run type-check --workspace=@intcloudsysops/orchestrator
echo "✅ Types OK"

echo ""
echo "2. Import checks..."
grep -q "runWithTenantContext" apps/orchestrator/src/hermes/HermesOrchestrator.ts
grep -q "HermesStateRepository" apps/orchestrator/src/hermes/HermesOrchestrator.ts
grep -q "meterHermesTaskCpuFireAndForget" apps/orchestrator/src/hermes/HermesOrchestrator.ts
grep -q "withCircuitBreaker" apps/orchestrator/src/hermes/ContextEnricher.ts
echo "✅ Imports OK"

echo ""
echo "3. Vitest: Hermes + circuit-breaker..."
npm run test --workspace=@intcloudsysops/orchestrator -- \
  __tests__/hermes.test.ts \
  src/resilience/__tests__/circuit-breaker.test.ts
echo "✅ Tests OK"

echo ""
echo "✅ Hermes integration smoke passed."
