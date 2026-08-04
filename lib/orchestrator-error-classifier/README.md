# Orchestrator Error Classifier

Error classification and repair strategy for Opsly orchestrator agent execution.

## Purpose

The Error Classifier categorizes failures from agent workers and determines the appropriate recovery strategy:

- **`auto_retry`** — Automatically retry (BullMQ handles)
- **`operator_review`** — Requires human intervention
- **`fail_fast`** — Do not retry, fail immediately
- **`exponential_backoff`** — Retry with exponential backoff

## Usage

### Basic Classification

```typescript
import { classifyError } from '@intcloudsysops/orchestrator-error-classifier';

const error = new Error('Insufficient credits');
const context = { tenant_slug: 'acme-corp', job_type: 'cursor' };

const classified = classifyError(error, context);
console.log(classified.category); // 'credits_exhausted'
console.log(classified.strategy); // 'operator_review'
console.log(classified.isRecoverable); // true
```

### Using the Classifier Instance

```typescript
import { ErrorClassifier } from '@intcloudsysops/orchestrator-error-classifier';

const classifier = new ErrorClassifier({
  enableRepairQueue: true,
  maxRepairAttempts: 3,
});

const result = classifier.classify(error, { tenant_slug: 'test' });
const repairStrategy = classifier.getRepairStrategy(result);

if (repairStrategy.shouldRepair) {
  // Enqueue job in repair queue
  await enqueueRepair(job, result);
}
```

### Adding Custom Rules

```typescript
classifier.addRule({
  id: 'custom-error',
  name: 'Custom Error Pattern',
  pattern: /my.*custom.*pattern/i,
  category: 'provider_error',
  strategy: 'exponential_backoff',
  priority: 'high',
  isRecoverable: true,
  suggestedAction: 'Custom recovery action',
  tags: ['custom'],
});
```

## Error Categories

| Category | Strategy | Recoverable | Example |
|----------|----------|-------------|---------|
| `credits_exhausted` | `operator_review` | Yes | "Insufficient credits" |
| `rate_limit` | `exponential_backoff` | Yes | "429 Too Many Requests" |
| `timeout` | `auto_retry` | Yes | "Operation timed out" |
| `config_error` | `operator_review` | Yes | "Invalid API key" |
| `provider_error` | `exponential_backoff` | Yes | "Service unavailable 503" |
| `irrecuperable` | `fail_fast` | No | "Type error in code" |
| `unknown` | `auto_retry` | Yes | Unmatched errors |

## Default Rules

The classifier ships with 15+ default classification rules covering:

- **Billing**: Insufficient credits (Anthropic, Stripe)
- **Rate Limiting**: API rate limits (Anthropic, Redis)
- **Timeouts**: Job and network timeouts
- **Configuration**: Credentials, missing fields, webhooks
- **Providers**: Anthropic, N8N, Google Drive
- **Irrecuperable**: Assertions, type errors, parse errors

See `src/rules/default-rules.ts` for complete list.

## Integration with Orchestrator

### In Workers

```typescript
import { EnhancedWorkerBase } from '@intcloudsysops/orchestrator/workers';
import { classifyError } from '@intcloudsysops/orchestrator-error-classifier';

class MyWorker extends EnhancedWorkerBase {
  async handler(job: Job<OrchestratorJob>) {
    try {
      // Do work
    } catch (error) {
      const classified = classifyError(error, {
        tenant_slug: job.data.tenant_slug,
        job_type: job.data.type,
        worker: 'my-worker',
      });

      const strategy = this.getRepairStrategy(classified);

      if (strategy.shouldRepair) {
        await this.enqueueRepair(job, classified);
      } else {
        throw error;
      }
    }
  }
}
```

### In Repair Queue Handler

```typescript
class RepairWorker extends EnhancedWorkerBase {
  async handler(job: Job<OrchestratorJob>) {
    const repair = job.data.repairMetadata;

    switch (repair.category) {
      case 'credits_exhausted':
        // Notify operator, wait for manual approval
        await notifyOperator(repair);
        break;

      case 'config_error':
        // Try to auto-fix common config issues
        await autoFixConfig(repair);
        break;

      default:
        // Escalate for manual review
        await escalateToOperator(repair);
    }
  }
}
```

## Testing

```bash
npm run test --workspace=@intcloudsysops/orchestrator-error-classifier
```

## Configuration

```typescript
const classifier = new ErrorClassifier({
  enableRepairQueue: true,              // Enable repair queue
  maxRepairAttempts: 3,                 // Max repair cycles
  repairQueueName: 'openclaw-repair',   // Queue name
  defaultStrategy: 'auto_retry',        // Default for unknown errors
  customRules: [/* ... */],             // Additional rules
});
```

## Observability

```typescript
const stats = classifier.getStats();
console.log(stats);
// {
//   totalRules: 20,
//   byCategory: {
//     credits_exhausted: 2,
//     rate_limit: 3,
//     timeout: 2,
//     config_error: 3,
//     provider_error: 5,
//     irrecuperable: 3,
//     unknown: 2
//   },
//   byStrategy: {
//     auto_retry: 5,
//     operator_review: 5,
//     fail_fast: 5,
//     exponential_backoff: 5
//   }
// }
```

## Related

- `docs/00-architecture/AGENT-EXECUTION-IMPROVEMENTS.md` — Implementation roadmap
- `docs/orchestrator/REPAIR-QUEUE.md` — Repair queue design
- `docs/00-architecture/ORCHESTRATOR.md` — Orchestrator architecture
