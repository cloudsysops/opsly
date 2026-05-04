#!/usr/bin/env bash
#
# Prompt Real para Agentes de Opsly
# Tema: Crear endpoint API para agentes externos ejecutar Cursor prompts
# Rol: Codex (architect) + Executor
#
# Este prompt es desafiante porque requiere:
# 1. Análisis de arquitectura (Codex)
# 2. Diseño de API
# 3. Implementación de seguridad/multi-tenancy
# 4. Integración con orquestador

set -e

ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://localhost:3011}"
TENANT_SLUG="${TENANT_SLUG:-opsly-internal}"
REQUEST_ID="real-prompt-$(date +%s)"

echo "📤 Enviando PROMPT REAL a agentes..."
echo "   Tenant: $TENANT_SLUG"
echo "   Request ID: $REQUEST_ID"
echo ""

# PROMPT REAL - Desafiante y Útil
PROMPT='You are architecting a new feature for Opsly: "Agent Prompt Execution API"

OBJECTIVE:
Design and implement a REST API endpoint that allows external systems (Cursor, GitHub Actions, n8n) to submit arbitrary prompts to Opsly agents and receive execution results.

REQUIREMENTS:
1. **Security**: Multi-tenant isolation + API key auth
2. **Schema**: Define request/response models (Zod types)
3. **Flow**: POST /api/tenants/{slug}/agent-prompts → queue → execute → webhook callback
4. **Constraints**:
   - Max 5 concurrent executions per tenant
   - 30-minute timeout per prompt
   - Audit logging required
   - Cost tracking per tenant

DELIVERABLES:
1. Architecture diagram (text format)
2. OpenAPI 3.0 spec for the endpoint
3. TypeScript types (Zod schemas)
4. Implementation roadmap (5 phases)
5. Risk assessment + mitigations

CONTEXT:
- Existing: Orchestrator on port 3011, multi-tenant with RLS
- Stack: Next.js API routes, Supabase, BullMQ
- Integration points: LLM Gateway, Cost tracking, Audit logs

QUESTIONS TO ANSWER:
1. Should prompts be queued or executed immediately (trade-offs)?
2. How to handle agent failures (retry strategy)?
3. Webhook security - signed payloads with HMAC?
4. Rate limiting - per tenant or per API key?
5. Should we support batch prompt submissions?

Please provide a production-ready design.'

# Envía el prompt al orquestador
curl -s -X POST "$ORCHESTRATOR_URL/api/intent" \
  -H "Content-Type: application/json" \
  -d "{
    \"intent\": \"oar_react\",
    \"tenant_slug\": \"$TENANT_SLUG\",
    \"tenant_id\": \"00000000-0000-0000-0000-000000000001\",
    \"request_id\": \"$REQUEST_ID\",
    \"agent_role\": \"architect\",
    \"context\": {
      \"prompt\": $(echo "$PROMPT" | jq -Rs .),
      \"max_steps\": 15,
      \"session_id\": \"real-prompt-session\"
    }
  }" | jq .

echo ""
echo "✅ Prompt enviado!"
echo "   Request ID: $REQUEST_ID"
echo ""
echo "📊 Monitorea los logs:"
echo "   tail -f /tmp/orchestrator.log | grep '$REQUEST_ID'"
