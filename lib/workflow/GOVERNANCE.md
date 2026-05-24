---
title: "lib/workflow Governance"
description: "Module governance for agent execution"
---
# lib/workflow Governance

## Ownership

- **Owner:** Claude (AI agent)
- **Maintainers:** Orchestration Team
- **Escalation:** Platform Lead

## Execution Standards

All agent executions must:

1. **Have Timeout** — Max 30 seconds per agent
2. **Track Cost** — Record tokens and USD cost
3. **Include Context** — agentId, tenantId, userId
4. **Be Observable** — Emit metrics and logs
5. **Handle Errors** — Graceful failure with error codes

## Timeout Rules

- **API Routes** — 10 second timeout (user-facing)
- **Background Jobs** — 30 second timeout (asynchronous)
- **Long-Running** — Use background queue (n8n/BullMQ)
- **Never Block** — Cancel after timeout, don't wait

## Cost Tracking Policy

Every execution must record:

- **Provider** — openai, anthropic, google
- **Model** — Which model version
- **InputTokens** — Tokens in prompt
- **OutputTokens** — Tokens in response
- **CostUSD** — Calculated cost
- **AgentId** — For cost attribution
- **TenantId** — For billing

## Retry Strategy

```
Retry Logic:
1st attempt: Immediate
2nd attempt: 100ms backoff
3rd attempt: 500ms backoff
4th attempt: 2000ms backoff
Fail after 4 attempts
```

Never retry on:
- Validation errors (400)
- Authentication errors (401)
- Rate limit (429) — Use circuit breaker instead

## Review Process

1. **Scope:** Execution changes, timeouts, cost tracking
2. **Approvers:** 1 (Orchestration Maintainer)
3. **Checks:**
   - ✅ All executions have timeout
   - ✅ Cost tracking enabled
   - ✅ Error handling covers failure cases
   - ✅ Metrics recorded for observability
   - ✅ Backward compatible

## Versioning

- Semantic versioning (MAJOR.MINOR.PATCH)
- New execution modes: MINOR bump
- Breaking execution changes: MAJOR bump

## Cost Limits Per Tenant

```json
{
  "tier": "pro",
  "monthlyBudget": 1000,
  "perExecutionLimit": 10,
  "alerts": [50, 80, 100]
}
```

When limit exceeded:
- Alert user via email
- Mark agent as rate-limited
- Queue further executions
- Notify support team

## Performance SLOs

| Metric | Target | Alert |
|--------|--------|-------|
| P50 Latency | < 1s | - |
| P95 Latency | < 5s | > 10s |
| P99 Latency | < 10s | > 20s |
| Success Rate | > 99% | < 99% |
| Timeout Rate | < 1% | > 2% |

## Dependencies

### This Module Depends On

- `@intcloudsysops/config` — Timeout settings
- `@intcloudsysops/observability` — Metrics recording
- `@intcloudsysops/telemetry` — Cost tracking

### Modules That Depend On This

- `apps/orchestrator` — Agent execution
- `apps/api` — API request handling
- `apps/gateway` — Provider calls

## See Also

- `README.md` — API documentation, examples
- `__tests__/` — Execution examples

---

## Enlaces relacionados

- [[lib/workflow/README|workflow]]
- [[README|Inicio]]
