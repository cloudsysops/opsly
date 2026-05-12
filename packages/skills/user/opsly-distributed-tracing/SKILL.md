# Opsly Distributed Tracing

> **Triggers:** `enable tracing`, `distributed tracing`, `opentelemetry`, `observability setup`, `trace requests`, `correlation ids`
> **Priority:** CRITICAL
> **Category:** infrastructure / observability
> **Skills relacionados:** `opsly-observability`, `opsly-telemetry`, `opsly-architect-senior`

## Propósito

Implementar distributed tracing (OpenTelemetry) across all 18+ microservices para:

- **Request correlation** — track single user request across orchestrator → API → LLM Gateway → database
- **Latency debugging** — identify bottlenecks (is delay in DB? LLM? network?)
- **Service dependencies** — visualize service graph (which services call which)
- **Cost attribution** — tie LLM token cost to original user request
- **Compliance tracing** — audit trail for data access, model outputs per tenant

## Cuándo usar

- Debugging why a request took 5s when expected was <1s
- Analyzing cost per customer/feature (need request-level cost tracking)
- Implementing SLA monitoring (p50, p99 latencies per endpoint)
- Compliance audit (which service accessed which tenant data)
- Post-incident analysis (replay trace to understand failure sequence)

## Flujo

### 1. Setup OpenTelemetry SDK (SDK Layer)

Instalar en root `package.json`:

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/sdk-trace-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

**Root instrumentation** (`apps/*/src/index.ts` o `apps/*/src/tracing.ts`):

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
});

sdk.start();
```

**Import FIRST in app entry point** (before other imports).

### 2. Correlation ID Propagation

Add middleware to extract/inject W3C Trace Context header:

```typescript
import { trace, context } from '@opentelemetry/api';

export function correlationIdMiddleware(req, res, next) {
  const traceParent = req.headers['traceparent'];

  let spanContext = null;
  if (traceParent) {
    // Parse W3C traceparent: traceparent = "00-traceId-spanId-01"
    const [version, traceId, parentSpanId, traceFlags] = traceParent.split('-');
    spanContext = {
      traceId,
      spanId: parentSpanId,
      isRemote: true,
      traceFlags: parseInt(traceFlags, 16),
    };
  }

  // Create new span context, inherit trace if exists
  const tracer = trace.getTracer('opsly');
  const span = tracer.startSpan('http-request', {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.client_ip': req.ip,
    },
  });

  context.with(trace.setSpan(context.active(), span), () => {
    res.setHeader('traceparent', getTraceParentHeader(span));
    next();
  });
}
```

### 3. Per-Service Instrumentation

**Orchestrator** (`apps/orchestrator/src/tracing.ts`):

```typescript
// Instrument:
// - Task queue enqueue/dequeue
// - Agent execution (per agent type)
// - Workflow step transitions
// - Context lookups

export function createOrchestratorTracing() {
  const tracer = trace.getTracer('orchestrator');

  return {
    traceTaskExecution: (taskId, agentType) => {
      return tracer.startSpan(`task-execution`, {
        attributes: {
          'task.id': taskId,
          'agent.type': agentType,
        },
      });
    },

    traceWorkflowStep: (workflowId, stepName) => {
      return tracer.startSpan(`workflow-step`, {
        attributes: {
          'workflow.id': workflowId,
          'step.name': stepName,
        },
      });
    },
  };
}
```

**API** (`apps/api/src/tracing.ts`):

```typescript
// Instrument:
// - Request entry point (endpoint, tenant)
// - Database queries (query, duration, error)
// - Service-to-service calls (recipient service, latency)

export function createApiTracing() {
  const tracer = trace.getTracer('api');

  return {
    traceEndpoint: (method, path) => {
      return tracer.startSpan(`http-${method.toLowerCase()}`, {
        attributes: {
          'http.method': method,
          'http.target': path,
        },
      });
    },

    traceDbQuery: (sql, duration, tenant_id) => {
      return tracer.startSpan(`db-query`, {
        attributes: {
          'db.system': 'postgres',
          'db.statement': sql,
          'duration.ms': duration,
          'tenant.id': tenant_id,
        },
      });
    },
  };
}
```

**LLM Gateway** (`apps/llm-gateway/src/tracing.ts`):

```typescript
// Instrument:
// - Model inference (model, tokens in/out, duration, cost)
// - Provider calls (which provider, latency, cache hit)
// - Token counting/rate limiting

export function createGatewayTracing() {
  const tracer = trace.getTracer('llm-gateway');

  return {
    traceInference: (model, inputTokens, outputTokens, durationMs) => {
      return tracer.startSpan(`inference`, {
        attributes: {
          'llm.model': model,
          'llm.input_tokens': inputTokens,
          'llm.output_tokens': outputTokens,
          'duration.ms': durationMs,
          'cost.usd': calculateCost(model, inputTokens, outputTokens),
        },
      });
    },
  };
}
```

**Local Services** (`apps/local-services/src/tracing.ts`):

```typescript
// Instrument:
// - Booking operations
// - Payment processing
// - Notification sends

export function createLocalServicesTracing() {
  const tracer = trace.getTracer('local-services');

  return {
    traceBooking: (bookingId, step) => {
      return tracer.startSpan(`booking-${step}`, {
        attributes: {
          'booking.id': bookingId,
          step: step,
        },
      });
    },
  };
}
```

### 4. Trace Backend Setup

**Option A: Jaeger (local development)**

```bash
docker run -d \
  --name jaeger \
  -p 4317:4317 \
  -p 16686:16686 \
  jaegertracing/all-in-one
```

Access UI: http://localhost:16686

**Option B: Grafana Tempo (production)**

```yaml
# docker-compose.yml
services:
  tempo:
    image: grafana/tempo:latest
    ports:
      - '4317:4317' # OTLP gRPC receiver
    environment:
      - TEMPO_S3_BUCKET=opsly-traces
      - TEMPO_S3_ENDPOINT=s3.amazonaws.com
```

**Option C: Datadog/New Relic (SaaS)**

```typescript
// .env
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.datadoghq.com/v1/traces
DD_API_KEY=xxx
```

### 5. Key Metrics to Trace

**Request-level:**

- `trace_id` — unique ID for entire request journey
- `span_id` — individual operation ID
- `parent_span_id` — caller span
- `tenant_id` — which tenant owns this request
- `user_id` — which user triggered request
- `duration_ms` — how long operation took
- `status` — success/error

**Service-level:**

- `service_name` — orchestrator, api, llm-gateway, etc.
- `operation_name` — task-execution, inference, db-query, etc.
- `http.method`, `http.target` — for APIs
- `db.system`, `db.statement` — for databases
- `llm.model`, `llm.tokens_in`, `llm.tokens_out` — for LLM calls

**Business-level:**

- `feature_name` — which feature triggered this trace
- `cost.usd` — how much did this request cost
- `error.type` — what went wrong (validation, timeout, provider_error)

### 6. Integration Points

**Observability Module Integration:**

```typescript
// lib/observability/index.ts exports
import { startTracing } from './tracing.js';
import { getTracer } from './tracer.js';

export { startTracing, getTracer };
```

**Telemetry Module Integration:**

```typescript
// lib/telemetry/cost-tracker.ts ties cost to trace_id
export function trackCostWithTrace(trace_id: string, cost: number, model: string) {
  // Record in metrics: cost_usd{trace_id, model} = cost
  // Query: "total cost per feature" by aggregating all traces with feature=X
}
```

**Evaluation Module Integration:**

```typescript
// lib/evaluation/validators.ts
export function validateOutputQuality(traceId: string, output: string) {
  // Access trace_id to correlate with input prompt, model, latency
  // Store evaluation score with trace_id for future analysis
}
```

### 7. Trace Visualization Examples

**Timeline view (single request):**

```
Request ID: 123e4567-e89b-12d3-a456-426614174000

User Request
├─ API GET /customers/5 [t=0ms, d=150ms]
│  ├─ Auth validation [t=2ms, d=15ms]
│  ├─ DB query: SELECT * FROM customers [t=18ms, d=45ms]
│  │  └─ Supabase query [t=18ms, d=42ms]
│  ├─ Format response [t=65ms, d=10ms]
│  └─ (15 other spans)
├─ Orchestrator task-queue check [t=20ms, d=8ms]
└─ Response sent [t=151ms]
```

**Service dependency graph:**

```
User Request
  ↓
API (internal)
  ├→ LLM Gateway (http call)
  │   └→ Anthropic API (external)
  ├→ Database (SQL)
  │   └→ Supabase (managed)
  ├→ Orchestrator (message queue)
  │   └→ Redis (BullMQ backend)
  └→ Local Services (async webhook)
```

**Cost attribution (per request):**

```
Request ID: abc123
Total Cost: $0.024
├─ LLM tokens (claude-opus): $0.020
│  ├─ Input tokens (1500): $0.0075
│  └─ Output tokens (400): $0.0125
├─ Database queries: $0.0015
│  └─ Supabase (3 queries, avg 8ms)
└─ Compute (0.15s of t4.large): $0.00002
```

## Implementación

### Requisitos

- OpenTelemetry SDK + instrumentation libraries
- Trace backend (Jaeger for dev, Tempo/Datadog for prod)
- W3C Trace Context propagation in all HTTP headers
- Multi-tenant trace isolation (never mix tenant traces)

### Scripts

- `scripts/setup-otel.ts` — Initialize SDK in each service
- `scripts/instrument-service.ts` — Add tracer to any service
- `scripts/trace-exporter.ts` — Configure trace backend (Jaeger/Tempo/Datadog)
- `scripts/validate-traces.ts` — Verify traces are flowing correctly

### Test cases

1. **Single service trace:** Make HTTP request to API, verify trace appears in UI with correct span hierarchy
2. **Multi-service trace:** Trigger request that calls LLM Gateway, verify correlation ID flows through both services
3. **Tenant isolation:** Two requests from different tenants don't share traces
4. **Cost attribution:** Trace cost matches invoice amount (within 5% margin)
5. **Performance baseline:** Tracing overhead <5% (measure with/without OTEL)

## Ejemplos de uso

```
claude: "Why did the customer's report take 30 seconds?"
→ User provides request ID
→ Fetch trace from Jaeger/Tempo
→ Show timeline: 25s in LLM inference, 2s in DB, 3s in formatting
→ Recommendation: "Consider using Claude Haiku instead of Opus for this task" (10x faster, 50% cost savings)

ops: "How much did we spend on feature X last month?"
→ Query all traces with feature_name=X
→ Sum cost field across all traces
→ Result: "Feature X cost $2,450.50, used 42M tokens, served 1,200 requests"

security: "Audit which services accessed tenant Y's data"
→ Query traces with tenant_id=Y
→ Show all spans that touched customer data (db.statement contains SELECT)
→ Generate compliance report
```

## Integración

- **Admin Dashboard** — Display trace ID in error logs, link to Jaeger/Tempo UI
- **Cost Forecaster** — Use trace cost_usd to validate forecast accuracy
- **Performance Alerts** — Alert when p99 latency > SLA
- **Evaluation Framework** — Correlate trace spans (input, model, latency) with output quality
- **Compliance Auditing** — Trace audit trail for data access, model decisions

## Métricas de éxito

- **Tracing coverage** — 95%+ of requests have valid traces
- **Trace latency** — End-to-end request trace complete within 500ms of request end
- **Tenant isolation** — 0 cross-tenant trace leaks (security)
- **Debugging speed** — 5-min identification of performance issues (vs. 30+ min without traces)
- **Cost accuracy** — Trace cost matches Stripe invoice within 2% margin
- **Team adoption** — 80%+ of engineers use Jaeger UI for debugging within first month
