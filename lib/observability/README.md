---
title: "@intcloudsysops/observability"
description: "Unified logging, metrics, and tracing layer"
---
# @intcloudsysops/observability

Unified logging, metrics, and tracing layer for all Opsly services. Provides consistent observability across orchestrator, API, gateway, and agents.

## Features

- 📝 **Structured Logging** — JSON format, correlation IDs, context fields
- 📊 **Metrics** — Counter, gauge, histogram with Prometheus export
- 🔗 **Distributed Tracing** — Correlation IDs, span tracking, OpenTelemetry
- 🎯 **Performance** — Low overhead, batched exports
- 🔐 **Privacy** — Automatic PII filtering, compliance-ready

## Usage

### Logging

```typescript
import { createLogger } from '@intcloudsysops/observability';

const logger = createLogger('my-service');

logger.info('Agent started', {
  agentId: 'agent-123',
  userId: 'user-456',
});

logger.error('Processing failed', error, {
  context: 'processing',
});
```

### Metrics

```typescript
import { initMetrics, recordMetric } from '@intcloudsysops/observability';

initMetrics([
  { name: 'agent_executions', type: 'counter', help: 'Total agent executions' },
  { name: 'execution_latency_ms', type: 'histogram', help: 'Execution latency' },
]);

recordMetric('agent_executions', 1, { agentId: 'agent-123' });
recordMetric('execution_latency_ms', 250, { agentId: 'agent-123' });
```

### Tracing

```typescript
import { createTracer } from '@intcloudsysops/observability';

const tracer = createTracer();
const span = tracer.startSpan('process-request');

span.setAttribute('userId', 'user-123');
span.addEvent('processing-started');

// ... do work ...

span.end('success');
```

## Integration by Service

### Orchestrator

```typescript
import { createLogger } from '@intcloudsysops/observability';

const logger = createLogger('orchestrator');
logger.info('Agent queue processing', { queueSize: 100 });
```

### API

```typescript
// Add middleware to instrument HTTP requests
app.use((req, res, next) => {
  const tracer = createTracer();
  const span = tracer.startSpan('http-request');
  
  span.setAttribute('method', req.method);
  span.setAttribute('path', req.path);
  
  res.on('finish', () => {
    span.setAttribute('status', res.statusCode);
    span.end();
  });
  
  next();
});
```

### Gateway

```typescript
// Record LLM provider latency
recordMetric('llm_latency_ms', latency, { provider: 'openai' });
recordMetric('llm_tokens', inputTokens + outputTokens, { provider: 'openai' });
```

## Queries & Dashboards

### Prometheus

```promql
# Agent execution rate
rate(agent_executions[5m])

# Execution latency p95
histogram_quantile(0.95, execution_latency_ms)

# Error rate
rate(agent_errors[5m])
```

## See Also

- `GOVERNANCE.md` — Observability standards, alerting policy
- `__tests__/` — Integration tests, examples

---

## Enlaces relacionados

- [[lib/observability/README|observability]]
- [[README|Inicio]]
