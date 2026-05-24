---
title: "@intcloudsysops/telemetry"
description: "Cost and performance tracking per agent"
---
# @intcloudsysops/telemetry

Advanced cost and performance tracking for per-agent billing, budgeting, and analytics.

## Features

- 💰 **Cost Breakdown** — Track tokens, pricing, and costs per execution
- 📊 **Performance Metrics** — Latency percentiles, success rates
- 🎯 **Per-Agent Tracking** — Costs attributed to specific agents
- 📈 **Aggregation** — Day/week/month summaries
- 💳 **Billing Integration** — Export for invoicing

## Usage

### Record Execution Cost

```typescript
import { Telemetry } from '@intcloudsysops/telemetry';

const telemetry = new Telemetry();

const costBreakdown = {
  provider: 'openai',
  inputTokens: 100,
  outputTokens: 250,
  costUSD: 0.018,
  timestamp: Date.now()
};

telemetry.recordCost(costBreakdown);
```

### Get Cost by Agent

```typescript
const agentId = 'agent-automation';

const totalCost = telemetry.getCostByAgent(agentId);
console.log(`Agent cost: $${totalCost.toFixed(2)}`);

// Get monthly breakdown
const breakdown = telemetry.getCostBreakdown(agentId, {
  startDate: '2024-05-01',
  endDate: '2024-05-31'
});

console.log('OpenAI:', breakdown.openai);   // $234.56
console.log('Anthropic:', breakdown.anthropic); // $123.45
```

### Record Performance Metrics

```typescript
const metrics = {
  avgLatencyMs: 1234,
  p95LatencyMs: 3456,
  p99LatencyMs: 5678,
  successRate: 0.99
};

telemetry.recordMetric(metrics, agentId);
```

### Get Agent Performance

```typescript
const agentId = 'agent-automation';

const metrics = telemetry.getMetrics(agentId);
// {
//   avgLatencyMs: 1234,
//   p95LatencyMs: 3456,
//   p99LatencyMs: 5678,
//   successRate: 0.99
// }
```

## Cost Structure

Track costs by provider and model:

```typescript
interface CostBreakdown {
  provider: 'openai' | 'anthropic' | 'google' | 'cohere';
  model?: string;           // e.g., 'gpt-4-turbo'
  inputTokens: number;      // Tokens in prompt
  outputTokens: number;     // Tokens in response
  costUSD: number;          // Calculated cost
  timestamp: number;        // Unix timestamp
}
```

## Integration by Service

### Orchestrator

```typescript
import { Telemetry } from '@intcloudsysops/telemetry';

const telemetry = new Telemetry();

async function executeAgent(agentId, input) {
  const startTime = Date.now();
  
  try {
    const result = await agent.execute(input);
    
    // Record cost
    telemetry.recordCost({
      provider: 'openai',
      inputTokens: result.usage.prompt_tokens,
      outputTokens: result.usage.completion_tokens,
      costUSD: result.costUSD,
      timestamp: Date.now()
    });

    return result;
  } finally {
    // Record performance
    const durationMs = Date.now() - startTime;
    telemetry.recordMetric({
      avgLatencyMs: durationMs,
      p95LatencyMs: durationMs,
      p99LatencyMs: durationMs,
      successRate: 1.0
    }, agentId);
  }
}
```

### Billing Pipeline

```typescript
import { Telemetry } from '@intcloudsysops/telemetry';

async function generateInvoice(tenantId, month) {
  const telemetry = new Telemetry();
  
  // Get all agent costs for month
  const agents = await db.from('agents')
    .select('id')
    .eq('tenant_id', tenantId);

  let totalCost = 0;
  const breakdown = {};

  for (const agent of agents) {
    const cost = telemetry.getCostByAgent(agent.id);
    totalCost += cost;
    breakdown[agent.id] = cost;
  }

  // Create invoice
  return {
    tenantId,
    month,
    totalCost,
    breakdown,
    lineItems: breakdown
  };
}
```

## Analytics Queries

```typescript
// Which agents cost the most?
const topAgents = telemetry.getTopAgentsByCost(10);

// Cost trend
const trend = telemetry.getCostTrend('2024-05-01', '2024-05-31');

// Provider breakdown
const providerCosts = telemetry.getCostByProvider();
```

## See Also

- `GOVERNANCE.md` — Cost tracking standards, review process
- `__tests__/` — Telemetry examples

---

## Enlaces relacionados

- [[lib/telemetry/README|telemetry]]
- [[README|Inicio]]
