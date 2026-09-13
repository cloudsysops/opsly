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

echo "==> Build internal packages (required before tsc / vitest)"
(cd packages/types && npm run build)
(cd lib/prompt-guard && npm run build)
(cd apps/ml && npm run build)
(cd lib/services && npm run build)
(cd lib/external-agent-registry && npm run build)
(cd lib/agent-task-core && npm run build)
(cd lib/git-branch-orchestrator && npm run build)
(cd lib/session-manager && npm run build)
(cd lib/runtime && npm run build)
(cd lib/voice-messaging && npm run build)
(cd lib/content-studio && npm run build)
(cd apps/llm-gateway && npm run build)

echo "==> TypeScript gate (api/admin/portal/peskids/mcp/orchestrator/ml/llm-gateway/context-builder)"
(cd apps/api && npx tsc --noEmit) &
pid1=$!
(cd apps/admin && npx tsc --noEmit) &
pid2=$!
(cd apps/portal && npx tsc --noEmit) &
pid3=$!
(cd apps/peskids && npm install --no-audit --no-fund && npx tsc --noEmit) &
pid_peskids=$!
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
wait $pid1 $pid2 $pid3 $pid_peskids $pid4 $pid5 $pid6 $pid7 $pid8

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
  if ! API_URL="${API_URL:-https://api.op-sly.com}" \
      bash scripts/test-e2e-invite-flow.sh --dry-run --tenant-ref "${TENANT_REF:-localrank}"; then
    echo "⚠️ Legacy invite smoke failed in dry-run; continuing release gate because it is non-blocking."
  fi
else
  if ! API_URL="${API_URL:-https://api.op-sly.com}" \
      bash scripts/test-e2e-invite-flow.sh --dry-run --tenant-ref "${TENANT_REF:-smiletripcare}"; then
    echo "⚠️ Legacy invite smoke failed in dry-run; continuing release gate because it is non-blocking."
  fi
fi

echo "==> Release gate (${STAGE}) OK"
