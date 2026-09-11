import type { VideoRenderManifest, VideoRenderRequest } from '../types.js';
import { MoneyPrinterTurboRenderClient } from './moneyprinterturbo.js';
import { buildVideoRenderPlan, validateRenderPlanReady } from './video-render-plan.js';

/**
 * State of a single render job in the queue.
 */
export interface RenderQueueEntry {
  request_id: string;
  draft_id: string;
  tenant_slug: string;
  preset_slug: string;
  status: 'pending' | 'submitted' | 'processing' | 'completed' | 'failed' | 'cancelled';
  submitted_at?: string;
  started_at?: string;
  completed_at?: string;
  manifest?: VideoRenderManifest;
  error?: string;
  retry_count: number;
  max_retries: number;
  metadata: Record<string, unknown>;
}

/**
 * Configuration for the render queue manager.
 */
export interface RenderQueueManagerConfig {
  mpt_client: MoneyPrinterTurboRenderClient;
  storage?: RenderQueueStorage;
  max_retries?: number;
}

/**
 * Storage interface for persisting render queue state.
 * Implement this to store queue entries in your persistence layer (database, file system, etc.).
 */
export interface RenderQueueStorage {
  save(entry: RenderQueueEntry): Promise<void>;
  load(request_id: string): Promise<RenderQueueEntry | null>;
  list(tenant_slug: string, status?: RenderQueueEntry['status']): Promise<RenderQueueEntry[]>;
  update(request_id: string, updates: Partial<RenderQueueEntry>): Promise<void>;
  delete(request_id: string): Promise<void>;
}

/**
 * In-memory storage implementation for testing and simple deployments.
 */
export class InMemoryRenderQueueStorage implements RenderQueueStorage {
  private entries: Map<string, RenderQueueEntry> = new Map();

  async save(entry: RenderQueueEntry): Promise<void> {
    this.entries.set(entry.request_id, entry);
  }

  async load(request_id: string): Promise<RenderQueueEntry | null> {
    return this.entries.get(request_id) ?? null;
  }

  async list(tenant_slug: string, status?: RenderQueueEntry['status']): Promise<RenderQueueEntry[]> {
    const entries = Array.from(this.entries.values()).filter(
      (e) => e.tenant_slug === tenant_slug && (!status || e.status === status)
    );
    return entries;
  }

  async update(request_id: string, updates: Partial<RenderQueueEntry>): Promise<void> {
    const entry = this.entries.get(request_id);
    if (!entry) {
      throw new Error(`Entry ${request_id} not found`);
    }
    Object.assign(entry, updates);
  }

  async delete(request_id: string): Promise<void> {
    this.entries.delete(request_id);
  }
}

/**
 * Manages a queue of video render requests with state persistence and automatic retry logic.
 */
export class RenderQueueManager {
  private client: MoneyPrinterTurboRenderClient;
  private storage: RenderQueueStorage;
  private maxRetries: number;

  constructor(config: RenderQueueManagerConfig) {
    this.client = config.mpt_client;
    this.storage = config.storage ?? new InMemoryRenderQueueStorage();
    this.maxRetries = config.max_retries ?? 3;
  }

  /**
   * Submit a render request to the queue. Does a dry-run validation first.
   * Returns a queue entry in 'pending' status.
   */
  async enqueue(request: VideoRenderRequest): Promise<RenderQueueEntry> {
    // Validate with dry-run plan
    const plan = buildVideoRenderPlan(request);
    validateRenderPlanReady(plan);

    const entry: RenderQueueEntry = {
      request_id: request.request_id,
      draft_id: request.draft_id,
      tenant_slug: request.tenant_slug,
      preset_slug: request.preset.slug,
      status: 'pending',
      retry_count: 0,
      max_retries: this.maxRetries,
      metadata: {
        plan,
      },
    };

    await this.storage.save(entry);
    return entry;
  }

  /**
   * Submit a pending render request to the MoneyPrinterTurbo API.
   * Updates the queue entry status and stores the manifest on success.
   * On failure, increments retry count and optionally retries.
   */
  async submit(request: VideoRenderRequest): Promise<RenderQueueEntry> {
    const entry = await this.storage.load(request.request_id);
    if (!entry) {
      throw new Error(`No queue entry found for request ${request.request_id}`);
    }

    if (entry.status !== 'pending' && entry.status !== 'failed') {
      throw new Error(`Cannot submit entry in status "${entry.status}"`);
    }

    try {
      await this.storage.update(request.request_id, {
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });

      const manifest = await this.client.render(request);

      await this.storage.update(request.request_id, {
        status: manifest.status === 'completed' ? 'completed' : 'processing',
        manifest,
        started_at: new Date().toISOString(),
      });

      return (await this.storage.load(request.request_id))!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const retryCount = entry.retry_count + 1;
      const shouldRetry = retryCount < entry.max_retries;

      await this.storage.update(request.request_id, {
        status: shouldRetry ? 'failed' : 'failed',
        error: errorMessage,
        retry_count: retryCount,
      });

      if (shouldRetry) {
        // Could implement exponential backoff here
        console.warn(
          `[RenderQueueManager] Render failed for ${request.request_id}, attempt ${retryCount}/${entry.max_retries}: ${errorMessage}`
        );
      } else {
        console.error(
          `[RenderQueueManager] Render exhausted retries for ${request.request_id}: ${errorMessage}`
        );
      }

      return (await this.storage.load(request.request_id))!;
    }
  }

  /**
   * Poll a render request's status from the queue.
   */
  async getStatus(request_id: string): Promise<RenderQueueEntry | null> {
    return this.storage.load(request_id);
  }

  /**
   * List all pending and failed renders for a tenant.
   */
  async listPending(tenant_slug: string): Promise<RenderQueueEntry[]> {
    const pending = await this.storage.list(tenant_slug, 'pending');
    const failed = await this.storage.list(tenant_slug, 'failed');
    return [...pending, ...failed];
  }

  /**
   * List all completed renders for a tenant.
   */
  async listCompleted(tenant_slug: string): Promise<RenderQueueEntry[]> {
    return this.storage.list(tenant_slug, 'completed');
  }

  /**
   * Cancel a render request. Only works on pending or failed entries.
   */
  async cancel(request_id: string): Promise<void> {
    const entry = await this.storage.load(request_id);
    if (!entry) {
      throw new Error(`No queue entry found for request ${request_id}`);
    }

    if (entry.status !== 'pending' && entry.status !== 'failed') {
      throw new Error(`Cannot cancel entry in status "${entry.status}"`);
    }

    await this.storage.update(request_id, {
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    });
  }

  /**
   * Purge completed renders older than the specified age (in milliseconds).
   */
  async purgeCompleted(tenant_slug: string, ageMs: number): Promise<number> {
    const completed = await this.storage.list(tenant_slug, 'completed');
    const cutoff = new Date(Date.now() - ageMs);
    let purged = 0;

    for (const entry of completed) {
      if (entry.completed_at && new Date(entry.completed_at) < cutoff) {
        await this.storage.delete(entry.request_id);
        purged++;
      }
    }

    return purged;
  }
}
