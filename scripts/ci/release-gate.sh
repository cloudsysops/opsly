#!/usr/bin/env bash
set -euo pipefail

STAGE="${1:-staging}"

case "${STAGE}" in
  staging|production) ;;
  *)
    echo "Uso: $0 [staging|production]" >&2
    exit 1
    ;;
esac

echo "==> Release gate (${STAGE})"
echo "==> npm ci"
npm ci

echo "==> OpenAPI contract"
npm run validate-openapi

echo "==> TypeScript gate (api/admin/portal/mcp/orchestrator/ml/llm-gateway/context-builder)"
(cd apps/api && npx tsc --noEmit) &
pid1=$!
(cd apps/admin && npx tsc --noEmit) &
pid2=$!
(cd apps/portal && npx tsc --noEmit) &
pid3=$!
(cd apps/mcp && npx tsc --noEmit) &
pid4=$!
(cd apps/orchestrator && npx tsc --noEmit) &
pid5=$!
(cd apps/ml && npx tsc --noEmit) &
pid6=$!
(cd apps/llm-gateway && npx tsc --noEmit) &
pid7=$!
(cd apps/context-builder && npx tsc --noEmit) &
pid8=$!
wait $pid1 $pid2 $pid3 $pid4 $pid5 $pid6 $pid7 $pid8

echo "==> Unit tests gate (api/orchestrator/portal)"
(cd apps/api && npm test) &
pid_api=$!
(cd apps/orchestrator && npm test) &
pid_orch=$!
(cd apps/portal && npm test) &
pid_portal=$!
wait $pid_api $pid_orch $pid_portal

echo "==> Smoke E2E invite gate (dry-run)"
if [[ "${STAGE}" == "staging" ]]; then
  API_URL="${API_URL:-https://api.ops.smiletripcare.com}" \
    bash scripts/test-e2e-invite-flow.sh --dry-run --tenant-ref "${TENANT_REF:-localrank}"
else
  API_URL="${API_URL:-https://api.ops.smiletripcare.com}" \
    bash scripts/test-e2e-invite-flow.sh --dry-run --tenant-ref "${TENANT_REF:-smiletripcare}"
fi

echo "==> Release gate (${STAGE}) OK"
