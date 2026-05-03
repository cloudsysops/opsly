# 🤖 CODEX AGENT ANALYSIS - Agent Prompt Execution API Design

**Request ID**: real-prompt-1777808970  
**Tenant**: opsly-internal  
**Agent Role**: architect  
**Model Tier**: premium (GPT-4o / Claude Sonnet)  
**Status**: ✅ PROCESSED

---

## 📋 PROMPT RECEIVED

```
Design and implement a REST API endpoint that allows external systems 
(Cursor, GitHub Actions, n8n) to submit arbitrary prompts to Opsly 
agents and receive execution results.

REQUIREMENTS:
1. Security: Multi-tenant isolation + API key auth
2. Schema: Define request/response models (Zod types)
3. Flow: POST /api/tenants/{slug}/agent-prompts → queue → execute → webhook
4. Constraints: 5 concurrent/tenant, 30-min timeout, audit logging, cost tracking
```

---

## 🏗️ ARCHITECTURE DESIGN

### 1. System Overview

```
External System (Cursor/GitHub Actions/n8n)
        ↓
[API Gateway] 
        ↓
POST /api/tenants/{slug}/agent-prompts
        ↓
[Auth Middleware] - API Key validation + RLS
        ↓
[Request Validator] - Zod schema validation
        ↓
[BullMQ Queue] - tenant-scoped job queue
        ↓
[Agent Executor] - Orchestrator processes prompt
        ↓
[Webhook Callback] - HMAC-signed result
```

### 2. Data Flow Diagram

```
Request Flow:
1. POST /api/tenants/acme/agent-prompts
   {
     "prompt": "Design a microservice for user auth",
     "agent_role": "architect",
     "max_steps": 10,
     "callback_url": "https://external.com/webhook"
   }

2. Validation:
   - API key: acme_sk_xxx
   - RLS: tenant_id matches
   - Rate limit: 5 concurrent check

3. Enqueue:
   - Job ID: prompt_xxx
   - Queue: orchestrator_acme
   - Metadata: {request_id, callback_url, max_steps}

4. Execution:
   - LLM Gateway routes to appropriate provider
   - Cost tracked: $0.04 (Codex uses premium tier)
   - Audit log created

5. Webhook Callback:
   {
     "request_id": "xxx",
     "status": "success",
     "result": "Architecture design...",
     "cost_usd": 0.04,
     "execution_time_ms": 4250
   }
```

---

## 📊 OPENAPI 3.0 SPECIFICATION

```yaml
openapi: 3.0.3
info:
  title: Opsly Agent Prompt Execution API
  version: 1.0.0
servers:
  - url: https://api.opsly.com
paths:
  /api/tenants/{slug}/agent-prompts:
    post:
      summary: Submit prompt for agent execution
      parameters:
        - name: slug
          in: path
          required: true
          schema: { type: string }
        - name: X-API-Key
          in: header
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PromptRequest'
      responses:
        '202':
          description: Prompt accepted for processing
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PromptResponse'
        '400':
          description: Validation error
        '401':
          description: Unauthorized (invalid API key)
        '429':
          description: Rate limit exceeded (5 concurrent prompts)
        
  /api/tenants/{slug}/agent-prompts/{request_id}:
    get:
      summary: Poll execution status
      parameters:
        - name: slug
          in: path
          required: true
          schema: { type: string }
        - name: request_id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Current status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StatusResponse'

components:
  schemas:
    PromptRequest:
      type: object
      required: [prompt, agent_role]
      properties:
        prompt:
          type: string
          maxLength: 10000
        agent_role:
          type: string
          enum: [executor, architect, researcher, builder]
        max_steps:
          type: integer
          minimum: 1
          maximum: 20
          default: 10
        callback_url:
          type: string
          format: uri
        timeout_seconds:
          type: integer
          minimum: 30
          maximum: 1800
          default: 300
        metadata:
          type: object
          additionalProperties: true
        
    PromptResponse:
      type: object
      properties:
        request_id: { type: string }
        status: { enum: [pending, processing, completed, failed] }
        created_at: { type: string, format: date-time }
        estimated_completion: { type: string, format: date-time }
        
    StatusResponse:
      type: object
      properties:
        request_id: { type: string }
        status: { enum: [pending, processing, completed, failed] }
        result: { type: string }
        cost_usd: { type: number }
        execution_time_ms: { type: integer }
        error: { type: string }
```

---

## 💾 TYPESCRIPT TYPES (Zod Schemas)

```typescript
import { z } from 'zod';

export const AgentRoleSchema = z.enum([
  'executor',
  'architect',
  'researcher',
  'builder',
]);

export const PromptRequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
  agent_role: AgentRoleSchema,
  max_steps: z.number().int().min(1).max(20).default(10),
  callback_url: z.string().url().optional(),
  timeout_seconds: z.number().int().min(30).max(1800).default(300),
  metadata: z.record(z.any()).optional(),
});

export const PromptResponseSchema = z.object({
  request_id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  created_at: z.date(),
  estimated_completion: z.date().optional(),
});

export const ExecutionResultSchema = z.object({
  request_id: z.string().uuid(),
  status: z.enum(['success', 'failure']),
  result: z.string().optional(),
  error: z.string().optional(),
  cost_usd: z.number().min(0),
  execution_time_ms: z.number().int().positive(),
  tokens_input: z.number().int(),
  tokens_output: z.number().int(),
  model_used: z.string(),
  agent_id: z.string(),
});

export type PromptRequest = z.infer<typeof PromptRequestSchema>;
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;
```

---

## 🔒 SECURITY ANALYSIS

### Threat Model

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|-----------|
| API key compromise | Medium | High | Key rotation, scoped permissions |
| Multi-tenant data leak | Low | Critical | RLS + row-level encryption |
| Prompt injection | Medium | High | Schema validation + sandboxing |
| Cost abuse | High | Medium | Rate limiting (5 concurrent) |
| Timeout DoS | Medium | High | 30-min hard timeout |

### Implementation Details

**1. API Key Validation**
```typescript
// Middleware: validate X-API-Key header
const apiKey = req.headers['x-api-key'];
const tenantKey = await supabase
  .from('api_keys')
  .select('tenant_id, scopes')
  .eq('key_hash', hash(apiKey))
  .single();

if (!tenantKey || !hasScope(tenantKey.scopes, 'prompts:write')) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

**2. RLS Enforcement**
```sql
-- All queries automatically filtered by tenant_id
ALTER TABLE agent_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation"
  ON agent_prompts
  FOR ALL
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

**3. Webhook Security (HMAC Signature)**
```typescript
// Sign callback payload
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

// Callback headers
'X-Opsly-Signature': signature
'X-Opsly-Request-ID': request_id
```

---

## 📋 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1)
- [ ] Create Supabase tables: `agent_prompts`, `execution_results`, `api_keys`
- [ ] Implement RLS policies
- [ ] Create TypeScript types (Zod schemas)
- [ ] Add unit tests for schema validation

### Phase 2: API Endpoint (Week 2)
- [ ] `POST /api/tenants/{slug}/agent-prompts` - submit prompt
- [ ] `GET /api/tenants/{slug}/agent-prompts/{id}` - check status
- [ ] API key middleware + validation
- [ ] Rate limiting (5 concurrent/tenant)

### Phase 3: Orchestrator Integration (Week 3)
- [ ] Queue job to orchestrator
- [ ] Pass agent_role → provider tier selection
- [ ] Track cost per execution
- [ ] Audit logging

### Phase 4: Webhook Callbacks (Week 4)
- [ ] Implement HMAC-signed callbacks
- [ ] Retry logic (3x exponential backoff)
- [ ] Webhook delivery status tracking
- [ ] Dead letter queue for failed callbacks

### Phase 5: Monitoring + Production (Week 5)
- [ ] Prometheus metrics (execution time, cost, errors)
- [ ] Dashboard for admin view
- [ ] Load testing (concurrent limits)
- [ ] Deploy to staging → production

---

## ❓ ANSWERING KEY QUESTIONS

### Q1: Queue vs Immediate Execution?

**Answer**: **ASYNC QUEUE (Recommended)**

**Trade-offs**:
```
ASYNC (BullMQ Queue):
✅ Handles concurrency limits (5/tenant)
✅ Supports retries on failure
✅ Webhook callbacks for async result delivery
✅ Scales to 1000s of concurrent requests
❌ 100-500ms latency for queueing
❌ Requires webhook implementation

SYNC (Immediate):
✅ <100ms latency for response
❌ Blocks on LLM execution (can be slow)
❌ Can't enforce 5 concurrent limit
❌ No retry mechanism
```

**Recommendation**: Use **ASYNC with optional polling**.
- Default: submit → callback via webhook
- Alternative: POST returns request_id → client polls `GET /agent-prompts/{id}`

---

### Q2: Agent Failure Handling?

**Answer**: **3-tier Retry Strategy**

```yaml
retry_policy:
  max_attempts: 3
  backoff:
    - delay_ms: 1000
      multiplier: 2.0
    - delay_ms: 2000
    - delay_ms: 4000
  fail_on:
    - timeout (>30 min)
    - provider_unavailable (3 consecutive failures)
    - invalid_api_key
```

**Implementation**:
```typescript
const job = await orchestratorQueue.add('execute-prompt', payload, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86400 }, // Keep 24h for audit
});
```

---

### Q3: Webhook Security - Signed HMAC?

**Answer**: **YES - SHA256 HMAC Required**

```typescript
// Webhook payload
{
  "request_id": "prompt_xxx",
  "status": "success",
  "result": "...",
  "timestamp": "2026-05-03T12:00:00Z"
}

// Signature header
X-Opsly-Signature: sha256=abc123def456...
X-Opsly-Timestamp: 1714816800

// Verification (client side)
const secret = apiKeySecret; // different from API key
const signature = HMAC('sha256', payload, secret);
if (signature !== headerSignature) throw new Error('Invalid signature');
```

---

### Q4: Rate Limiting - Per Tenant or Per Key?

**Answer**: **BOTH (Defense in depth)**

```
Tier 1: Per API Key
- 100 requests/hour (burst: 10/min)
- Per-key accounting in Redis

Tier 2: Per Tenant
- 5 concurrent executions maximum
- Queue-based enforcement (BullMQ)
- Cost tracking (prevent abuse)

Example:
acme-corp has 3 API keys
- Each key: 100 req/hr limit
- Tenant total: 5 concurrent cap
```

---

### Q5: Batch Prompt Support?

**Answer**: **YES - Batch API in Phase 5**

```typescript
POST /api/tenants/{slug}/agent-prompts/batch
{
  "prompts": [
    { "prompt": "...", "agent_role": "executor" },
    { "prompt": "...", "agent_role": "architect" },
  ],
  "callback_url": "https://...",
  "sequential": false  // parallel execution
}

// Response
{
  "batch_id": "batch_xxx",
  "request_ids": ["prompt_1", "prompt_2"],
  "status": "processing"
}
```

**Later callbacks**:
```
X-Opsly-Batch-ID: batch_xxx
[Individual result callbacks for each prompt]
```

---

## 📊 PRODUCTION READINESS CHECKLIST

- [ ] **Security**
  - [ ] API key rotation mechanism
  - [ ] HMAC webhook signature validation
  - [ ] RLS policies tested
  - [ ] Prompt input sanitization
  
- [ ] **Reliability**
  - [ ] 99.9% uptime SLA target
  - [ ] Auto-retry on transient failures
  - [ ] Dead letter queue for failed webhooks
  - [ ] Circuit breaker for provider outages

- [ ] **Performance**
  - [ ] <500ms P95 response time (queue + callback)
  - [ ] Support 100 concurrent requests/tenant
  - [ ] Redis connection pooling
  - [ ] Horizontal scaling (multi-instance)

- [ ] **Cost Control**
  - [ ] Cost tracking per execution
  - [ ] Tenant cost alerts (if exceeds budget)
  - [ ] Provider cost optimization
  - [ ] Audit trail of all costs

- [ ] **Observability**
  - [ ] Prometheus metrics (latency, errors, cost)
  - [ ] Structured logging (JSON)
  - [ ] Tracing (request ID propagation)
  - [ ] Dashboard for monitoring

---

## 🎯 SUMMARY

This design provides:

✅ **Secure** multi-tenant isolation with API keys + RLS  
✅ **Scalable** async queue with 5 concurrent limit/tenant  
✅ **Reliable** 3-tier retry strategy + webhook callbacks  
✅ **Observable** full cost tracking + audit logs  
✅ **Extensible** batch support + agent role selection  

**Estimated Implementation**: 5 weeks (1 phase/week)  
**Team Size**: 1 senior engineer + 1 junior  
**Risk Level**: Low (leverages existing Orchestrator + RLS)

---

## 📝 NEXT STEPS FOR HUMAN REVIEW

1. **Architecture Review**: Does the design align with Opsly's current architecture?
2. **API Design**: Any changes to request/response schema?
3. **Security**: Any additional threat model items?
4. **Scope**: Should batch prompts be in MVP or Phase 2?
5. **Timeline**: Is 5-week estimate realistic?

