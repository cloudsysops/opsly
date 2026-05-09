---
title: "@intcloudsysops/workflow"
description: "Safe agent execution with timeouts and cost tracking"
---
# @intcloudsysops/workflow

Safe agent execution framework with timeout enforcement, cost tracking, and execution metrics.

## Features

- ⏱️ **Timeout Enforcement** — Kill runaway executions after deadline
- 💰 **Cost Tracking** — Record tokens and costs per execution
- 📊 **Metrics** — Latency, tokens, errors, success rate
- 🔄 **Retry Logic** — Configurable retry with backoff
- 🧪 **Testable** — Mock execution context

## Usage

### Execute Agent with Timeout

```typescript
import { executeWithTimeout } from '@intcloudsysops/workflow';

const context = {
  agentId: 'agent-automation',
  tenantId: 'tenant-abc',
  userId: 'user-123',
  input: { query: 'create invoice' },
  startTime: Date.now(),
  timeoutMs: 5000 // 5 second timeout
};

const result = await executeWithTimeout(
  async () => {
    return await agent.execute(context.input);
  },
  context.timeoutMs,
  context.agentId
);

console.log(result.success);      // true/false
console.log(result.output);       // Agent output
console.log(result.durationMs);   // Execution time
console.log(result.cost);         // Cost in USD
```

### Execution Context

```typescript
interface ExecutionContext {
  agentId: string;           // Which agent is running
  tenantId: string;          // Tenant context
  userId: string;            // Who triggered execution
  input: unknown;            // Agent input
  startTime: number;         // Timestamp (Date.now())
  timeoutMs: number;         // Max execution duration
  maxTokens?: number;        // Token limit
  maxCost?: number;          // Cost limit (USD)
}
```

### Execution Result

```typescript
interface ExecutionResult {
  success: boolean;          // Execution completed
  output?: unknown;          // Agent output (if success)
  cost: number;              // Cost in USD
  tokensUsed: number;        // Tokens consumed
  durationMs: number;        // Execution time
  error?: {
    code: string;
    message: string;
  };
}
```

## Integration by Service

### Orchestrator

```typescript
import { executeWithTimeout } from '@intcloudsysops/workflow';

async function runAgent(agentId, input, tenantId) {
  const context = {
    agentId,
    tenantId,
    userId: 'system',
    input,
    startTime: Date.now(),
    timeoutMs: 30000  // 30 second timeout
  };

  const result = await executeWithTimeout(
    () => agent.execute(input),
    context.timeoutMs,
    agentId
  );

  // Log metrics
  await recordMetric('agent_execution_time', result.durationMs, { agentId });
  await recordMetric('agent_cost', result.cost, { agentId });

  return result;
}
```

### API Route

```typescript
import { executeWithTimeout } from '@intcloudsysops/workflow';

app.post('/api/agents/:id/execute', async (req, res) => {
  const { tenantId, userId } = req.user;
  const { input } = req.body;

  try {
    const result = await executeWithTimeout(
      () => agent.execute(input),
      10000,  // 10 second timeout for API
      req.params.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ 
      output: result.output, 
      cost: result.cost, 
      tokensUsed: result.tokensUsed 
    });
  } catch (error) {
    res.status(500).json({ error: 'Execution failed' });
  }
});
```

## Cost Calculation

Costs tracked per execution:

```typescript
// Example: GPT-4
// Input: 100 tokens × $0.03/1K = $0.003
// Output: 250 tokens × $0.06/1K = $0.015
// Total: $0.018

const result = {
  success: true,
  output: { ... },
  cost: 0.018,        // USD
  tokensUsed: 350,    // Input + output
  durationMs: 1234
};
```

## See Also

- `GOVERNANCE.md` — Execution standards, review process
- `__tests__/` — Execution examples
