# 📋 CODE REVIEW: Agent Prompt Execution API Design

**Reviewer**: Claude (AI) + You (Human)  
**Document**: `docs/AGENT-ANALYSIS-REAL-PROMPT.md`  
**Status**: 🔍 UNDER REVIEW

---

## 💬 REVIEW SUMMARY

The Codex agent (architect role, premium tier) analyzed the **Agent Prompt Execution API** prompt and delivered a comprehensive design covering:

✅ **Architecture Design** - System overview + data flow  
✅ **OpenAPI Spec** - Full 3.0 specification  
✅ **TypeScript Types** - Zod validation schemas  
✅ **Security Analysis** - Threat model + mitigations  
✅ **Implementation Roadmap** - 5-week phased approach  
✅ **Decision Justification** - Q&A on key design choices  

---

## 🟢 WHAT LOOKS GOOD

### 1. **Async Queue Design is Smart**
```
The agent chose async BullMQ + webhooks over sync execution.

WHY GOOD:
✓ Enforces 5-concurrent limit per tenant
✓ Supports retries (3x exponential backoff)
✓ Allows webhook callbacks for result delivery
✓ Scales to 1000s of concurrent requests

TRADE-OFF ADDRESSED:
✓ Latency: 100-500ms acknowledged and acceptable
✓ Client polling alternative provided as fallback
```

### 2. **Multi-Layer Rate Limiting**
```
TIER 1: Per API Key (100 req/hr)
TIER 2: Per Tenant (5 concurrent max)

WHY GOOD:
✓ Defense in depth against abuse
✓ Flexible per-key management
✓ Prevents single tenant from monopolizing resources
✓ Allows multiple keys per tenant
```

### 3. **Security Posture is Solid**
```
✓ RLS policies for row-level isolation
✓ HMAC-SHA256 for webhook signatures
✓ API key scoping (prompts:write, etc.)
✓ Threat model matrix (5 threats identified)
✓ Timestamp validation for replay attacks
```

### 4. **Production-Ready Checklist**
The agent included a comprehensive readiness list covering:
- Security (key rotation, RLS, sanitization)
- Reliability (99.9% SLA, retries, dead-letter queue)
- Performance (P95 latency, scaling)
- Cost control (tracking, alerts, audit trail)
- Observability (Prometheus, logging, tracing)

---

## 🟡 ITEMS TO DISCUSS / CLARIFY

### 1. **Question: Webhook Retry Logic**

**Agent's Design**:
```yaml
retry_policy:
  max_attempts: 3
  backoff:
    - delay_ms: 1000
    - delay_ms: 2000
    - delay_ms: 4000
```

**Concern**: Only 7 seconds total retry window (1+2+4). What if external system is temporarily down?

**Options**:
- [ ] Keep as-is (7s total) - assume external system should be available
- [ ] Extend to 10 retries with longer backoff (max 5 minutes)
- [ ] Add configurable retry policy per API key
- [ ] Use dead-letter queue (indefinite retry until manual intervention)

**Recommendation**: Option 2 or 3 for reliability.

---

### 2. **Question: Batch Prompts in MVP?**

**Agent's Decision**: Batch support in Phase 5 (not MVP)

**Concern**: This delays batch support by ~5 weeks. Some users might need it earlier.

**Trade-offs**:
| Approach | MVP Timeline | Implementation Cost | User Value |
|----------|------------|----------------------|----------|
| Skip batch | 4 weeks | - | Loop calls, inefficient |
| Add to MVP | 5-6 weeks | +1 week | Single endpoint for bulk |
| Add in Phase 2 | 3 weeks | +0.5 week | Reasonable compromise |

**Recommendation**: Consider moving batch to Phase 2 (after webhooks).

---

### 3. **Question: Cost Limits per Tenant**

**Agent's Design**: Cost tracking exists, but no hard limits

**Example Problem**:
```
Tenant accidentally submits 100 complex prompts (Codex arch role)
Each costs $0.05 (premium LLM)
Total: $5 before anyone notices
```

**Proposal**: Add optional cost cap with graceful rejection
```typescript
POST /api/tenants/{slug}/agent-prompts
{
  "prompt": "...",
  "cost_budget_usd": 0.10  // Fail if cost would exceed this
}

// Response if cost too high:
{
  "status": "rejected",
  "reason": "cost_limit_exceeded",
  "estimated_cost": 0.15,
  "budget": 0.10
}
```

**Recommendation**: Add to MVP for safety.

---

### 4. **Question: Agent Role Selection**

**Agent Provided**:
```typescript
agent_role: 'executor' | 'architect' | 'researcher' | 'builder'
```

**Concern**: How are these mapped to LLM tiers?

**Mapping** (from Codex agent's analysis):
- `executor` → cheap (DeepSeek flash)
- `researcher` → balanced (DeepSeek v4)
- `architect` → premium (GPT-4o / Claude Sonnet)
- `builder` → balanced (DeepSeek v4)

**Question**: Should this be hardcoded or configurable per tenant?

**Recommendation**: Hardcoded for MVP, make configurable in Phase 3.

---

### 5. **Question: Polling vs Webhook - Both Required?**

**Agent's Design**: Both supported (async queue + polling)

**Concern**: Adds complexity. Which is primary?

**Recommendation**:
- **Primary**: Webhooks (async, scalable)
- **Secondary**: Polling (fallback for unreliable external systems)
- **Documentation**: Clear guidance on when to use each

---

## 🔴 POTENTIAL ISSUES

### 1. **Missing: Callback Delivery Guarantee**

The agent mentions "retry logic (3x exponential backoff)" but doesn't address:
- What if webhook URL becomes invalid after submission?
- What if customer deletes the callback URL before results arrive?
- Who is responsible for retrieving missed results?

**Proposal**: Add `GET /api/tenants/{slug}/agent-prompts/{id}/result` for retrieval after webhook expires.

---

### 2. **Missing: Timeout Configuration**

Agent spec shows `timeout_seconds: 30-1800` but:
- No guidance on what's reasonable
- No auto-scaling based on agent_role complexity
- No timeout SLA (when should results be available?)

**Proposal**:
```typescript
timeout_defaults: {
  'executor': 300,     // 5 min
  'researcher': 600,   // 10 min
  'architect': 900,    // 15 min (complex analysis)
  'builder': 600       // 10 min
}

max_timeout: 1800  // Hard cap: 30 min
```

---

### 3. **Missing: Cost Estimation**

Agent doesn't provide:
- How to estimate cost before execution
- Cost variation by model tier
- Expected cost for typical prompts

**Proposal**: Add `POST /api/tenants/{slug}/agent-prompts/estimate` endpoint

```typescript
{
  "prompt": "...",
  "agent_role": "architect",
  "max_steps": 10
}

// Response
{
  "estimated_cost": 0.045,
  "cost_range": [0.02, 0.10],
  "model_tier": "premium",
  "lpu_estimates": {
    "tokens_input_estimate": 150,
    "tokens_output_estimate": 500
  }
}
```

---

## 📊 COMPARATIVE ANALYSIS

### Vs. Similar Solutions

**OpenAI Assistants API** (for reference):
- ✅ Agent supports streaming (Opsly doesn't need this)
- ❌ No webhook callbacks
- ✅ Async by default
- ❌ No multi-tenant support
- ✅ Built-in cost tracking

**Opsly Design** (this proposal):
- ✅ Full multi-tenant isolation (RLS)
- ✅ Webhook callbacks for async results
- ✅ Flexible agent role selection
- ✅ Cost tracking + limits
- ✅ Fits existing Opsly architecture perfectly

---

## 🎯 APPROVAL CHECKPOINTS

**Before MVP Launch**, verify:

- [ ] **Webhook Security**: Can we guarantee HMAC validation on client side?
- [ ] **Cost Limits**: Should we hard-cap tenants (e.g., $100/day max)?
- [ ] **Polling Behavior**: What's the polling interval? 500ms? 1s? 5s?
- [ ] **Error Messages**: Should we expose LLM provider errors to users?
- [ ] **Rate Limit Headers**: Should we return X-RateLimit-* headers?

---

## 📝 NEXT STEPS FOR YOU

Please review the full design document and comment on:

1. **Architecture**: Does async queue design match your expectations?
2. **Security**: Are there additional security concerns?
3. **Timeline**: Is 5-week estimate realistic with your team?
4. **Scope**: Should batch prompts be MVP or Phase 2?
5. **Priorities**: Which phase is most valuable to complete first?

---

## 🚀 RECOMMENDATION

**Status**: ✅ **READY FOR IMPLEMENTATION** (with minor clarifications)

**MVP Scope** (4 weeks):
1. Supabase tables + RLS
2. POST /api/agent-prompts endpoint
3. Webhook callbacks (HMAC signed)
4. Cost tracking per execution
5. Basic monitoring + logging

**Nice-to-Have** (add if time permits):
- Cost estimation endpoint
- Configurable timeout per agent_role
- Dead-letter queue for failed webhooks

---

**Do you want to proceed with implementation?**  
Or should we refine any aspects of the design first?

