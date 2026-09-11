# Orchestrator Event Loop Wiring

## Overview

The Event Loop Wiring system provides automatic runtime event → BullMQ job routing for the Opsly Orchestrator. When configured events occur in the system, the event loop automatically enqueues corresponding jobs to the appropriate BullMQ queues.

This enables reactive content generation, deployment coordination, and other automated workflows based on system events.

## Architecture

```
Runtime Events (Redis Pub/Sub)
    ↓
Event Bus (subscribeEvents)
    ↓
Event Loop Wiring
    ├── Event Type Matching
    ├── Payload Transformation
    └── Job Enqueueing
    ↓
BullMQ Queues
    ↓
Workers
```

## Event Types

The following events are supported by the event loop wiring:

### Tenant Events
- `tenant.onboarded` - Tenant account created and onboarded
- `tenant.suspended` - Tenant account suspended

### Job Events
- `job.completed` - Job completed successfully
- `job.failed` - Job failed after retries
- `job.enqueued` - Job enqueued to queue

### Agent Events
- `agent.task.started` - Agent task started
- `agent.task.completed` - Agent task completed
- `agent.task.failed` - Agent task failed
- `agent.status` - Agent status changed

### Validation Events
- `validation.feedback.applied` - Validation feedback applied (triggers content generation)

### Content Events (Event Loop Wiring Specific)
- `content.generation.triggered` - Content generation explicitly triggered
- `content.video.queued` - Video job enqueued
- `content.image.queued` - Image job enqueued
- `content.caption.queued` - Caption job enqueued

## Job Types

### Content Generation Jobs

The event loop wiring currently maps to these job types:

#### `content_video`
Triggers video rendering via MoneyPrinterTurbo.

**Triggered by:**
- `validation.feedback.applied` (when `generate_content=true`)
- `agent.task.completed` (when `content` in task type)
- `job.completed` (when `job_type='content_generation'`)
- `tenant.onboarded` (when plan != `startup`)

**Payload:**
```typescript
{
  tenant_slug: string;
  request_id?: string;
  draft_id?: string;
  draft?: ContentDraft;
  preset?: TenantContentPreset;
  trigger_event?: string;
  metadata?: Record<string, unknown>;
}
```

#### `content_image` (Future)
AI-powered image generation (DALL-E, Midjourney, etc).

#### `content_caption` (Future)
AI-powered caption generation.

#### `content_generation` (Future)
Orchestrates full content generation pipeline.

## Configuration

### Environment Variables

Enable event loop wiring:
```bash
OPSLY_EVENT_LOOP_WIRING_ENABLED=true
OPSLY_EVENT_LOOP_CONTENT_GENERATION_ENABLED=true
```

### Selective Enabling

Control which workers run:
```bash
OPSLY_WORKER_ALLOWLIST=content-video,notify,intent_dispatch
```

## Usage

### Basic Integration

The event loop wiring is automatically integrated into the orchestrator startup:

1. **Initialization** happens in `src/index.ts` when the control plane starts
2. **Event subscription** is set up in `runEventSubscription()`
3. **Job enqueueing** happens via `handleRuntimeEvent()`

### Publishing Events

Publish events to trigger job enqueueing:

```typescript
import { publishEvent } from '@intcloudsysops/orchestrator/public-api';

await publishEvent('job.completed', {
  job_id: 'job-123',
  job_type: 'content_generation',
  tenant_slug: 'acme-corp',
  request_id: 'req-456',
  draft_payload: { /* ContentDraft */ },
  content_preset: { /* TenantContentPreset */ },
  content_draft_prepared: true,
});
```

### Enqueueing Content Generation Jobs Directly

```typescript
import {
  enqueueContentGenerationJob,
  contentVideoQueue,
  type ContentGenerationEvent,
} from '@intcloudsysops/orchestrator/public-api';

const job: ContentGenerationEvent = {
  type: 'content_video',
  payload: {
    tenant_slug: 'acme-corp',
    draft_id: 'draft-123',
    draft: { /* ... */ },
    preset: { /* ... */ },
  },
  tenant_slug: 'acme-corp',
  initiated_by: 'system',
  request_id: 'req-456',
};

const jobId = await enqueueContentGenerationJob(contentVideoQueue, job);
```

### Subscribing to Events

Listen to events and handle them:

```typescript
import { subscribeEvents } from '@intcloudsysops/orchestrator/public-api';

const subscription = await subscribeEvents(async (event, eventData) => {
  console.log(`Event: ${event}`, eventData);

  if (event === 'content.video.queued') {
    // Handle video queued event
    const { job_id, draft_id } = eventData;
    console.log(`Video job ${job_id} queued for draft ${draft_id}`);
  }
});

// Later, close subscription
await subscription.close();
```

## Adding Custom Event → Job Mappings

Extend the event loop wiring with custom mappings:

```typescript
import {
  startEventLoopWiring,
  type EventToJobMapping,
  contentVideoQueue,
} from '@intcloudsysops/orchestrator/public-api';

const customMapping: EventToJobMapping = {
  event: 'deployment.success',
  jobType: 'content_video',
  shouldEnqueue: (data) => {
    return Boolean(data.tenant_slug && data.auto_generate_content);
  },
  transformPayload: (data) => ({
    tenant_slug: data.tenant_slug,
    trigger_event: 'deployment.success',
    draft: {
      title: `Deployment Success for ${data.tenant_slug}`,
      content_type: 'success_celebration',
    },
    preset: data.content_preset,
  }),
};

await startEventLoopWiring({
  enabled: true,
  contentVideoQueue,
  customMappings: [customMapping],
});
```

## Monitoring

### Queue Metrics

Get queue metrics to monitor event loop performance:

```typescript
import { getQueueMetrics } from '@intcloudsysops/orchestrator/public-api';

const metrics = await getQueueMetrics();
console.log(metrics);
// Output:
// [
//   { queue_name: 'openclaw', waiting: 5, active: 2, completed: 100, failed: 0, delayed: 0 },
//   { queue_name: 'content-video', waiting: 3, active: 1, completed: 50, failed: 1, delayed: 0 },
//   ...
// ]
```

### Event Logging

Events are logged to stdout as JSON lines:

```json
{
  "event": "job.enqueued",
  "timestamp": "2026-09-11T20:00:00.000Z",
  "service": "orchestrator",
  "job_type": "content_video",
  "tenant_slug": "acme-corp",
  "idempotency_key": "content_video:acme-corp:draft-123",
  "queue_name": "content-video"
}
```

## Error Handling

### Event Processing Failures

If an event fails to process:

1. Error is logged to console with full context
2. Job enqueueing is attempted for next matching event
3. Event subscription continues running

### Job Enqueueing Failures

If a job fails to enqueue:

1. Error is logged with event and job type
2. Job is retried according to BullMQ backoff strategy (exponential, 2000ms)
3. Failed jobs appear in queue's failed count

### Idempotency

Jobs are deduplicated using idempotency keys:

```
{jobType}:{tenantSlug}:{draftId or taskId}
```

This prevents duplicate jobs for the same content draft/task when events are retried.

## Best Practices

1. **Always include `tenant_slug`** - Required for multi-tenant isolation
2. **Provide `request_id`** - Enables request tracing across systems
3. **Set idempotency keys** - Prevents duplicate job enqueueing
4. **Use event metadata** - Include `source_event`, `timestamp` in metadata for debugging
5. **Configure environment variables** - Enable/disable features per environment

## Debugging

### Enable Verbose Logging

Set in event loop config:
```typescript
await startEventLoopWiring({
  enabled: true,
  contentVideoQueue,
  verbose: true,
});
```

### Check Event Job Mappings

Inspect what events trigger what jobs:

```typescript
import { getEventJobMappings } from '@intcloudsysops/orchestrator/public-api';

const mappings = getEventJobMappings();
for (const mapping of mappings) {
  console.log(`${mapping.event} → ${mapping.jobType}`);
}
```

### Monitor Queue State

```bash
# SSH into VPS
ssh -o IdentitiesOnly=yes -i ~/.ssh/tailscale_vps vps-dragon@100.120.151.91

# Check Redis queue state
redis-cli
> KEYS "bull:content-video:*"
> HGETALL "bull:content-video:123"
```

## Related Documentation

- [Orchestrator Architecture](../orchestrator-role.ts)
- [BullMQ Integration](./queue.ts)
- [Content Studio](../../lib/content-studio/README.md)
- [Event Bus](./bus.ts)
