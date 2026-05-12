#!/bin/bash
# Envía prompts al orquestador para probar PR #187
# LLM Provider Expansion + Codex Agent
#
# Uso:
#   ./scripts/send-prompt-to-orchestrator.sh cheap    # Cheap tier (DeepSeek flash)
#   ./scripts/send-prompt-to-orchestrator.sh code     # Code generation (CodeLlama)
#   ./scripts/send-prompt-to-orchestrator.sh codex    # Codex architect agent
#   ./scripts/send-prompt-to-orchestrator.sh balanced # Balanced tier (DeepSeek v4)

set -e

ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://localhost:3011}"
TENANT_SLUG="${TENANT_SLUG:-test-tenant}"

case "${1:-cheap}" in
  cheap)
    echo "🚀 Enviando prompt CHEAP (DeepSeek flash)..."
    curl -X POST "$ORCHESTRATOR_URL/api/intent" \
      -H "Content-Type: application/json" \
      -d '{
        "intent": "oar_react",
        "tenant_slug": "'$TENANT_SLUG'",
        "request_id": "test-cheap-'$(date +%s%N)'",
        "context": {
          "prompt": "Quick summary task: Summarize this in 10 words: The quick brown fox jumps over the lazy dog",
          "max_steps": 3
        }
      }' | jq .
    ;;
  code)
    echo "🚀 Enviando prompt CODE (CodeLlama)..."
    curl -X POST "$ORCHESTRATOR_URL/api/intent" \
      -H "Content-Type: application/json" \
      -d '{
        "intent": "oar_react",
        "tenant_slug": "'$TENANT_SLUG'",
        "agent_role": "executor",
        "request_id": "test-code-'$(date +%s%N)'",
        "context": {
          "prompt": "Write a TypeScript function that calculates fibonacci numbers",
          "max_steps": 5
        }
      }' | jq .
    ;;
  codex)
    echo "🚀 Enviando prompt CODEX (Architect Agent)..."
    curl -X POST "$ORCHESTRATOR_URL/api/intent" \
      -H "Content-Type: application/json" \
      -d '{
        "intent": "oar_react",
        "tenant_slug": "'$TENANT_SLUG'",
        "agent_role": "architect",
        "request_id": "test-codex-'$(date +%s%N)'",
        "context": {
          "prompt": "Review this architecture decision: Should we use monorepo or multi-repo? Consider: team size, deployment complexity, code sharing needs.",
          "max_steps": 10
        }
      }' | jq .
    ;;
  balanced)
    echo "🚀 Enviando prompt BALANCED (DeepSeek v4)..."
    curl -X POST "$ORCHESTRATOR_URL/api/intent" \
      -H "Content-Type: application/json" \
      -d '{
        "intent": "oar_react",
        "tenant_slug": "'$TENANT_SLUG'",
        "request_id": "test-balanced-'$(date +%s%N)'",
        "context": {
          "prompt": "Complex analysis: Analyze quarterly revenue trends and suggest optimization strategies based on market data",
          "max_steps": 8
        }
      }' | jq .
    ;;
  *)
    echo "❌ Unknown test type: $1"
    echo ""
    echo "Uso:"
    echo "  ./scripts/send-prompt-to-orchestrator.sh cheap    # Cheap tier (DeepSeek flash)"
    echo "  ./scripts/send-prompt-to-orchestrator.sh code     # Code generation (CodeLlama)"
    echo "  ./scripts/send-prompt-to-orchestrator.sh codex    # Codex architect agent"
    echo "  ./scripts/send-prompt-to-orchestrator.sh balanced # Balanced tier (DeepSeek v4)"
    echo ""
    echo "Variables de entorno:"
    echo "  ORCHESTRATOR_URL  (default: http://localhost:3011)"
    echo "  TENANT_SLUG       (default: test-tenant)"
    exit 1
    ;;
esac
