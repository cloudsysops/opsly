# MoneyPrinterTurbo Rendering Integration

## Overview

The rendering module provides a complete integration between Opsly's content studio and MoneyPrinterTurbo, a video rendering service. It includes:

1. **Dry-run planning** (`buildVideoRenderPlan`) – Validates render requests without making API calls
2. **Queue management** (`RenderQueueManager`) – Persists render job state and handles retries
3. **API client** (`MoneyPrinterTurboRenderClient`) – HTTP interface to MoneyPrinterTurbo

## Workflow

### Step 1: Create a Dry-Run Plan

Before submitting a render job, validate it:

```typescript
import { buildVideoRenderPlan, validateRenderPlanReady } from '@intcloudsysops/content-studio';

const plan = buildVideoRenderPlan({
  tenant_slug: 'acme',
  request_id: 'req-123',
  draft_id: 'draft-001',
  preset: { /* preset config */ },
  draft: { /* draft config */ },
});

// Check if ready
if (plan.status !== 'ready') {
  console.error('Cannot render:', plan.blocking_reasons);
  // Returns early — no API call made
  return;
}

console.log('Estimated duration:', plan.estimated_duration_sec, 'seconds');
console.log('Output targets:', plan.output_targets);
```

### Step 2: Enqueue the Render Request

Add the render request to a persistent queue:

```typescript
import { RenderQueueManager, InMemoryRenderQueueStorage } from '@intcloudsysops/content-studio';

const manager = new RenderQueueManager({
  mpt_client: new MoneyPrinterTurboRenderClient({
    base_url: process.env.MPT_BASE_URL,
    api_key: process.env.MPT_API_KEY,
  }),
  storage: new InMemoryRenderQueueStorage(), // Replace with your DB storage
  max_retries: 3,
});

// Enqueue (validates dry-run plan internally)
const entry = await manager.enqueue(request);
console.log('Queued:', entry.request_id);
console.log('Status:', entry.status); // 'pending'
```

### Step 3: Submit to Renderer

Send the queued job to MoneyPrinterTurbo:

```typescript
// Submit (calls MoneyPrinterTurbo API)
const submitted = await manager.submit(request);
console.log('Manifest status:', submitted.manifest?.status);
console.log('Video URL:', submitted.manifest?.asset?.url);
```

Possible statuses:
- `queued` – Waiting to render
- `rendering` – Currently rendering
- `completed` – Finished successfully
- `failed` – Render failed (will retry)

### Step 4: Poll Status

Check render progress:

```typescript
const status = await manager.getStatus('req-123');

if (status?.status === 'completed') {
  console.log('Rendered:', status.manifest?.asset?.url);
}

if (status?.status === 'failed') {
  console.log('Error:', status.error);
  console.log('Retry count:', status.retry_count);
}
```

## Queue State Persistence

The `RenderQueueManager` uses a pluggable storage interface. Implement your own for production:

```typescript
import type { RenderQueueStorage } from '@intcloudsysops/content-studio';

class DatabaseRenderQueueStorage implements RenderQueueStorage {
  async save(entry: RenderQueueEntry): Promise<void> {
    await db.insertOne('render_queue', entry);
  }

  async load(request_id: string): Promise<RenderQueueEntry | null> {
    return db.findOne('render_queue', { request_id });
  }

  async list(tenant_slug: string, status?: string): Promise<RenderQueueEntry[]> {
    const query: any = { tenant_slug };
    if (status) query.status = status;
    return db.find('render_queue', query);
  }

  async update(request_id: string, updates: Partial<RenderQueueEntry>): Promise<void> {
    await db.updateOne('render_queue', { request_id }, { $set: updates });
  }

  async delete(request_id: string): Promise<void> {
    await db.deleteOne('render_queue', { request_id });
  }
}

const manager = new RenderQueueManager({
  mpt_client,
  storage: new DatabaseRenderQueueStorage(),
});
```

## Error Handling

The queue manager automatically retries failed renders:

```typescript
try {
  const result = await manager.submit(request);
} catch (error) {
  // Catch validation errors (e.g., invalid state, missing fields)
  console.error('Validation error:', error.message);
}

// Check retry status
const entry = await manager.getStatus('req-123');
if (entry?.status === 'failed') {
  console.log(`Attempt ${entry.retry_count}/${entry.max_retries}`);
  if (entry.retry_count >= entry.max_retries) {
    console.error('Exhausted retries:', entry.error);
  }
}
```

## List Operations

Query the render queue:

```typescript
// All pending renders for a tenant
const pending = await manager.listPending('acme');
console.log(`${pending.length} renders waiting`);

// All completed renders
const completed = await manager.listCompleted('acme');
console.log(`${completed.length} renders finished`);

// Clean up old renders
const purged = await manager.purgeCompleted('acme', 7 * 24 * 60 * 60 * 1000);
console.log(`Purged ${purged} renders older than 7 days`);
```

## Cancel a Render

Stop a pending or failed render:

```typescript
await manager.cancel('req-123');
const entry = await manager.getStatus('req-123');
console.log(entry.status); // 'cancelled'
```

## API Response Mapping

MoneyPrinterTurbo responses are normalized into `VideoRenderManifest`:

```typescript
const manifest: VideoRenderManifest = {
  provider: 'moneyprinterturbo',
  status: 'completed',
  tenant_slug: 'acme',
  request_id: 'req-123',
  draft_id: 'draft-001',
  preset_slug: 'youtube_shorts',
  submitted_at: '2026-05-31T12:00:00Z',
  completed_at: '2026-05-31T12:01:00Z',
  job_id: 'job-789',
  output_key: 'renders/acme/draft-001.mp4',
  asset: {
    url: 'https://cdn.example/render.mp4',
    thumbnail_url: 'https://cdn.example/thumb.jpg',
    subtitle_url: 'https://cdn.example/subs.srt',
    duration_sec: 45,
    aspect_ratio: '9:16',
  },
};
```

## Type Definitions

### VideoRenderPlan

```typescript
export interface VideoRenderPlan {
  tenant_slug: string;
  request_id: string;
  draft_id: string;
  preset_slug: string;
  status: 'ready' | 'blocked'; // ready = can submit, blocked = has errors
  blocking_reasons: string[]; // Why it's blocked
  estimated_duration_sec: number;
  asset_requirements: {
    aspect_ratio: string;
    target_duration_sec: number;
  };
  output_targets: string[];
  suggested_pipeline: string[];
  notes: string[];
}
```

### RenderQueueEntry

```typescript
export interface RenderQueueEntry {
  request_id: string;
  draft_id: string;
  tenant_slug: string;
  preset_slug: string;
  status: 'pending' | 'submitted' | 'processing' | 'completed' | 'failed' | 'cancelled';
  submitted_at?: string;
  started_at?: string;
  completed_at?: string;
  manifest?: VideoRenderManifest; // Only populated on success
  error?: string; // Only populated on failure
  retry_count: number;
  max_retries: number;
  metadata: Record<string, unknown>; // Includes dry-run plan
}
```

## Testing

Use the in-memory storage for testing:

```typescript
import { RenderQueueManager, InMemoryRenderQueueStorage } from '@intcloudsysops/content-studio';

it('queues and submits renders', async () => {
  const manager = new RenderQueueManager({
    mpt_client: mockClient,
    storage: new InMemoryRenderQueueStorage(),
  });

  const entry = await manager.enqueue(request);
  expect(entry.status).toBe('pending');

  const submitted = await manager.submit(request);
  expect(submitted.manifest?.status).toBe('completed');
});
```

## Exports

From `@intcloudsysops/content-studio`:

```typescript
export {
  buildVideoRenderPlan,
  validateRenderPlanReady,
  type VideoRenderPlan,
} from './rendering/video-render-plan.js';

export {
  RenderQueueManager,
  InMemoryRenderQueueStorage,
  type RenderQueueEntry,
  type RenderQueueManagerConfig,
  type RenderQueueStorage,
} from './rendering/render-queue-manager.js';

export {
  MoneyPrinterTurboRenderClient,
  buildMoneyPrinterTurboPayload,
  type MoneyPrinterTurboPayload,
  type MoneyPrinterTurboRenderClientOptions,
} from './rendering/moneyprinterturbo.js';

export {
  buildEpisodeRenderPlan,
  type EpisodeRenderPlan,
} from './rendering/episode-render-plan.js';
```
