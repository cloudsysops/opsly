# Orchestrator Event Loop Wiring Implementation Summary

## Overview

This implementation adds a complete Event Loop Wiring system to the Opsly Orchestrator that listens to runtime events from the Opsly Event Bus and automatically enqueues BullMQ jobs for content generation.

**Status:** ✅ Complete - All files created, imports/exports updated, types defined

## Files Created

### Core Event Loop Wiring
1. **`src/events/event-loop-wiring.ts`** (264 lines)
   - Main event loop wiring module
   - Handles runtime event → BullMQ job routing
   - Provides event-to-job mappings with transformation logic
   - Includes idempotency key generation for deduplication
   - Exports: `handleRuntimeEvent`, `enqueueContentGenerationJob`, `startEventLoopWiring`, `getEventJobMappings`

### Event System Updates
2. **`src/events/index.ts`** (22 lines)
   - Central hub for event system exports
   - Aggregates event bus, types, and wiring functions
   - Provides unified import surface for event functionality

### Public API
3. **`src/public-api.ts`** (50 lines)
   - Public API for external services
   - Exports all job types, payloads, queues, and event functions
   - Enables other apps to enqueue content generation jobs
   - Provides type safety for consumers

### Documentation
4. **`src/events/EVENT-LOOP-WIRING.md`** (400+ lines)
   - Comprehensive usage guide
   - Architecture overview with diagrams
   - Configuration examples
   - Best practices and debugging tips
   - Monitoring and error handling

### Tests
5. **`src/events/__tests__/event-loop-wiring.test.ts`** (250+ lines)
   - Unit tests for event loop wiring
   - Tests event mapping, job enqueueing, error handling
   - Demonstrates usage patterns
   - Validates idempotency key generation

## Files Modified

### Queue Configuration
**`src/queue.ts`**
- Added 4 new BullMQ queue instances:
  - `contentVideoQueue` - Video rendering jobs
  - `contentImageQueue` - Image generation jobs
  - `contentCaptionQueue` - Caption generation jobs
  - `contentGenerationQueue` - Content orchestration jobs
- All queues configured with exponential backoff (2-3s) and 2 retry attempts

### Event Types
**`src/events/types.ts`**
- Added new event types:
  - `job.enqueued` - Job enqueued to queue
  - `content.generation.triggered` - Content generation triggered
  - `content.video.queued` - Video job queued
  - `content.image.queued` - Image job queued
  - `content.caption.queued` - Caption job queued

### Orchestrator Types
**`src/types.ts`**
- Added new job types:
  - `content_video` - Video rendering (existing, enhanced)
  - `content_image` - Image generation
  - `content_caption` - Caption generation
  - `content_generation` - Pipeline orchestration
- Added payload interfaces:
  - `ContentVideoJobPayload`
  - `ContentImageJobPayload`
  - `ContentCaptionJobPayload`
  - `ContentGenerationPayload`

### Event Metrics
**`src/orchestrator-events.ts`**
- Updated imports to include all content queues
- Updated `getQueueMetrics()` to monitor content generation queues
- Enables observability of content generation job state

### Main Orchestrator
**`src/index.ts`**
- Added imports for event loop wiring functions
- Added imports for content generation queues
- Updated `runEventSubscription()` to route events to content generation:
  - `tenant.onboarded` → `content_video` jobs
  - `agent.task.completed` → `content_video` jobs
  - `job.completed` → `content_video` jobs
  - `validation.feedback.applied` → `content_video` jobs
  - Other events checked for content generation mapping
- Added content queue cleanup handlers
- Initialized event loop wiring in control plane startup
- Environment variable: `OPSLY_EVENT_LOOP_WIRING_ENABLED` (default: true)
- Environment variable: `OPSLY_EVENT_LOOP_CONTENT_GENERATION_ENABLED` (optional)

## Event-to-Job Mappings

### Implemented Mappings

| Event | Job Type | Condition | Trigger |
|-------|----------|-----------|---------|
| `tenant.onboarded` | `content_video` | plan ≠ 'startup' OR auto_generate_intro_content | Intro content generation |
| `agent.task.completed` | `content_video` | content in task_type OR auto_generate_content | Task completion content |
| `job.completed` | `content_video` | job_type='content_generation' AND draft_prepared | Content draft ready |
| `validation.feedback.applied` | `content_video` | generate_content=true | Validation feedback response |

All mappings:
- Require `tenant_slug` in event data
- Generate idempotency keys for deduplication
- Transform event data to job payload
- Include source event metadata

## Type Definitions

### Main Types

```typescript
// New Job Types
type JobType = ... | 'content_video' | 'content_image' | 'content_caption' | 'content_generation'

// New Payloads
interface ContentVideoJobPayload {
  tenant_slug: string;
  draft_id?: string;
  draft?: ContentDraft;
  preset?: TenantContentPreset;
  trigger_event?: string;
  metadata?: Record<string, unknown>;
}

// Event Loop Wiring
interface ContentGenerationEvent extends OrchestratorJob {
  type: Extract<JobType, 'content_video'>;
  payload: Record<string, unknown>;
  tenant_slug: string;
}

interface EventToJobMapping {
  event: OpslyEvent;
  jobType: JobType;
  shouldEnqueue: (eventData) => boolean;
  transformPayload: (eventData) => Record<string, unknown>;
}
```

## Configuration

### Environment Variables

```bash
# Enable event loop wiring framework
OPSLY_EVENT_LOOP_WIRING_ENABLED=true

# Enable content generation job enqueueing
OPSLY_EVENT_LOOP_CONTENT_GENERATION_ENABLED=true

# Control which workers run (includes content-video)
OPSLY_WORKER_ALLOWLIST=content-video,intent_dispatch,notify

# Prevent content-video worker from running
OPSLY_WORKER_ALLOWLIST=intent_dispatch,notify
```

## Usage Examples

### Publishing Events

```typescript
import { publishEvent } from '@intcloudsysops/orchestrator/public-api';

// Trigger content generation via job completion event
await publishEvent('job.completed', {
  job_id: 'job-123',
  job_type: 'content_generation',
  tenant_slug: 'acme-corp',
  content_draft_prepared: true,
  draft_payload: { /* ContentDraft */ },
  content_preset: { /* TenantContentPreset */ },
});
```

### Enqueueing Content Jobs Directly

```typescript
import {
  enqueueContentGenerationJob,
  contentVideoQueue,
  type ContentGenerationEvent,
} from '@intcloudsysops/orchestrator/public-api';

const job: ContentGenerationEvent = {
  type: 'content_video',
  payload: { /* ... */ },
  tenant_slug: 'acme-corp',
  initiated_by: 'system',
};

const jobId = await enqueueContentGenerationJob(contentVideoQueue, job);
```

### Adding Custom Mappings

```typescript
import {
  startEventLoopWiring,
  type EventToJobMapping,
  contentVideoQueue,
} from '@intcloudsysops/orchestrator/public-api';

const customMapping: EventToJobMapping = {
  event: 'deployment.success',
  jobType: 'content_video',
  shouldEnqueue: (data) => Boolean(data.tenant_slug && data.auto_generate),
  transformPayload: (data) => ({ /* ... */ }),
};

await startEventLoopWiring({
  enabled: true,
  contentVideoQueue,
  customMappings: [customMapping],
});
```

## Architecture

### Data Flow

```
┌──────────────────────────────────────┐
│  Runtime Events                       │
│  (Redis Pub/Sub: opsly:events)       │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  Event Bus (subscribeEvents)         │
│  - Listens on opsly:events channel   │
│  - Parses JSON event messages        │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  Event Loop Wiring                   │
│  - Matches event to job mapping      │
│  - Validates event data              │
│  - Transforms payload                │
│  - Generates idempotency key         │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  Job Enqueueing                      │
│  - Add to BullMQ queue               │
│  - Log job enqueue event             │
│  - Publish job.enqueued event        │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  BullMQ Queue                        │
│  - content-video                     │
│  - content-image                     │
│  - content-caption                   │
│  - content-generation                │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  Workers                             │
│  - ContentVideoWorker                │
│  - ContentImageWorker (future)       │
│  - ContentCaptionWorker (future)     │
│  - ContentGenerationWorker (future)  │
└──────────────────────────────────────┘
```

## Monitoring & Observability

### Queue Metrics

```typescript
import { getQueueMetrics } from '@intcloudsysops/orchestrator/public-api';

const metrics = await getQueueMetrics();
// Returns array of queue metrics with job counts
```

### Event Logging

All events logged as JSON lines to stdout:

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

## Deployment

### Prerequisites
- Redis available at `REDIS_URL`
- `OPSLY_EVENT_LOOP_WIRING_ENABLED=true` in environment
- ContentVideoWorker enabled (via `OPSLY_WORKER_ALLOWLIST`)

### Startup Flow
1. Orchestrator starts in control plane mode
2. Event loop wiring initialized with `startEventLoopWiring()`
3. Content video queue created and ready
4. Event subscription established
5. Workers start processing jobs

### Graceful Shutdown
- All content queues closed
- Event subscription terminated
- Workers finish in-flight jobs

## Testing

### Run Tests
```bash
npm run test --workspace=@intcloudsysops/orchestrator -- src/events/__tests__/event-loop-wiring.test.ts
```

### Test Coverage
- Event mapping and routing
- Payload transformation
- Idempotency key generation
- Error handling
- Tenant slug validation
- Metadata preservation

## Future Enhancements

1. **Content Image Generation** - Add image generation job type
2. **Content Caption Generation** - Add caption generation job type  
3. **Pipeline Orchestration** - Coordinate multi-step content generation
4. **Event Filtering** - Add tenant-level configuration for which events trigger jobs
5. **Rate Limiting** - Prevent job explosion for high-volume events
6. **Batch Processing** - Group related content jobs
7. **Analytics** - Track content generation metrics per tenant
8. **Custom Transformers** - Allow per-tenant event payload transformation

## Related Documentation

- [Event Loop Wiring Guide](./src/events/EVENT-LOOP-WIRING.md)
- [Orchestrator Architecture](./README.md)
- [Content Studio Integration](../lib/content-studio/README.md)
- [BullMQ Queue Configuration](./src/queue.ts)
- [Event Bus System](./src/events/bus.ts)

## Summary of Changes

| Component | Change | Lines |
|-----------|--------|-------|
| New Module | event-loop-wiring.ts | 264 |
| New Module | events/index.ts | 22 |
| New Module | public-api.ts | 50 |
| New Docs | EVENT-LOOP-WIRING.md | 400+ |
| New Tests | event-loop-wiring.test.ts | 250+ |
| Modified | queue.ts | +50 (4 queues) |
| Modified | events/types.ts | +5 (event types) |
| Modified | types.ts | +60 (payloads) |
| Modified | orchestrator-events.ts | +10 (metrics) |
| Modified | index.ts | +50 (init + handlers) |
| **Total** | **New Code** | **~1100 lines** |

## Validation Checklist

✅ Event-to-job mappings defined and tested  
✅ BullMQ queues created and configured  
✅ Type definitions added for all new jobs  
✅ Event loop wiring integrated into main orchestrator  
✅ Idempotency keys implemented for deduplication  
✅ Error handling for event processing  
✅ Queue metrics updated for observability  
✅ Documentation with examples  
✅ Unit tests with good coverage  
✅ Public API exports for consumers  
✅ Backward compatible with existing code  
✅ Environment variable configuration  
✅ Graceful shutdown implemented  

## Author

Generated by Claude Haiku 4.5 on 2026-09-11

**Attribution:**
```
Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LcHHKew7MR1y8DjfuSYgdb
```
