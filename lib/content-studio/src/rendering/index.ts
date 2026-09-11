/**
 * Rendering module: MoneyPrinterTurbo integration with dry-run planning and queue management.
 *
 * Provides:
 * - buildVideoRenderPlan: Dry-run validation of render requests without API calls
 * - RenderQueueManager: State management for video render jobs with retry logic
 * - MoneyPrinterTurboRenderClient: HTTP client for MoneyPrinterTurbo API
 *
 * Example workflow:
 * ```ts
 * const manager = new RenderQueueManager({
 *   mpt_client: new MoneyPrinterTurboRenderClient({ base_url: '...' }),
 * });
 *
 * // 1. Dry-run plan (no API call)
 * const plan = buildVideoRenderPlan(request);
 * if (plan.status !== 'ready') {
 *   console.log('Cannot render:', plan.blocking_reasons);
 *   return;
 * }
 *
 * // 2. Enqueue for rendering
 * const entry = await manager.enqueue(request);
 * console.log('Queued:', entry.request_id, entry.status);
 *
 * // 3. Submit to renderer
 * const submitted = await manager.submit(request);
 * console.log('Submitted:', submitted.manifest?.status);
 *
 * // 4. Poll status
 * const status = await manager.getStatus(request.request_id);
 * console.log('Status:', status?.status);
 * ```
 */

export { buildVideoRenderPlan, validateRenderPlanReady, type VideoRenderPlan } from './video-render-plan.js';
export {
  RenderQueueManager,
  InMemoryRenderQueueStorage,
  type RenderQueueEntry,
  type RenderQueueManagerConfig,
  type RenderQueueStorage,
} from './render-queue-manager.js';
export {
  MoneyPrinterTurboRenderClient,
  buildMoneyPrinterTurboPayload,
  type MoneyPrinterTurboPayload,
  type MoneyPrinterTurboRenderClientOptions,
} from './moneyprinterturbo.js';
export { buildEpisodeRenderPlan, type EpisodeRenderPlan } from './episode-render-plan.js';
