# MoneyPrinterTurbo Rendering API Reference

Complete API documentation for the video rendering integration.

## Module Export

```typescript
import {
  // Dry-run planning
  buildVideoRenderPlan,
  validateRenderPlanReady,
  type VideoRenderPlan,

  // Queue management
  RenderQueueManager,
  InMemoryRenderQueueStorage,
  type RenderQueueEntry,
  type RenderQueueManagerConfig,
  type RenderQueueStorage,

  // API client
  MoneyPrinterTurboRenderClient,
  buildMoneyPrinterTurboPayload,
  type MoneyPrinterTurboPayload,
  type MoneyPrinterTurboRenderClientOptions,

  // Episode planning
  buildEpisodeRenderPlan,
  type EpisodeRenderPlan,
} from '@intcloudsysops/content-studio';
```

## Video Render Plan

### `buildVideoRenderPlan(request: VideoRenderRequest): VideoRenderPlan`

Build a dry-run render plan without making API calls.

**Parameters:**
- `request: VideoRenderRequest` — The render request with draft and preset

**Returns:**
- `VideoRenderPlan` — Plan with validation results

**Throws:**
- Never (always returns a plan, even if blocked)

**Example:**
```typescript
const request: VideoRenderRequest = {
  tenant_slug: 'acme',
  request_id: 'req-123',
  draft_id: 'draft-001',
  preset: { /* preset config */ },
  draft: { /* draft config */ },
};

const plan = buildVideoRenderPlan(request);
console.log(plan.status); // 'ready' or 'blocked'
console.log(plan.blocking_reasons); // Array of errors if blocked
console.log(plan.estimated_duration_sec); // Duration from reel_script
```

### `validateRenderPlanReady(plan: VideoRenderPlan): void`

Throw if plan is not ready to render.

**Parameters:**
- `plan: VideoRenderPlan` — The plan to validate

**Throws:**
- `Error` if plan.status !== 'ready'

**Example:**
```typescript
const plan = buildVideoRenderPlan(request);
try {
  validateRenderPlanReady(plan);
  // Plan is ready to proceed
} catch (error) {
  console.error('Cannot render:', error.message);
}
```

### `interface VideoRenderPlan`

```typescript
interface VideoRenderPlan {
  tenant_slug: string;          // From request
  request_id: string;           // From request
  draft_id: string;             // From request
  preset_slug: string;          // From preset.slug
  status: 'ready' | 'blocked';  // Readiness status
  blocking_reasons: string[];   // Validation errors if blocked
  estimated_duration_sec: number; // Calculated from reel_script
  asset_requirements: {
    aspect_ratio: string;       // From preset
    target_duration_sec: number; // From preset
  };
  output_targets: string[];     // Suggested output paths
  suggested_pipeline: string[]; // Recommended steps
  notes: string[];              // Additional info
}
```

## Render Queue Manager

### `new RenderQueueManager(config: RenderQueueManagerConfig)`

Create a render queue manager.

**Parameters:**
```typescript
interface RenderQueueManagerConfig {
  mpt_client: MoneyPrinterTurboRenderClient;
  storage?: RenderQueueStorage; // Default: InMemoryRenderQueueStorage
  max_retries?: number;         // Default: 3
}
```

**Example:**
```typescript
const manager = new RenderQueueManager({
  mpt_client: new MoneyPrinterTurboRenderClient({
    base_url: 'https://api.moneyprinter.example',
    api_key: process.env.MPT_API_KEY,
  }),
  storage: new MyDatabaseStorage(), // Implement this
  max_retries: 3,
});
```

### `manager.enqueue(request: VideoRenderRequest): Promise<RenderQueueEntry>`

Add a render request to the queue.

**Parameters:**
- `request: VideoRenderRequest` — The render request

**Returns:**
- `Promise<RenderQueueEntry>` — Queue entry with status='pending'

**Throws:**
- `Error` if request fails dry-run validation

**Example:**
```typescript
const entry = await manager.enqueue(request);
console.log(entry.request_id);    // req-123
console.log(entry.status);        // 'pending'
console.log(entry.metadata.plan); // Dry-run plan
```

### `manager.submit(request: VideoRenderRequest): Promise<RenderQueueEntry>`

Submit a queued request to MoneyPrinterTurbo.

**Parameters:**
- `request: VideoRenderRequest` — The render request (must be enqueued first)

**Returns:**
- `Promise<RenderQueueEntry>` — Updated entry with manifest or error

**Throws:**
- `Error` if entry not found or already submitted/completed

**Example:**
```typescript
const submitted = await manager.submit(request);
console.log(submitted.status);           // 'processing' or 'completed'
console.log(submitted.manifest?.status); // 'queued', 'rendering', etc.
```

### `manager.getStatus(request_id: string): Promise<RenderQueueEntry | null>`

Poll a render job's status.

**Parameters:**
- `request_id: string` — The request ID to query

**Returns:**
- `Promise<RenderQueueEntry | null>` — Current entry, or null if not found

**Example:**
```typescript
const entry = await manager.getStatus('req-123');
if (!entry) {
  console.log('Not found');
  return;
}

switch (entry.status) {
  case 'pending':
    console.log('Waiting to submit');
    break;
  case 'processing':
    console.log('Rendering...');
    break;
  case 'completed':
    console.log('Video URL:', entry.manifest?.asset?.url);
    break;
  case 'failed':
    console.log('Error:', entry.error);
    console.log(`Retry ${entry.retry_count}/${entry.max_retries}`);
    break;
}
```

### `manager.listPending(tenant_slug: string): Promise<RenderQueueEntry[]>`

Get all pending and failed renders for a tenant.

**Parameters:**
- `tenant_slug: string` — The tenant to query

**Returns:**
- `Promise<RenderQueueEntry[]>` — Array of pending/failed entries

**Example:**
```typescript
const pending = await manager.listPending('acme');
console.log(`${pending.length} renders in queue`);
pending.forEach(entry => {
  console.log(`${entry.request_id}: ${entry.status}`);
});
```

### `manager.listCompleted(tenant_slug: string): Promise<RenderQueueEntry[]>`

Get all completed renders for a tenant.

**Parameters:**
- `tenant_slug: string` — The tenant to query

**Returns:**
- `Promise<RenderQueueEntry[]>` — Array of completed entries

**Example:**
```typescript
const completed = await manager.listCompleted('acme');
console.log(`${completed.length} renders finished`);
```

### `manager.cancel(request_id: string): Promise<void>`

Cancel a pending or failed render.

**Parameters:**
- `request_id: string` — The request ID to cancel

**Throws:**
- `Error` if entry not found or not cancellable (already submitted/processing)

**Example:**
```typescript
try {
  await manager.cancel('req-123');
  console.log('Cancelled');
} catch (error) {
  console.error('Cannot cancel:', error.message);
}
```

### `manager.purgeCompleted(tenant_slug: string, ageMs: number): Promise<number>`

Remove completed renders older than a given age.

**Parameters:**
- `tenant_slug: string` — The tenant whose data to purge
- `ageMs: number` — Age threshold in milliseconds

**Returns:**
- `Promise<number>` — Number of purged entries

**Example:**
```typescript
// Remove renders older than 30 days
const purged = await manager.purgeCompleted('acme', 30 * 24 * 60 * 60 * 1000);
console.log(`Purged ${purged} old renders`);
```

### `interface RenderQueueEntry`

```typescript
interface RenderQueueEntry {
  request_id: string;           // Unique render request ID
  draft_id: string;             // Content draft ID
  tenant_slug: string;          // Tenant identifier
  preset_slug: string;          // Render preset
  status: 'pending' | 'submitted' | 'processing' | 'completed' | 'failed' | 'cancelled';
  submitted_at?: string;        // When submitted to MPT (ISO8601)
  started_at?: string;          // When MPT started rendering (ISO8601)
  completed_at?: string;        // When finished (ISO8601)
  manifest?: VideoRenderManifest; // Response from MPT
  error?: string;               // Error message if failed
  retry_count: number;          // Number of retry attempts
  max_retries: number;          // Max allowed retries
  metadata: Record<string, unknown>; // Includes dry-run plan
}
```

## Render Queue Storage

### `interface RenderQueueStorage`

Implement this to persist queue state.

```typescript
interface RenderQueueStorage {
  save(entry: RenderQueueEntry): Promise<void>;
  load(request_id: string): Promise<RenderQueueEntry | null>;
  list(tenant_slug: string, status?: string): Promise<RenderQueueEntry[]>;
  update(request_id: string, updates: Partial<RenderQueueEntry>): Promise<void>;
  delete(request_id: string): Promise<void>;
}
```

**Methods:**

#### `save(entry: RenderQueueEntry): Promise<void>`
Persist a new queue entry.

#### `load(request_id: string): Promise<RenderQueueEntry | null>`
Retrieve a queue entry by ID.

#### `list(tenant_slug: string, status?: string): Promise<RenderQueueEntry[]>`
Query entries by tenant and optional status filter.

#### `update(request_id: string, updates: Partial<RenderQueueEntry>): Promise<void>`
Update specific fields of an entry.

#### `delete(request_id: string): Promise<void>`
Remove an entry.

### `class InMemoryRenderQueueStorage implements RenderQueueStorage`

In-memory storage for testing and simple deployments.

**Example:**
```typescript
const storage = new InMemoryRenderQueueStorage();
const manager = new RenderQueueManager({
  mpt_client,
  storage,
});

// All data lost on restart
```

**Implementing a Custom Storage:**

```typescript
import { PostgresClient } from 'postgres';

class PostgresRenderQueueStorage implements RenderQueueStorage {
  constructor(private db: PostgresClient) {}

  async save(entry: RenderQueueEntry): Promise<void> {
    await this.db.query(
      'INSERT INTO render_queue (request_id, ...) VALUES ($1, ...)',
      [entry.request_id, /* ... */]
    );
  }

  async load(request_id: string): Promise<RenderQueueEntry | null> {
    const result = await this.db.query(
      'SELECT * FROM render_queue WHERE request_id = $1',
      [request_id]
    );
    return result.rows[0] ?? null;
  }

  async list(tenant_slug: string, status?: string): Promise<RenderQueueEntry[]> {
    const query = status
      ? 'SELECT * FROM render_queue WHERE tenant_slug = $1 AND status = $2'
      : 'SELECT * FROM render_queue WHERE tenant_slug = $1';
    const params = status ? [tenant_slug, status] : [tenant_slug];
    const result = await this.db.query(query, params);
    return result.rows;
  }

  async update(request_id: string, updates: Partial<RenderQueueEntry>): Promise<void> {
    // Build dynamic UPDATE query
    const fields = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = [request_id, ...Object.values(updates)];
    await this.db.query(
      `UPDATE render_queue SET ${fields} WHERE request_id = $1`,
      values
    );
  }

  async delete(request_id: string): Promise<void> {
    await this.db.query('DELETE FROM render_queue WHERE request_id = $1', [request_id]);
  }
}

// Usage
const db = new PostgresClient({ /* config */ });
const storage = new PostgresRenderQueueStorage(db);
const manager = new RenderQueueManager({ mpt_client, storage });
```

## MoneyPrinterTurbo Client

See `MoneyPrinterTurboRenderClient` in the main API docs.

## Related Types

### `VideoRenderRequest`
```typescript
interface VideoRenderRequest {
  tenant_slug: string;
  request_id: string;
  draft_id: string;
  preset: TenantContentPreset;
  draft: ContentDraft;
}
```

### `VideoRenderManifest`
```typescript
interface VideoRenderManifest {
  provider: 'moneyprinterturbo';
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  tenant_slug: string;
  request_id: string;
  draft_id: string;
  preset_slug: string;
  submitted_at: string;
  completed_at?: string;
  job_id?: string;
  output_key?: string;
  asset?: VideoRenderAsset;
  error?: string;
}
```

### `VideoRenderAsset`
```typescript
interface VideoRenderAsset {
  url: string;
  thumbnail_url?: string;
  subtitle_url?: string;
  duration_sec?: number;
  aspect_ratio?: '9:16' | '1:1' | '16:9';
}
```

## Error Handling

### Common Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| "Draft is not renderable in state..." | Draft not approved | Approve draft first |
| "tenant_slug is required" | Missing tenant identifier | Include tenant_slug in request |
| "No queue entry found for request..." | Request never enqueued | Call enqueue() first |
| "Cannot submit entry in status..." | Already submitted | Check status with getStatus() |
| "MoneyPrinterTurbo render timed out" | API response too slow | Increase timeout_ms or retry |
| "Cannot cancel entry in status..." | Already processing/completed | Cancel only pending/failed |

### Retry Behavior

- Failed renders retry automatically (up to max_retries)
- Each retry increments retry_count
- No delay between retries (can be added in storage adapter)
- After max_retries exhausted, entry stays in 'failed' status

---

**API version:** 1.0.0  
**Last updated:** 2026-09-11
