# PR #187 Testing Guide: LLM Provider Expansion + Codex Agent

## Overview

PR #187 implements:
1. **LLM Provider Expansion** (9 providers with cost optimization)
2. **Codex Agent** (Architect role with premium tier)
3. **Cost Optimization Rules** (Dynamic provider selection)
4. **Agent Registry Feedback Loop** (Runtime tier changes)

## Setup

### Prerequisites
```bash
# Ensure you have the latest code
git checkout claude/opsly-defense-platform-sC0qH
npm install
```

### Start Services

**Terminal 1: Orchestrator**
```bash
cd /home/user/opsly
npm run dev --workspace=@intcloudsysops/orchestrator
# Should see: "✅ Orchestrator running on port 3011"
```

**Terminal 2: LLM Gateway** (for provider routing)
```bash
cd /home/user/opsly
npm run dev --workspace=@intcloudsysops/llm-gateway
# Should see: "✅ LLM Gateway running on port 3010"
```

**Terminal 3: Redis** (if not already running)
```bash
redis-server --port 6379
```

## Test Scenarios

### 1️⃣ Test Cheap Provider Routing (DeepSeek Flash)

**What it tests**: Cheap tier routing to DeepSeek v4-flash ($0.14/M tokens)

```bash
./scripts/send-prompt-to-orchestrator.sh cheap
```

**Expected behavior**:
- ✅ Request routed to `cheap` tier
- ✅ Provider selected: `deepseek_v4_flash` or fallback to `ollama_local`
- ✅ Response time: <3 seconds
- ✅ Cost tracking logged

**Check logs**:
```bash
# In orchestrator logs, look for:
# {routed_model_tier: "cheap", routed_provider_hint: "deepseek_v4_flash"}
```

---

### 2️⃣ Test Code Generation (CodeLlama)

**What it tests**: Auto-routing of code generation tasks to CodeLlama (free local)

```bash
./scripts/send-prompt-to-orchestrator.sh code
```

**Expected behavior**:
- ✅ Request detected as code-generation task
- ✅ Provider selected: `codellama:34b` (free local Ollama)
- ✅ Savings: $0.00 (completely free)
- ✅ Response includes TypeScript function code

**Check logs**:
```bash
# In orchestrator logs, look for:
# {execution_skill: "code_generation", routed_provider: "codellama"}
# {cost_usd: 0, reason: "free_local_generation"}
```

---

### 3️⃣ Test Codex Agent (Architect Role)

**What it tests**: New Codex agent with architect role using premium LLM

```bash
./scripts/send-prompt-to-orchestrator.sh codex
```

**Expected behavior**:
- ✅ Agent role: `architect` maps to `codex-engineering` agent
- ✅ Model tier: `premium` (uses GPT-4o or Claude Sonnet)
- ✅ Skill binding: `opsly-architect-senior`
- ✅ Response includes architecture review + risks

**Check logs**:
```bash
# In orchestrator logs, look for:
# {routed_agent_id: "codex-engineering", routed_agent_role: "architect", routed_model_tier: "premium"}
# {execution_skill: "opsly-architect-senior"}
```

**Verify Codex Registration**:
```bash
# Check if Codex is registered in OpenClaw
grep -A 5 "codex-engineering" apps/orchestrator/src/openclaw/registry.ts
# Should show: role: "executor", skill_binding: "opsly-architect-senior", model_tier: "premium"
```

---

### 4️⃣ Test Balanced Provider Tier (DeepSeek v4)

**What it tests**: Mid-tier routing to DeepSeek v4 ($0.4/M input tokens)

```bash
./scripts/send-prompt-to-orchestrator.sh balanced
```

**Expected behavior**:
- ✅ Request routed to `balanced` tier
- ✅ Provider selected: `deepseek_v4`
- ✅ Cost tracking logged (~0.001 USD per request)
- ✅ Quality better than cheap tier

**Check logs**:
```bash
# In orchestrator logs, look for:
# {routed_model_tier: "balanced", routed_provider: "deepseek_v4"}
```

---

### 5️⃣ Test Multi-Tenant Isolation

**What it tests**: RLS enforcement across tenants

```bash
# Send same prompt from different tenants
TENANT_SLUG=acme-corp ./scripts/send-prompt-to-orchestrator.sh cheap
TENANT_SLUG=startup-xyz ./scripts/send-prompt-to-orchestrator.sh cheap
```

**Expected behavior**:
- ✅ Each tenant's job routed to separate queue
- ✅ No data leakage between tenants
- ✅ Each tenant sees only their own results
- ✅ Billing tracked per tenant

**Verify RLS**:
```sql
-- Check that jobs are filtered by tenant
SELECT COUNT(*) FROM orchestrator.jobs WHERE tenant_slug = 'acme-corp';
SELECT COUNT(*) FROM orchestrator.jobs WHERE tenant_slug = 'startup-xyz';
-- Should be isolated counts
```

---

## Cost Optimization Verification

### Verify Provider Configuration

Check that all 9 providers are configured:

```bash
grep -E "deepseek_v4|codellama|ollama|gpt4o|mistral|claude" \
  apps/llm-gateway/src/providers.ts | wc -l
# Should be 9+ provider entries
```

### Verify Cost Routing Rules

```bash
cat /config/cost-optimization-rules.yaml | grep -A 10 "rules:"
# Should show rules for:
# - Token count thresholds
# - Task type-based routing
# - Budget enforcement
```

### Track Cost Per Request

Check OpenClaw logs for cost tracking:

```bash
tail -f /tmp/orchestrator.log | grep "cost_impact\|cost_usd"
# Should see cost tracking for each request
```

---

## Agent Registry Feedback Loop (Advanced)

### Test Agent Requesting Tier Change

This tests the feedback loop where agents can request runtime tier upgrades:

```bash
# Send a high-complexity task that might trigger a tier-up request
curl -X POST http://localhost:3011/api/intent \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "oar_react",
    "tenant_slug": "test-tenant",
    "request_id": "test-feedback-loop",
    "context": {
      "prompt": "Very complex: Perform recursive analysis of supply chain vulnerability including N-tier dependencies, geopolitical risk assessment, and probabilistic failure scenarios",
      "max_steps": 20
    }
  }' | jq .
```

**Expected behavior**:
- ✅ Initial routing to `cheap` tier
- ✅ Agent detects high complexity
- ✅ Agent issues `AgentRegistryChangeRequest`
- ✅ Skeptic agent approves upgrade (optional)
- ✅ Re-route to `balanced` or `premium`
- ✅ Cost impact logged

---

## Local Development: Running Tests

### Unit Tests

```bash
npm test --workspace=@intcloudsysops/orchestrator
npm test --workspace=@intcloudsysops/llm-gateway
```

### Integration Tests

```bash
# Run test suite with actual provider calls
npm run test:integration --workspace=@intcloudsysops/orchestrator
```

### TypeScript Type Check

```bash
npm run type-check
# All 14 packages should pass
```

---

## CI/CD Verification

All CI checks must pass:

```bash
npm run validate           # Structure validation
npm run type-check         # TypeScript type safety
npm run lint              # ESLint checks
npm test                  # All tests
npm run build             # Monorepo build
```

## Monitoring

### Watch Orchestrator Events

```bash
# Terminal where orchestrator is running, look for:
[orchestrator] openclaw_router_decision: {
  routed_agent_id: "executor-default",
  routed_model_tier: "cheap",
  routed_targets: ["queue", "skill"],
  cost_impact_usd: 0.0004
}
```

### Verify Provider Health

```bash
curl http://localhost:3010/api/health/providers
# Should show all 9 providers with status
```

### Check Cost Tracking

```bash
# Query Supabase
SELECT 
  tenant_slug, 
  model, 
  SUM(tokens_input + tokens_output) as total_tokens,
  SUM(cost_usd) as total_cost
FROM metering.usage_events
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY tenant_slug, model;
```

---

## Troubleshooting

### Provider Not Resolving

Check LLM Gateway logs:
```bash
# Look for provider health errors
grep "provider.*error\|health.*failed" /tmp/llm-gateway.log
```

### Agent Not Routing

Check OpenClaw controller:
```bash
# Verify agent is registered
curl http://localhost:3011/api/openclaw/registry | jq '.agents[] | select(.id=="codex-engineering")'
```

### Cost Calculation Wrong

Verify provider pricing:
```bash
grep -A 2 "cost_per_1k" apps/llm-gateway/src/providers.ts
# Compare with actual tokens used
```

---

## Success Criteria ✅

PR #187 is **production-ready** when:

- [ ] All 5 test scenarios pass
- [ ] Multi-tenant isolation verified
- [ ] Cost tracking shows correct values
- [ ] Codex agent responds with architecture insights
- [ ] All 9 LLM providers resolve correctly
- [ ] Type-check passes (14/14 packages)
- [ ] All CI checks green on GitHub
- [ ] No regressions in existing agent functionality

---

## References

- **LLM Providers Config**: `/apps/llm-gateway/src/providers.ts` (9 providers)
- **Codex Agent Registration**: `/apps/orchestrator/src/openclaw/registry.ts`
- **Cost Optimization Rules**: `/config/cost-optimization-rules.yaml`
- **Agent Registry Feedback**: `/apps/orchestrator/src/openclaw/registry-change-handler.ts`
- **OpenClaw Controller**: `/apps/orchestrator/src/openclaw/controller.ts`
