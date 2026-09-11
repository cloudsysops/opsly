/**
 * Example: Orchestrator worker that uses RenderQueueManager to process video renders.
 *
 * This demonstrates how to integrate the rendering queue into an actual
 * application context (e.g., OAR task handler, orchestrator agent).
 *
 * Not executable as-is; adapt to your runtime.
 */

import { RenderQueueManager, InMemoryRenderQueueStorage } from './render-queue-manager.js';
import { MoneyPrinterTurboRenderClient } from './moneyprinterturbo.js';
import type { VideoRenderRequest } from '../types.js';

/**
 * Initialize the render manager (e.g., in app startup).
 * Replace storage with your database implementation.
 */
export function initializeRenderManager(): RenderQueueManager {
  const client = new MoneyPrinterTurboRenderClient({
    base_url: process.env.MONEY_PRINTER_TURBO_URL || 'http://localhost:8080',
    api_key: process.env.MONEY_PRINTER_TURBO_API_KEY,
    timeout_ms: 60_000,
  });

  return new RenderQueueManager({
    mpt_client: client,
    storage: new InMemoryRenderQueueStorage(), // ⚠️ Replace with your DB
    max_retries: 3,
  });
}

/**
 * OAR task handler: Dry-run render planning (no side effects).
 *
 * Usage in task definition:
 * ```
 * const plan = await planVideoRender({ ... });
 * if (plan.status === 'blocked') {
 *   return { error: plan.blocking_reasons };
 * }
 * ```
 */
export async function planVideoRender(manager: RenderQueueManager, request: VideoRenderRequest) {
  const { buildVideoRenderPlan, validateRenderPlanReady } = await import(
    './video-render-plan.js'
  );

  const plan = buildVideoRenderPlan(request);

  return {
    request_id: request.request_id,
    draft_id: request.draft_id,
    plan: {
      status: plan.status,
      ready: plan.status === 'ready',
      blocking_reasons: plan.blocking_reasons,
      estimated_duration_sec: plan.estimated_duration_sec,
      suggested_pipeline: plan.suggested_pipeline,
    },
  };
}

/**
 * OAR task handler: Enqueue a render job.
 *
 * This creates a queue entry but doesn't submit to the renderer yet.
 * Useful for batch operations or rate limiting.
 *
 * Usage:
 * ```
 * const entry = await enqueueRender(manager, request);
 * console.log('Queued:', entry.request_id, entry.status);
 * ```
 */
export async function enqueueRender(
  manager: RenderQueueManager,
  request: VideoRenderRequest
) {
  try {
    const entry = await manager.enqueue(request);
    return {
      ok: true,
      request_id: entry.request_id,
      status: entry.status,
      queued_at: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * OAR task handler: Submit a queued render to MoneyPrinterTurbo.
 *
 * This calls the actual rendering API. Can be retried on failure.
 *
 * Usage:
 * ```
 * const result = await submitRender(manager, request);
 * if (result.ok) {
 *   console.log('Rendering:', result.manifest.job_id);
 * }
 * ```
 */
export async function submitRender(
  manager: RenderQueueManager,
  request: VideoRenderRequest
) {
  try {
    const entry = await manager.submit(request);
    return {
      ok: true,
      request_id: entry.request_id,
      status: entry.status,
      manifest: entry.manifest,
      retry_count: entry.retry_count,
      submitted_at: entry.submitted_at,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * OAR task handler: Poll render status.
 *
 * Check if a render is complete, still processing, or failed.
 *
 * Usage:
 * ```
 * const status = await pollRenderStatus(manager, 'req-123');
 * if (status?.manifest?.status === 'completed') {
 *   console.log('Video ready:', status.manifest.asset.url);
 * }
 * ```
 */
export async function pollRenderStatus(manager: RenderQueueManager, request_id: string) {
  const entry = await manager.getStatus(request_id);
  if (!entry) {
    return null;
  }

  return {
    request_id: entry.request_id,
    draft_id: entry.draft_id,
    status: entry.status,
    manifest: entry.manifest,
    error: entry.error,
    retry_count: entry.retry_count,
    max_retries: entry.max_retries,
    submitted_at: entry.submitted_at,
    completed_at: entry.completed_at,
  };
}

/**
 * OAR task handler: List all pending renders for a tenant.
 *
 * Useful for dashboards, monitoring, or batch operations.
 *
 * Usage:
 * ```
 * const pending = await listPendingRenders(manager, 'acme');
 * console.log(`${pending.length} renders in queue`);
 * ```
 */
export async function listPendingRenders(manager: RenderQueueManager, tenant_slug: string) {
  const pending = await manager.listPending(tenant_slug);
  return pending.map((entry) => ({
    request_id: entry.request_id,
    draft_id: entry.draft_id,
    status: entry.status,
    retry_count: entry.retry_count,
    submitted_at: entry.submitted_at,
    error: entry.error,
  }));
}

/**
 * OAR task handler: Cancel a render.
 *
 * Only works on pending or failed renders.
 *
 * Usage:
 * ```
 * await cancelRender(manager, 'req-123');
 * ```
 */
export async function cancelRender(manager: RenderQueueManager, request_id: string) {
  try {
    await manager.cancel(request_id);
    return { ok: true, request_id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Background job: Retry failed renders (e.g., run every 5 minutes).
 *
 * Usage (in a Temporal workflow or cron job):
 * ```
 * const manager = initializeRenderManager();
 * await retryFailedRenders(manager, 'acme');
 * ```
 */
export async function retryFailedRenders(
  manager: RenderQueueManager,
  tenant_slug: string
): Promise<{ retried: number; exhausted: number }> {
  const pending = await manager.listPending(tenant_slug);
  const failed = pending.filter((e) => e.status === 'failed');

  let retried = 0;
  let exhausted = 0;

  for (const entry of failed) {
    if (entry.retry_count >= entry.max_retries) {
      console.warn(`[RenderWorker] ${entry.request_id} exhausted ${entry.max_retries} retries`);
      exhausted++;
      continue;
    }

    // Reconstruct request for retry (simplified; use your DB to load full request)
    console.log(`[RenderWorker] Retrying ${entry.request_id} (attempt ${entry.retry_count + 1})`);
    retried++;
  }

  return { retried, exhausted };
}

/**
 * Background job: Clean up old completed renders (e.g., weekly).
 *
 * Usage:
 * ```
 * const purged = await cleanupOldRenders(manager, 'acme');
 * ```
 */
export async function cleanupOldRenders(
  manager: RenderQueueManager,
  tenant_slug: string,
  ageMs: number = 30 * 24 * 60 * 60 * 1000 // 30 days
): Promise<{ purged: number }> {
  const purged = await manager.purgeCompleted(tenant_slug, ageMs);
  console.log(`[RenderWorker] Purged ${purged} renders older than ${ageMs}ms`);
  return { purged };
}
